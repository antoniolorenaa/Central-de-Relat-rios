const fetch = require('node-fetch'); // wait, fetch is built-in in node 20
async function main() {
  const res = await fetch('http://localhost:3000/api/admin/matrices', {
    headers: { 'Authorization': 'Bearer test-admin' } // assuming there is a backdoor?
  });
  const data = await res.json();
  console.log(data);
}
main().catch(console.error);
