require('dotenv').config();
const db = require('../db');
db.migrate().then(() => console.log('PostgreSQL migrations complete'))
  .catch(error => { console.error(error.message); process.exitCode = 1; })
  .finally(() => db.close());
