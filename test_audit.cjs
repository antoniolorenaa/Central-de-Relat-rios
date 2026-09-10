const http = require('http');

function request(path, method, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    }, res => {
      let chunks = '';
      res.on('data', c => chunks += c);
      res.on('end', () => resolve({ status: res.statusCode, data: chunks ? JSON.parse(chunks) : null }));
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function run() {
  console.log("Checking server health...");
  try {
    const res = await request('/', 'GET');
    console.log("Server responds with:", res.status);
  } catch (e) {
    console.log("Server not running?", e.message);
  }
}
run();
