const { listTodos, findTodo, createTodo, deleteTodo } = require("./store");

// handle todo requests
async function handleTodos(req, res, send, readBody) {
  // get path without query parameters
  const path = new URL(req.url, "http://localhost").pathname;

  // get todo id from the path with regex
  const match = path.match(/^\/todos\/(\d+)$/);
  const id = match ? Number(match[1]) : null;

  // GET /todos -> return all todos
  if (path === "/todos" && req.method === "GET") {
    return send(res, 200, listTodos());
  }

  // POST /todos -> create a new todo
  if (path === "/todos" && req.method === "POST") {
    const body = await readBody(req);

    // require a title containing non-space chars
    if (typeof body.title !== "string" || !body.title.trim()) {
      return send(res, 400, { error: "Title is required" });
    }

    // assign an id to the new todo
    const newTodo = createTodo(body.title.trim());

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
    // check if todo exists
    if (!deleteTodo(id)) {
      return send(res, 404, { error: "Todo not found" });
    }

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
