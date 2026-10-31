// use nodes built-in HTTP module
const http = require("node:http");

// use array to store todos in memory and incrementing ids
const todos = [];
let nextId = 1;

// send an http status and json response
function send(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json"
  });

  res.end(JSON.stringify(data));
}

// read request body
async function readBody(req) {
  let text = "";

  for await (const chunk of req) {
    text += chunk;
  }

  const body = JSON.parse(text);

  // only accept json objects
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    throw new Error("Request body must be an object");
  }
  return body;
}

// handle incoming API requests
const server = http.createServer(async (req, res) => {
  // get path without query parameters
  const path = new URL(req.url, "http://localhost").pathname;
  
  // get todo id from the path with regex
  const match = path.match(/^\/todos\/(\d+)$/);
  const id = match ? Number(match[1]) : null;

  try {
    // GET /todos -> return all todos
    if (path === "/todos" && req.method === "GET") {
      return send(res, 200, todos);
    }

    // POST /todos -> create a new todo
    if (path === "/todos" && req.method === "POST") {
      const body = await readBody(req);

      // require a title containing non-space chars
      if (typeof body.title !== "string" || !body.title.trim()) {
        return send(res, 400, { error: "Title is required" });
      }

      // assign an id to the new todo
      const newTodo = {
        id: nextId++,
        title: body.title.trim(),
        completed: false // by default
      };

      // store the todo and return HTTP 201
      todos.push(newTodo);
      return send(res, 201, newTodo);
    }

    // GET /todos/:id -> return one todo
    if (match && req.method === "GET") {
      const todo = todos.find(item => item.id === id);

      // check if todo exists
      if (!todo) {
        return send(res, 404, { error: "Todo not found" });
      }

      return send(res, 200, todo);
    }

    // PATCH /todos/:id -> update a todo
    if (match && req.method === "PATCH") {
      const todo = todos.find(item => item.id === id);

      // check if todo exists
      if (!todo) {
        return send(res, 404, { error: "Todo not found" });
      }

      const body = await readBody(req);

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

      if (body.completed !== undefined) {
        todo.completed = body.completed;
      }

      return send(res, 200, todo);
    }

    // DELETE /todos/:id -> remove a todo
    if (match && req.method === "DELETE") {
      const index = todos.findIndex(item => item.id === id);

      // check if todo exists
      if (index === -1) {
        return send(res, 404, { error: "Todo not found" });
      }

      todos.splice(index, 1);

      // return success with no body
      res.writeHead(204);
      return res.end();
    }

    // reject unsupported methods
    if (
      path === "/todos" ||
      (match && todos.some(item => item.id === id))
    ) {
      return send(res, 405, { error: "Method not allowed" });
    }
    // reject unknown paths
    return send(res, 404, { error: "Not found" });

  } catch {
    // reject invalid req body
    return send(res, 400, { error: "Invalid request body" });
  }
});

// start the server on port 3000
server.listen(3000, () => {
  console.log("Todo API running at http://localhost:3000");
});
