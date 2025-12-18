const url = 'http://localhost:4000/';

async function run() {
  const query = `mutation { createHistory(transactionId:123, userId:"user1", amount:1000, method:"card", status:SUCCESS) { id transactionId userId amount method status createdAt } }`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}

run().catch(err => { console.error(err); process.exit(1); });
