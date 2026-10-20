const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { string } = require('../lib/common');

const router = express.Router();

function userView(user) {
  return { id: String(user._id), email: user.email, name: user.name, role: user.role || 'user' };
}

function isAdminEmail(email) {
  return (process.env.ADMIN_EMAILS || '').split(',').some(item => item.trim().toLowerCase() === email);
}

function sign(user) {
  return jwt.sign(
    { sub: String(user._id), email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// ─── PUBLIC ROUTES ───
router.post('/register', async (request, response, next) => {
  try {
    const email = string(request.body.email, 254, true).toLowerCase();
    const password = string(request.body.password, 1000, true);
    const name = string(request.body.name, 100, true);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8) {
      return response.status(400).json({ message: 'Email hoặc mật khẩu không hợp lệ' });
    }
    if (await User.exists({ email })) return response.status(409).json({ message: 'Email đã được sử dụng' });

    const user = await User.create({ email, name, passwordHash: await bcrypt.hash(password, 10), role: isAdminEmail(email) ? 'admin' : 'user' });
    response.status(201).json({ token: sign(user), user: userView(user) });
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (request, response, next) => {
  try {
    const email = typeof request.body.email === 'string' ? request.body.email.trim().toLowerCase() : '';
    const password = request.body.password;
    const user = await User.findOne({ email });
    if (!user || typeof password !== 'string' || !await bcrypt.compare(password, user.passwordHash)) {
      return response.status(401).json({ message: 'Email hoặc mật khẩu không đúng' });
    }
    if (user.status === 'locked') {
      return response.status(403).json({ code: 'LOCKED', message: 'Tài khoản đã bị khoá' });
    }
    if (isAdminEmail(email) && user.role !== 'admin') {
      user.role = 'admin';
      await user.save();
    }
    response.json({ token: sign(user), user: userView(user) });
  } catch (error) {
    next(error);
  }
});

// ─── AUTHENTICATED ROUTES ───
router.get('/me', auth, async (request, response, next) => {
  try {
    const user = await User.findById(request.user.sub).lean();
    if (!user) return response.status(401).json({ message: 'Phiên đăng nhập không hợp lệ' });
    response.json({ user: userView(user) });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
