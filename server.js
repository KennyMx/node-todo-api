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

// handle incoming api request
const server = http.createServer(async (req, res) => {

    // get path without query parameters
  const path = new URL(req.url, "http://localhost").pathname;

  // GET /todos -> return all todos
  if (path === "/todos" && req.method === "GET") {
    return send(res, 200, todos);
  }

  return send(res, 404, { error: "Not found" });
  
});

// start the server on port 3000
server.listen(3000, () => {
  console.log("Todo API running at http://localhost:3000");
});
