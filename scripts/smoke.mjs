// Boots the compiled API with a throwaway in-memory database and checks that
// the real bootstrap wiring (prefix, Helmet, env validation) answers requests.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/test_fund';
process.env.JWT_SECRET = 'smoke-only-secret-at-least-32-characters';
process.env.ADMIN_EMAIL = 'admin@example.org';
process.env.ADMIN_PASSWORD = 'a-strong-smoke-password';
process.env.CORS_ORIGINS = 'http://localhost:5173';
process.env.CAMPAIGN_SLUG = 'zahira-college-land-fund';
process.env.USE_MEMORY_DB = 'true';
process.env.DB_SYNCHRONIZE = 'false';
process.env.THROTTLE_LIMIT = '100';
process.env.THROTTLE_TTL_MS = '60000';
process.env.PORT = '3100';

await import('../apps/api/dist/main.js');

const deadline = Date.now() + 10_000;
let response;
while (!response && Date.now() < deadline) {
  try {
    response = await fetch('http://127.0.0.1:3100/api/health');
  } catch {
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}

if (!response) {
  console.error('API did not start in time.');
  process.exit(1);
}

const body = await response.text();
console.log(`GET /api/health -> ${response.status} ${body}`);
console.log(
  `x-content-type-options: ${response.headers.get('x-content-type-options')}`,
);
process.exit(response.ok && body.includes('"ok"') ? 0 : 1);
