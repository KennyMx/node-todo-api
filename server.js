// use nodes built-in HTTP module
const http = require("node:http");

// handle incoming api request
const server = http.createServer(async (req, res) => {
  res.end("Hello");
});

// start the server on port 3000
server.listen(3000, () => {
  console.log("Todo API running at http://localhost:3000");
});
