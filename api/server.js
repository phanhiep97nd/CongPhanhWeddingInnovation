require('dotenv').config();
const db = require('./db');
const app = require('./app');
const port = process.env.PORT || 3001;
if (!process.env.DATABASE_URL || !process.env.JWT_SECRET) {
  console.error('Cần cấu hình DATABASE_URL PostgreSQL và JWT_SECRET');
  process.exit(1);
}
db.migrate().then(() => {
  const server = app.listen(port, '0.0.0.0', () => console.log(`API đang chạy tại cổng ${port} (PostgreSQL)`));
  for (const signal of ['SIGTERM', 'SIGINT']) process.once(signal, () => {
    server.close(() => db.close().then(() => process.exit(0)));
    setTimeout(() => process.exit(1), 10000).unref();
  });
}).catch(error => {
  console.error('Không thể khởi tạo PostgreSQL:', error.message);
  db.close().finally(() => { process.exitCode = 1; });
});
