// use nodes built-in HTTP module
const http = require("node:http");

// send an http status and json response
function send(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json"
  });

  res.end(JSON.stringify(data));
}

// handle incoming api request
const server = http.createServer(async (req, res) => {
  return send(res, 404, { error: "Not found" });
});

// start the server on port 3000
server.listen(3000, () => {
  console.log("Todo API running at http://localhost:3000");
});
