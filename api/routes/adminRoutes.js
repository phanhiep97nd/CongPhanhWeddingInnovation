const express = require('express');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');

const router = express.Router();

// POST /admin/login - hardcoded credentials for simplicity
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Vui lòng nhập tên đăng nhập và mật khẩu' });
  }

  if (username !== 'a' || password !== 'a') {
    return res.status(401).json({ message: 'Sai tên đăng nhập hoặc mật khẩu' });
  }

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ message: 'Server configuration error' });
  }

  const token = jwt.sign(
    { username, role: 'admin', name: 'Admin' },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );

  res.json({ token, username, role: 'admin', name: 'Admin' });
});

// GET /admin/me - verify token and return user info
router.get('/me', auth, (req, res) => {
  res.json({
    username: req.admin.username,
    role: req.admin.role,
    name: req.admin.name,
  });
});

module.exports = router;
