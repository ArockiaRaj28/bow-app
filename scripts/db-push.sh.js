// Push updated Prisma schema to Neon + regenerate client inside the running container.
// Usage: ./scripts/db-push.sh
const { execSync } = require('child_process');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CONTAINER = process.env.BOW_CONTAINER || 'bow-web';

function run(cmd, opts = {}) {
  console.log('▶', cmd);
  execSync(cmd, { stdio: 'inherit', cwd: ROOT, ...opts });
}

try {
  // 1. Copy the host's updated schema into the running container
  run(`docker cp ${ROOT}/prisma/schema.prisma ${CONTAINER}:/app/prisma/schema.prisma`);

  // 2. Regenerate Prisma client (writes the .prisma/client + @prisma/client typings)
  run(`docker exec -u root ${CONTAINER} bash -c "node --require ./scripts/node-realpath-patch.cjs ./node_modules/prisma/build/index.js generate"`);

  // 3. Push the schema to the live Neon database
  run(`docker exec -u root ${CONTAINER} bash -c "node --require ./scripts/node-realpath-patch.cjs ./node_modules/prisma/build/index.js db push --skip-generate --accept-data-loss"`);

  console.log('\n✓ Database schema synced with Neon and Prisma client regenerated.');
} catch (err) {
  console.error('\n✗ Failed to sync schema:', err.message);
  process.exit(1);
}
