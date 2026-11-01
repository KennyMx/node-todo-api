const { listTodos, findTodo, createTodo, deleteTodo } = require("./store");
const { authenticate } = require("./auth");

// handle todo requests
async function handleTodos(req, res, send, readBody) {
  // get path without query parameters
  const url = new URL(req.url, "http://localhost");
  const path = url.pathname;

  // get todo id from the path with regex
  const match = path.match(/^\/todos\/(\d+)$/);
  const id = match ? Number(match[1]) : null;

  // GET /todos -> return all todos
  if (path === "/todos" && req.method === "GET") {
    const title = url.searchParams.get("title");
    const category = url.searchParams.get("category");
    const completed = url.searchParams.get("completed");

    // check completed filter is true or false
    if (completed !== null && completed !== "true" && completed !== "false") {
      return send(res, 400, { error: "Completed filter must be true or false" });
    }

    let results = listTodos();

    // search title without matching case
    if (title !== null) {
      results = results.filter(todo =>
        todo.title.toLowerCase().includes(title.trim().toLowerCase())
      );
    }

    // match category without matching case
    if (category !== null) {
      results = results.filter(todo =>
        todo.category.toLowerCase() === category.trim().toLowerCase()
      );
    }

    // filter by completion status
    if (completed !== null) {
      results = results.filter(todo => todo.completed === (completed === "true"));
    }

    return send(res, 200, results);
  }

  // require login to create update or delete todos
  const isWrite =
    (path === "/todos" && req.method === "POST") ||
    (match && ["PATCH", "DELETE"].includes(req.method));
  const user = isWrite ? authenticate(req) : null;

  if (isWrite && !user) {
    return send(res, 401, { error: "Login required" });
  }

  // POST /todos -> create a new todo
  if (path === "/todos" && req.method === "POST") {
    const body = await readBody(req);

    // require a title containing non-space chars
    if (typeof body.title !== "string" || !body.title.trim()) {
      return send(res, 400, { error: "Title is required" });
    }

    // check category if provided
    if (
      body.category !== undefined &&
      (typeof body.category !== "string" || !body.category.trim())
    ) {
      return send(res, 400, { error: "Category must be nonempty" });
    }

    const category = body.category === undefined ? "general" : body.category.trim();

    // assign an id to the new todo
    const newTodo = createTodo(body.title.trim(), user.id, category);

    // store the todo and return HTTP 201
    return send(res, 201, newTodo);
  }

  // GET /todos/:id -> return one todo
  if (match && req.method === "GET") {
    const todo = findTodo(id);

    // check if todo exists
    if (!todo) {
      return send(res, 404, { error: "Todo not found" });
    }

    return send(res, 200, todo);
  }

  // PATCH /todos/:id -> update a todo
  if (match && req.method === "PATCH") {
    const todo = findTodo(id);

    // check if todo exists
    if (!todo) {
      return send(res, 404, { error: "Todo not found" });
    }

    // only the owner can update this todo
    if (todo.ownerId !== user.id) {
      return send(res, 403, { error: "Only the owner can change this todo" });
    }

    const body = await readBody(req);

    // require at least one field to update
    if (
      body.title === undefined &&
      body.category === undefined &&
      body.completed === undefined
    ) {
      return send(res, 400, { error: "Provide title category or completed" });
    }

    // check category if provided
    if (
      body.category !== undefined &&
      (typeof body.category !== "string" || !body.category.trim())
    ) {
      return send(res, 400, { error: "Category must be nonempty" });
    }

    // check title if provided
    if (
      body.title !== undefined &&
      (typeof body.title !== "string" || !body.title.trim())
    ) {
      return send(res, 400, { error: "Title must be nonempty" });
    }

    // completed must be a boolean
    if (
      body.completed !== undefined &&
      typeof body.completed !== "boolean"
    ) {
      return send(res, 400, { error: "Completed must be a boolean" });
    }

    // apply changes after validation
    if (body.title !== undefined) {
      todo.title = body.title.trim();
    }

    if (body.category !== undefined) {
      todo.category = body.category.trim();
    }

    if (body.completed !== undefined) {
      todo.completed = body.completed;
    }

    return send(res, 200, todo);
  }

  // DELETE /todos/:id -> remove a todo
  if (match && req.method === "DELETE") {
    const todo = findTodo(id);

    // check if todo exists
    if (!todo) {
      return send(res, 404, { error: "Todo not found" });
    }

    // only the owner can delete this todo
    if (todo.ownerId !== user.id) {
      return send(res, 403, { error: "Only the owner can change this todo" });
    }

    deleteTodo(id);

    // return success with no body
    res.writeHead(204);
    return res.end();
  }

  // reject unsupported methods
  if (
    path === "/todos" ||
    (match && findTodo(id))
  ) {
    return send(res, 405, { error: "Method not allowed" });
  }
  // reject unknown paths
  return send(res, 404, { error: "Not found" });
}

module.exports = { handleTodos };
