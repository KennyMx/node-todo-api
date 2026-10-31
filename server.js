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
