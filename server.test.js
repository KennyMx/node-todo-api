const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const server = require("./server");
const { authenticate } = require("./auth");

let base;
let alice;
let bob;

// send a request and read the response
async function request(method, path, body, token) {
  const headers = {};

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(base + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  return {
    status: response.status,
    body: response.status === 204 ? await response.text() : await response.json()
  };
}

// create a todo for a test
async function createTodo(token, body = { title: "test todo" }) {
  const result = await request("POST", "/todos", body, token);
  assert.equal(result.status, 201);
  return result.body;
}

// use an available port so tests do not need port 3000
before(async () => {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  base = `http://127.0.0.1:${server.address().port}`;

  const first = await request("POST", "/login", {
    username: "alice", password: "alice-password"
  });
  const second = await request("POST", "/login", {
    username: "bob", password: "bob-password"
  });

  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  alice = first.body.token;
  bob = second.body.token;
});

// stop the test server when finished
after(async () => {
  await new Promise((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve());
  });
});

test("login returns a token without password details", async () => {
  const result = await request("POST", "/login", {
    username: "alice", password: "alice-password"
  });

  assert.equal(result.status, 200);
  assert.match(result.body.token, /^[a-f0-9]{64}$/);
  assert.notEqual(result.body.token, alice);
  assert.deepEqual(result.body.user, { id: 1, username: "alice" });
  assert.deepEqual(Object.keys(result.body).sort(), ["token", "user"]);

  assert.equal((await request("POST", "/login", {})).status, 400);
  assert.equal((await request("POST", "/login", {
    username: "alice", password: "wrong"
  })).status, 401);
});

test("anyone can read todos and ownership comes from login", async () => {
  const todo = await createTodo(alice, { title: "public todo", ownerId: 2 });
  assert.equal(todo.ownerId, 1);
  assert.equal(todo.category, "general");
  assert.equal(todo.completed, false);

  const single = await request("GET", `/todos/${todo.id}`);
  assert.equal(single.status, 200);
  assert.deepEqual(single.body, todo);

  const list = await request("GET", "/todos");
  assert.equal(list.status, 200);
  assert.ok(list.body.some(item => item.id === todo.id));
});

test("writes require a valid token", async () => {
  const todo = await createTodo(alice);

  for (const token of [undefined, "invalid"]) {
    assert.equal((await request("POST", "/todos", { title: "test" }, token)).status, 401);
    assert.equal((await request("PATCH", `/todos/${todo.id}`, { completed: true }, token)).status, 401);
    assert.equal((await request("DELETE", `/todos/${todo.id}`, undefined, token)).status, 401);
  }
});

test("only the owner can update or delete a todo", async () => {
  const first = await createTodo(alice);
  const second = await createTodo(bob);

  for (const [todo, other] of [[first, bob], [second, alice]]) {
    assert.equal((await request("PATCH", `/todos/${todo.id}`, {
      title: "changed", ownerId: todo.ownerId
    }, other)).status, 403);
    assert.equal((await request("DELETE", `/todos/${todo.id}`, undefined, other)).status, 403);
    assert.deepEqual((await request("GET", `/todos/${todo.id}`)).body, todo);
  }
});

test("the owner can update fields without transferring ownership", async () => {
  const todo = await createTodo(alice);
  const updated = await request("PATCH", `/todos/${todo.id}`, {
    title: " updated todo ", category: " home ", completed: true, ownerId: 2
  }, alice);

  assert.equal(updated.status, 200);
  assert.deepEqual(updated.body, {
    id: todo.id, title: "updated todo", category: "home", completed: true, ownerId: 1
  });
  assert.deepEqual((await request("GET", `/todos/${todo.id}`)).body, updated.body);
});

test("invalid fields do not partially update a todo", async () => {
  const todo = await createTodo(alice);

  for (const category of ["", "   ", null, 3, false]) {
    assert.equal((await request("POST", "/todos", { title: "test", category }, alice)).status, 400);
  }

  assert.equal((await request("POST", "/todos", { title: " " }, alice)).status, 400);

  for (const body of [{}, { ownerId: 2 }, { title: "" },
    { title: "changed", category: null }, { category: "home", completed: "yes" }]) {
    assert.equal((await request("PATCH", `/todos/${todo.id}`, body, alice)).status, 400);
    assert.deepEqual((await request("GET", `/todos/${todo.id}`)).body, todo);
  }
});

test("malformed json and non object bodies are rejected", async () => {
  const response = await fetch(base + "/todos", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${alice}` },
    body: "{"
  });

  assert.equal(response.status, 400);
  assert.equal((await response.json()).error, "Invalid request body");

  for (const body of [null, [], "text"]) {
    assert.equal((await request("POST", "/todos", body, alice)).status, 400);
  }
});

test("filters work separately and together across owners", async () => {
  const first = await createTodo(alice, { title: "filter milk", category: "shopping" });
  const second = await createTodo(bob, { title: "filter milk report", category: "work" });
  await request("PATCH", `/todos/${second.id}`, { completed: true }, bob);

  const searches = [
    ["title=FILTER%20MILK", [first.id, second.id]],
    ["category=SHOPPING", [first.id]],
    ["category=shop", []],
    ["title=filter&completed=true", [second.id]],
    ["title=filter&completed=false", [first.id]],
    ["title=filter&category=shopping&completed=false", [first.id]],
    ["title=filter&category=shopping&completed=true", []]
  ];

  for (const [query, ids] of searches) {
    const result = await request("GET", "/todos?" + query);
    assert.equal(result.status, 200);
    assert.deepEqual(result.body.map(todo => todo.id), ids);
  }

  assert.equal((await request("GET", "/todos?completed=invalid")).status, 400);
});

test("missing resources and unsupported methods return errors", async () => {
  assert.equal((await request("GET", "/missing")).status, 404);
  assert.equal((await request("GET", "/todos/999999")).status, 404);
  assert.equal((await request("PATCH", "/todos/999999", { completed: true }, alice)).status, 404);
  assert.equal((await request("DELETE", "/todos/999999", undefined, alice)).status, 404);
  assert.equal((await request("PUT", "/todos", {})).status, 405);
  assert.equal((await request("GET", "/login")).status, 405);
});

test("the owner can delete a todo", async () => {
  const todo = await createTodo(bob);
  const deleted = await request("DELETE", `/todos/${todo.id}`, undefined, bob);

  assert.equal(deleted.status, 204);
  assert.equal(deleted.body, "");
  assert.equal((await request("GET", `/todos/${todo.id}`)).status, 404);
  assert.equal((await request("DELETE", `/todos/${todo.id}`, undefined, bob)).status, 404);
});

test("expired tokens cannot be used again", async () => {
  const result = await request("POST", "/login", {
    username: "alice", password: "alice-password"
  });
  const token = result.body.token;
  const now = Date.now;

  // move the clock forward without waiting an hour
  try {
    Date.now = () => now() + 60 * 60 * 1000 + 1;
    assert.equal(authenticate({ headers: { authorization: `Bearer ${token}` } }), null);
  } finally {
    Date.now = now;
  }

  assert.equal((await request("POST", "/todos", { title: "expired" }, token)).status, 401);
});
