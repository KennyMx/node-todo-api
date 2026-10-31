// use nodes built-in HTTP module
const http = require("node:http");

const { handleTodos } = require("./todos");

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
  try {
    await handleTodos(req, res, send, readBody);
  } catch {
    // reject invalid req body
    return send(res, 400, { error: "Invalid request body" });
  }
});

// start the server on port 3000
server.listen(3000, () => {
  console.log("Todo API running at http://localhost:3000");
});
