// Quick API test
fetch('http://localhost:4000/api/ideas/counts', {
    headers: { 'x-user-id': '1' },
})
    .then((res) => res.json())
    .then((data) => console.log('✅ Ideas counts:', data))
    .catch((err) => console.error('❌ Error:', err));

fetch('http://localhost:4000/requests', {
    headers: { 'x-user-id': '1' },
})
    .then((res) => res.json())
    .then((data) => console.log('✅ Requests:', data.length, 'items'))
    .catch((err) => console.error('❌ Error:', err));
