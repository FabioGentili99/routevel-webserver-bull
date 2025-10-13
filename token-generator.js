require('dotenv').config();
const jwt = require('jsonwebtoken');

if (!process.env.JWT_SECRET) {
  console.error('Missing JWT_SECRET in .env');
  process.exit(1);
}

// define a minimal payload that clearly identifies the token as the worker
const payload = {
  role: 'worker',
  service: 'route2vel',
  createdAt: new Date().toISOString()
};

// sign the token with a long expiration
const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '365d' });

console.log('\nWorker token generated:\n');
console.log(token);
console.log('\nPaste this into .env as:\n');
console.log(`WORKER_AUTH_TOKEN=${token}`);