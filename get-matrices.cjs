async function main() {
  const res = await fetch('http://localhost:3000/api/admin/matrices', {
    headers: { 'Authorization': 'Bearer 1' }
  });
  const data = await res.json();
  console.log(data);
}
main().catch(console.error);
