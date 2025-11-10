#!/usr/bin/env node
// Quick admin endpoints sanity check
import 'dotenv/config';

const API = process.env.API_URL || 'http://localhost:4000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@bsj.gov.jm';

async function post(path, body, headers = {}) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body || {}),
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { ok: res.ok, status: res.status, data };
}

async function get(path, headers = {}) {
  const res = await fetch(`${API}${path}`, { headers });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { ok: res.ok, status: res.status, data };
}

async function main() {
  console.log(`\n=== Admin Test @ ${API} ===`);
  console.log('1) Resolve admin userId via /auth/test-login');
  const login = await post('/auth/test-login', { email: ADMIN_EMAIL.toLowerCase().trim() });
  console.log('   -> status:', login.status);
  if (!login.ok) {
    console.error('   ❌ Could not fetch admin user via /auth/test-login. Response:', login.data);
    console.error('      Hint: Ensure seed created admin user and server is running.');
    process.exit(1);
  }
  const admin = login.data?.user;
  if (!admin) {
    console.error('   ❌ No user in response:', login.data);
    process.exit(1);
  }
  console.log(`   ✓ Admin: ${admin.email} (id=${admin.id}) roles=${(admin.roles||[]).join(',')}`);
  const hdr = { 'x-user-id': String(admin.id) };

  console.log('\n2) GET /admin/users');
  const users = await get('/admin/users', hdr);
  console.log('   -> status:', users.status, 'count:', Array.isArray(users.data) ? users.data.length : 'n/a');
  if (!users.ok) console.error('   Body:', users.data);

  console.log('\n3) POST /admin/departments');
  const deptCode = `QA${Math.random().toString(36).slice(2,5).toUpperCase()}`;
  const createDept = await post('/admin/departments', { name: `QA Dept ${Date.now()}`, code: deptCode }, hdr);
  console.log('   -> status:', createDept.status, 'id:', createDept.data?.id, 'code:', createDept.data?.code);
  if (!createDept.ok) console.error('   Body:', createDept.data);

  console.log('\n4) GET /admin/audit-log (last 7 days)');
  const end = new Date();
  const start = new Date(Date.now() - 7*24*60*60*1000);
  const audit = await get(`/admin/audit-log?startDate=${encodeURIComponent(start.toISOString())}&endDate=${encodeURIComponent(end.toISOString())}`, hdr);
  console.log('   -> status:', audit.status, 'items:', Array.isArray(audit.data) ? audit.data.length : 'n/a');
  if (!audit.ok) console.error('   Body:', audit.data);

  console.log('\n✓ Admin endpoints probe complete');
}

main().catch((e) => {
  console.error('Unexpected error:', e);
  process.exit(1);
});
