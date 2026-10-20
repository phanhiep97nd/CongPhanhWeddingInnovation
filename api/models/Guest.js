const mongoose=require('mongoose');
const schema=new mongoose.Schema({wedding:{type:mongoose.Schema.Types.ObjectId,ref:'Wedding',index:true},code:{type:String},name:{type:String,required:true,trim:true},invitationName:{type:String,required:true,trim:true},phone:{type:String,default:''},status:{type:String,enum:['pending','yes','no'],default:'pending'},guestCount:{type:Number,default:1,min:0,max:20},joinGroup:{type:Boolean,default:false},pickupPoint:{type:String,default:''},room:{type:String,default:''},note:{type:String,default:''}},{timestamps:true});
schema.index({wedding:1,code:1},{unique:true,partialFilterExpression:{code:{$type:'string'}}});schema.index({wedding:1,status:1});schema.index({wedding:1,createdAt:-1});
module.exports=mongoose.model('Guest',schema);
