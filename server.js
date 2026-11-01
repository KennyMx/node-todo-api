// use nodes built-in HTTP module
const http = require("node:http");

const { handleTodos } = require("./todos");
const { login } = require("./auth");

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
    const path = new URL(req.url, "http://localhost").pathname;

    // POST /login -> check credentials and return a token
    if (path === "/login") {
      if (req.method !== "POST") {
        return send(res, 405, { error: "Method not allowed" });
      }

      const body = await readBody(req);

      // require username and password
      if (
        typeof body.username !== "string" ||
        !body.username.trim() ||
        typeof body.password !== "string" ||
        !body.password
      ) {
        return send(res, 400, {
          error: "Username and password are required"
        });
      }

      const result = login(body.username, body.password);

      // reject incorrect credentials
      if (!result) {
        return send(res, 401, { error: "Invalid credentials" });
      }

      return send(res, 200, result);
    }

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
