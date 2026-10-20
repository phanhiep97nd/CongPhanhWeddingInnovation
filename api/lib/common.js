const crypto=require('crypto');
const fail=(message='Dữ liệu không hợp lệ')=>{const e=new Error(message);e.status=400;throw e};
const string=(v,max=100,required=false)=>{if(typeof v!=='string'||v.length>max||required&&!v.trim())fail();return v.trim()};
const bool=v=>{if(typeof v!=='boolean')fail();return v};
const count=v=>{if(!Number.isInteger(v)||v<0||v>20)fail('Số khách không hợp lệ');return v};
const url=v=>{v=string(v,2048);if(v&&!/^https:\/\/[^\s/]+(?:\/[^\s]*)?$/i.test(v))fail('URL phải bắt đầu bằng https://');return v};
const color=v=>{v=string(v,7);if(!/^#[0-9a-fA-F]{6}$/.test(v))fail('Màu không hợp lệ');return v};
const id=()=>crypto.randomBytes(6).toString('base64url');
const code=()=>{const chars='abcdefghijklmnopqrstuvwxyz0123456789';let s='';for(let i=0;i<8;i++)s+=chars[crypto.randomInt(chars.length)];return s};
const pick=(body,fields)=>{const out={};for(const [key,validator] of Object.entries(fields))if(Object.prototype.hasOwnProperty.call(body||{},key))out[key]=validator(body[key]);return out};
const shape=(item,fields)=>{if(!item||typeof item!=='object'||Array.isArray(item))fail();return pick(item,fields)};
const serialize=(doc,omit=[])=>{const o=doc.toObject?doc.toObject():{...doc};o.id=String(o._id);delete o._id;delete o.__v;for(const k of omit)delete o[k];return o};
const weddingFields={slug:v=>{v=string(v,50).toLowerCase();if(!/^[a-z0-9](?:[a-z0-9-]{1,48}[a-z0-9])$/.test(v))fail('Đường dẫn không hợp lệ');return v},published:bool,
 couple:v=>shape(v,{groom:x=>string(x,100),bride:x=>string(x,100),groomFull:x=>string(x,100),brideFull:x=>string(x,100)}),eventDate:v=>{if(v===null)return null;if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}(?:T.*Z)?$/.test(v)||Number.isNaN(Date.parse(v)))fail('Ngày không hợp lệ');return new Date(v)},dateText:v=>string(v,100),venue:v=>shape(v,{name:x=>string(x,100),address:x=>string(x,500),mapUrl:url}),coverImage:url,ogImage:url,
 story:v=>shape(v,{title:x=>string(x,200),body:x=>string(x,5000),image:url}),timeline:v=>items(v,50,{id:x=>string(x,100),time:x=>string(x,100),title:x=>string(x,200),desc:x=>string(x,1000)}),gallery:v=>items(v,50,{id:x=>string(x,100),url, title:x=>string(x,200),desc:x=>string(x,1000),full:bool}),musicUrl:url,zaloGroupLink:url,
 dressCode:v=>shape(v,{note:x=>string(x,1000),colors:x=>{if(!Array.isArray(x)||x.length>12)fail();return x.map(color)}}),customSections:v=>items(v,20,{id:x=>string(x,100),title:x=>string(x,200),body:x=>string(x,5000),image:url}),sections:v=>{if(!Array.isArray(v)||v.length>28)fail();return v.map(x=>shape(x,{key:y=>string(y,120,true),enabled:bool}))},meta:v=>shape(v,{title:x=>string(x,200),description:x=>string(x,1000)}),theme:v=>shape(v,{primary:color})};
function items(v,max,fields){if(!Array.isArray(v)||v.length>max)fail();return v.map(x=>({id:id(),...shape(x,fields)}))}
function normalizeSections(sections,custom){const built=require('../models/Wedding').SECTION_KEYS;const allowed=new Set([...built,...custom.map(x=>'custom:'+x.id)]);const seen=new Set();const out=[];for(const section of sections){if(allowed.has(section.key)&&!seen.has(section.key)){seen.add(section.key);out.push({key:section.key,enabled:section.enabled})}}for(const key of built)if(!seen.has(key))out.push({key,enabled:false});for(const x of custom){const key='custom:'+x.id;if(!seen.has(key))out.push({key,enabled:true})}return out}
const guestFields={invitationName:v=>string(v,100,true),name:v=>string(v,100),phone:v=>string(v,50),status:v=>{if(!['pending','yes','no'].includes(v))fail('Trạng thái không hợp lệ');return v},guestCount:count,joinGroup:bool,pickupPoint:v=>string(v,200),room:v=>string(v,100),note:v=>string(v,1000)};
const publicGuest=o=>({code:o.code,invitationName:o.invitationName,status:o.status,guestCount:o.guestCount,joinGroup:o.joinGroup,pickupPoint:o.pickupPoint,room:o.room});
module.exports={fail,string,bool,count,url,color,id,code,pick,serialize,weddingFields,normalizeSections,guestFields,publicGuest};
