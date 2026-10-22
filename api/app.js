const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const app = express();
app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(compression());

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(origin => origin.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || /^http:\/\/localhost(?::\d+)?$/.test(origin) || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      const error = new Error('Nguồn truy cập không được phép');
      error.status = 403;
      callback(error);
    }
  },
  credentials: true
}));

if (process.env.NODE_ENV !== 'test') app.use(morgan('combined'));
app.use(express.json({ limit: '200kb' }));
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 200,
  skip: () => process.env.NODE_ENV === 'test',
  message: { message: 'Quá nhiều yêu cầu, vui lòng thử lại sau' }
}));

const authLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  skip: () => process.env.NODE_ENV === 'test',
  message: { message: 'Quá nhiều yêu cầu, vui lòng thử lại sau' }
});

app.get('/', async (request, response) => {
  try {
    await require('./db').query('SELECT 1');
    response.json({ status: 'ok' });
  } catch {
    response.status(503).json({ status: 'unavailable' });
  }
});
app.use('/auth/register', authLimit);
app.use('/auth/login', authLimit);
app.use('/payos', require('./routes/payosRoutes'));
app.use('/auth', require('./routes/authRoutes'));
app.use('/weddings', require('./routes/weddingRoutes'));
app.use('/public', require('./routes/publicRoutes'));
app.use('/admin', require('./routes/adminRoutes'));

app.use((request, response) => response.status(404).json({ message: 'Không tìm thấy' }));
app.use((error, request, response, next) => {
  let status = error.status || 500;
  let message = error.message;

  if (error.type === 'entity.parse.failed' || (error instanceof SyntaxError && 'body' in error)) {
    status = 400;
    message = 'JSON không hợp lệ';
  } else if (error.name === 'CastError') {
    status = 404;
    message = 'Không tìm thấy';
  } else if (error.name === 'ValidationError' || ['23514', '23502', '22P02'].includes(error.code)) {
    status = 400;
    message = 'Dữ liệu không hợp lệ';
  } else if (error.code === '23505') {
    status = 409;
    message = 'Dữ liệu đã tồn tại';
  } else if (status === 500) {
    message = 'Lỗi máy chủ';
  }

  response.status(status).json({ message });
});

module.exports = app;
