const jwt = require('jsonwebtoken');

module.exports = (request, response, next) => {
  const token = /^Bearer (.+)$/.exec(request.headers.authorization || '');
  if (!token) return response.status(401).json({ message: 'Vui lòng đăng nhập' });

  try {
    request.user = jwt.verify(token[1], process.env.JWT_SECRET);
    if (!request.user.sub) throw new Error('Missing subject');
    next();
  } catch {
    return response.status(401).json({ message: 'Phiên đăng nhập không hợp lệ' });
  }
};
