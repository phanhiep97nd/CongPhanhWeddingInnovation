const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  try {
    req.admin = jwt.verify(auth.slice(7), process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: 'Token không hợp lệ hoặc đã hết hạn' });
  }
};

// Only allow admin role
module.exports.adminOnly = (req, res, next) => {
  if (req.admin?.role !== 'admin') {
    return res.status(403).json({ message: 'Chỉ admin mới có quyền thực hiện' });
  }
  next();
};
