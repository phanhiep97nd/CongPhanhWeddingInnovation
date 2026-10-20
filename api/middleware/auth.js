const jwt = require('jsonwebtoken');
const User = require('../models/User');

async function auth(request, response, next) {
  const token = /^Bearer (.+)$/.exec(request.headers.authorization || '');
  if (!token) return response.status(401).json({ message: 'Vui lòng đăng nhập' });

  try {
    const payload = jwt.verify(token[1], process.env.JWT_SECRET);
    if (!payload.sub) throw new Error('Missing subject');
    const user = await User.findById(payload.sub).select('email role status').lean();
    if (!user) return response.status(401).json({ message: 'Phiên đăng nhập không hợp lệ' });
    if (user.status === 'locked') {
      return response.status(403).json({ code: 'LOCKED', message: 'Tài khoản đã bị khoá' });
    }
    request.user = { sub: String(user._id), email: user.email, role: user.role || 'user' };
    next();
  } catch {
    return response.status(401).json({ message: 'Phiên đăng nhập không hợp lệ' });
  }
}

function requireAdmin(request, response, next) {
  if (request.user.role !== 'admin') return response.status(403).json({ message: 'Không có quyền truy cập' });
  next();
}

module.exports = auth;
module.exports.requireAdmin = requireAdmin;
