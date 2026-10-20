require('dotenv').config();

const mongoose = require('mongoose');
const app = require('./app');

const port = process.env.PORT || 3001;
if (!process.env.MONGO_URI || !process.env.JWT_SECRET) {
  console.error('Cần cấu hình MONGO_URI và JWT_SECRET');
  process.exit(1);
}

mongoose.connect(process.env.MONGO_URI)
  .then(() => app.listen(port, '0.0.0.0', () => console.log(`API đang chạy tại cổng ${port}`)))
  .catch(error => {
    console.error('Không thể kết nối MongoDB:', error);
    process.exit(1);
  });
