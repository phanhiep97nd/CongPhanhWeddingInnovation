const jwt=require('jsonwebtoken');
module.exports=(req,res,next)=>{const token=/^Bearer (.+)$/.exec(req.headers.authorization||'');if(!token)return res.status(401).json({message:'Vui lòng đăng nhập'});try{req.user=jwt.verify(token[1],process.env.JWT_SECRET);if(!req.user.sub)throw Error();next()}catch{return res.status(401).json({message:'Phiên đăng nhập không hợp lệ'})}};
