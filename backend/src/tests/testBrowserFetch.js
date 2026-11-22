const http = require('http');

function fetchUrl(path) {
  return new Promise((resolve) => {
    http.get(`http://localhost:3000${path}`, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ path, status: res.statusCode, body: body.substring(0, 500) }));
    }).on('error', err => resolve({ path, error: err.message }));
  });
}

async function run() {
  const r1 = await fetchUrl('/');
  const r2 = await fetchUrl('/src/main.jsx');
  const r3 = await fetchUrl('/src/App.jsx');
  console.log('INDEX:', r1.status, r1.body.substring(0, 100));
  console.log('MAIN:', r2.status, r2.body.substring(0, 200));
  console.log('APP:', r3.status, r3.body.substring(0, 200));
}

run();
