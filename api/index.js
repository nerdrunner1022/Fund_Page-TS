'use strict';

// TypeORM loads the Postgres driver dynamically. Make it explicit so Vercel's
// file tracer includes `pg` and its dependencies in the function bundle.
require('pg');

// Vercel entrypoint. The Nest app is built to apps/api/dist by the root
// vercel.json build command, then reused across warm function invocations.
let appPromise;

async function getApp() {
  if (!appPromise) {
    appPromise = require('../apps/api/dist/serverless.js').getServerlessApp();
  }
  return appPromise;
}

async function handler(request, response) {
  const app = await getApp();
  const expressApp = app.getHttpAdapter().getInstance();
  return expressApp(request, response);
}

module.exports = handler;
module.exports.default = handler;
