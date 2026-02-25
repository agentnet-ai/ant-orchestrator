#!/usr/bin/env node
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'backend', '.env') });
const { execSync } = require('child_process');

const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_PORT = process.env.DB_PORT || 3306;
const DB_USER = process.env.DB_USER || 'ant';
const DB_PASS = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'ant_orchestrator';

if (!DB_NAME.includes('orchestrator')) {
  console.error(`ABORT: DB_NAME="${DB_NAME}" does not look like an orchestrator database.`);
  process.exit(1);
}

const sqlFile = path.join(__dirname, 'reset-dev.sql');
const cmd = `mysql -h ${DB_HOST} -P ${DB_PORT} -u ${DB_USER} -p${DB_PASS} ${DB_NAME} < "${sqlFile}"`;

console.log(`[reset:dev] Resetting ${DB_NAME} on ${DB_HOST}:${DB_PORT} ...`);

try {
  execSync(cmd, { stdio: 'inherit' });
} catch (err) {
  console.error('[reset:dev] SQL execution failed:', err.message);
  process.exit(1);
}

// Verification queries
const verify = [
  "SELECT 'Conversations' AS tbl, COUNT(*) AS cnt FROM Conversations",
  "SELECT 'Messages' AS tbl, COUNT(*) AS cnt FROM Messages",
].join('; ');

console.log('\n[reset:dev] Verification:');
try {
  execSync(
    `mysql -h ${DB_HOST} -P ${DB_PORT} -u ${DB_USER} -p${DB_PASS} ${DB_NAME} -e "${verify}"`,
    { stdio: 'inherit' },
  );
} catch { /* non-fatal */ }

console.log('\n[reset:dev] ant-orchestrator reset complete.');
