const http = require('http');
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'docs', 'email-preview.html');
const port = 3030;

const server = http.createServer((req, res) => {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Error loading preview');
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(data);
  });
});

server.listen(port, () => {
  console.log(`Email Preview Web Server is running at http://localhost:${port}`);
});
