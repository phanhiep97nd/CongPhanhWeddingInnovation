const mongoose = require('mongoose');
const schema = new mongoose.Schema({email:{type:String,required:true,unique:true,lowercase:true,trim:true},passwordHash:{type:String,required:true},name:{type:String,required:true,trim:true}}, {timestamps:true});
module.exports = mongoose.model('User',schema);
