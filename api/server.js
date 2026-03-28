const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const mongoURI = process.env.MONGO_URI;
if (!mongoURI) {
  console.error('ERROR: MONGO_URI env var is not set');
  process.exit(1);
}

const express = require('express');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

const port = process.env.PORT || 3001;
const app = express();

// Security headers
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:3000', 'http://localhost:5173'];

app.use(morgan('combined'));
app.use(bodyParser.json({ limit: '10kb' }));
app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (curl, server-to-server, Vite proxy)
    if (!origin) return cb(null, true);
    // Allow any localhost port in dev
    if (/^http:\/\/localhost:\d+$/.test(origin)) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// General API rate limit
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(generalLimiter);

// RSVP rate limit - stricter for public endpoint
const rsvpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: 'Quá nhiều yêu cầu, vui lòng thử lại sau 15 phút.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.get('/', (req, res) => res.json({ status: 'ok', message: 'Wedding API - Công & Phành 2026' }));

const guestRoutes = require('./routes/guestRoutes');
app.use('/guests/rsvp', rsvpLimiter);
app.use('/guests', guestRoutes);

const adminRoutes = require('./routes/adminRoutes');
app.use('/admin', adminRoutes);

// Global error handler
app.use((err, req, res, next) => {
  const status = err.status || 500;
  const message = status === 500 ? 'Lỗi server nội bộ' : err.message;
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);
  res.status(status).json({ message });
});

mongoose.connect(mongoURI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(port, '0.0.0.0', () => {
      console.log(`Server is running on port ${port}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
