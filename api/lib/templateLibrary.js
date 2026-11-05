const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const { fail } = require('./common');
const content = require('./templateContent');
const blessingRuntime = fs.readFileSync(path.join(__dirname, '../data/blessings.js'), 'utf8');

const root = path.resolve(__dirname, '../private/templates');
// Deliberately never expose this directory with express.static.
let catalogCache;
const layoutCache = new Map();
function catalog() {
  const file = path.join(root, 'catalog.json'), stamp = fs.statSync(file).mtimeMs;
  if (catalogCache?.stamp !== stamp) catalogCache = { stamp, data: JSON.parse(fs.readFileSync(file, 'utf8')) };
  return catalogCache.data;
}
function definition(id) {
  if (typeof id !== 'string' || !/^tpl-[a-f0-9]{16}$/.test(id) || !catalog().some(x => x.id === id)) {
    const error = new Error('Không tìm thấy mẫu thiệp'); error.status = 404; throw error;
  }
  const file = path.join(root, 'layouts', `${id}.json`), stamp = fs.statSync(file).mtimeMs;
  let cached = layoutCache.get(id);
  if (cached?.stamp !== stamp) cached = { stamp, data: JSON.parse(fs.readFileSync(file, 'utf8')) };
  layoutCache.delete(id); layoutCache.set(id, cached);
  if (layoutCache.size > 12) layoutCache.delete(layoutCache.keys().next().value);
  return cached.data;
}
function selection(value) {
  if (value === null) return null;
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('Dữ liệu mẫu không hợp lệ');
  const layout = definition(value.templateId);
  for (const flag of ['opening', 'motion']) if (Object.hasOwn(value, flag) && typeof value[flag] !== 'boolean') fail('Tùy chọn hiệu ứng không hợp lệ');
  if (!value.values || typeof value.values !== 'object' || Array.isArray(value.values)) fail('Nội dung mẫu không hợp lệ');
  const values = {};
  const fields = new Map(layout.fields.map(field => [field.key, field]));
  for (const [key, text] of Object.entries(value.values)) {
    const field = fields.get(key);
    if (!field || typeof text !== 'string' || text.length > (field.type === 'image' ? 2048 : 5000)) fail('Trường nội dung không hợp lệ');
    if (field.retired) continue;
    if (field.type === 'image' && text !== '') {
      let url; try { url = new URL(text); } catch { fail('Ảnh cần đường dẫn HTTPS'); }
      if (url.protocol !== 'https:' || url.username || url.password) fail('Ảnh cần đường dẫn HTTPS');
    }
    values[key] = text;
  }
  return { templateId: layout.id, values, opening: value.opening !== false, motion: value.motion !== false };
}
const escape = text => String(text).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
function render(selected, { editing = false, guestName = '', wedding } = {}) {
  const layout = definition(selected.templateId);
  const nonce = crypto.randomBytes(18).toString('base64');
  const token = jwt.sign({ scope: 'template-assets', templateId: layout.id }, process.env.JWT_SECRET, { expiresIn: '2h', audience: 'template-assets' });
  const base = `/api/templates/assets/${token}/`;
  const fields = new Map(layout.fields.map(f => [f.key, f]));
  const resolved = content.resolve(layout.id, wedding);
  // One replacement pass: values cannot introduce HTML or additional template slots.
  let html = layout.html.replace(/%%HT_(f\d+)%%/g, (_, key) => {
    const field = fields.get(key);
    let value = Object.hasOwn(resolved.values, key) ? resolved.values[key] : Object.hasOwn(selected.values, key) ? selected.values[key] : field.value;
    if (field.context === 'css-url' && Object.hasOwn(selected.values, key)) value = value.replace(/[\s"'()\\<>]/g, char => encodeURIComponent(char).replaceAll("'", '%27').replaceAll('(', '%28').replaceAll(')', '%29'));
    return escape((field.type === 'image' && !value ? 'data:,' : value).replaceAll('{khach}', guestName || 'Quý khách'));
  }).replaceAll('%%HT_ASSETS%%', base);
  const bridge = `(()=>{
    const editing=${editing ? 'true' : 'false'};
    function fitCanvas(){
      const screen=document.querySelector('.phone-container-screen');
      const widget=screen?.querySelector('.widget-wrapper');
      let canvas=widget?.parentElement;
      while(canvas&&canvas!==screen&&!(canvas.style.width==='428px'&&canvas.style.transform.includes('scale')))canvas=canvas.parentElement;
      if(canvas&&canvas!==screen){
        const ratio=Math.min(1,screen.clientWidth/428);
        canvas.style.transform='scale('+ratio+')';
        canvas.parentElement.style.width=(428*ratio)+'px';
        canvas.parentElement.style.height=(parseFloat(canvas.style.height)*ratio)+'px';
        canvas.parentElement.parentElement.style.setProperty('--canvas-scale',ratio);
        // Captures can retain the pre-hydration opacity on the whole design.
        canvas.parentElement.parentElement.style.opacity='1';
      }
    }
    fitCanvas();window.addEventListener('resize',fitCanvas);
    if(typeof ResizeObserver!=='undefined')new ResizeObserver(fitCanvas).observe(document.body);
    if(editing){
      let queued=false;
      document.addEventListener('scroll',()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;parent.postMessage({type:'ht:scroll',top:window.scrollY,inner:document.querySelector('.styles_customScroll__X5r6w')?.scrollTop||0},'*');});},true);
      window.addEventListener('message',event=>{if(event.source!==parent||event.data?.type!=='ht:restore')return;const data=event.data;requestAnimationFrame(()=>{window.scrollTo(0,Number(data.top)||0);const inner=document.querySelector('.styles_customScroll__X5r6w');if(inner)inner.scrollTop=Number(data.inner)||0;});});
    }
    document.addEventListener('click',event=>{
      const node=event.target.closest('[data-ht-fields]');
      if(editing&&node&&!event.target.closest('a[href="?open=1"],button,.animated-image-overlay,.animated-envelope-component,.ip-opening-container,.opening-envelope-splash,.photobooth-opening,.slr-ui-open-button')){
        event.preventDefault();event.stopImmediatePropagation();
        parent.postMessage({type:'ht:field',keys:node.getAttribute('data-ht-fields').split(' ')},'*');return;
      }
      const link=event.target.closest('a');
      if(link&&link.getAttribute('href')==='#')event.preventDefault();
      if(event.target.closest('[data-ht-rsvp]')){event.preventDefault();parent.postMessage({type:'ht:rsvp'},'*');}
    },true);
    document.querySelectorAll('input,textarea,select').forEach(node=>{node.disabled=true;});
    ${selected.opening === false ? "document.querySelector('#ht-envelope')?.remove();document.querySelectorAll('.animated-envelope-component').forEach(node=>(node.parentElement?.closest('[style*=\"position: fixed\"]')||node).remove());document.querySelectorAll('.animated-image-overlay,.animated-background,.animated-image-container,.ip-opening-container,.opening-envelope-splash,.photobooth-opening,.slr-root,.opening-overlay-container').forEach(node=>node.remove());document.querySelectorAll('.styles_customScroll__X5r6w').forEach(node=>{node.style.overflowY='auto';node.style.touchAction='auto';});document.querySelectorAll('a[href=\"?open=1\"]').forEach(node=>node.click());" : ''}
  })();`;
  const scripts = [...layout.scripts, bridge, content.runtimeScript(resolved.runtime), blessingRuntime, 'window.htBlessings.mount(document.body,{embedded:true});'].map(code => `<script nonce="${nonce}">${code.replaceAll('</script', '<\\/script')}</script>`).join('');
  const csp = `default-src 'none'; img-src 'self' https: data:; style-src 'unsafe-inline' 'self'; font-src 'self' data:; media-src 'self' https:; script-src 'nonce-${nonce}'; connect-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'`;
  html = html.replace('<head>', `<head><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="${csp}"><meta name="referrer" content="no-referrer">`);
  html = html.replace('</head>', `<style>html,body{margin:0;max-width:100%;overflow-x:hidden}button,a{-webkit-tap-highlight-color:transparent}.template-preview-mobile-header,.phone-container-footer{display:none!important}.phone-container-wrapper,.phone-container-frame,.phone-container-clip,.phone-container-screen{width:100%!important;max-width:100%!important;margin:0!important;border:0!important;border-radius:0!important;box-sizing:border-box!important}.phone-container-wrapper{padding:0!important;height:100dvh!important}.phone-container-screen{height:100dvh!important;overflow-y:auto!important;padding:0!important}[data-ht-fields]{${editing ? 'cursor:pointer' : ''}}${editing ? '[data-ht-fields]:hover{outline:2px dashed #a85e65;outline-offset:2px}' : ''}${selected.motion === false ? '*,*::before,*::after{animation:none!important;transition:none!important}' : ''}@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important;transition-duration:.01ms!important}}</style></head>`);
  return html.replace('</body>', scripts + '</body>');
}
function editableFields(id) {
  const layout = definition(id);
  return layout.fields.filter(field => !field.retired).map(field => ({ ...field, value: field.type === 'image' ? '' : field.value, ...(content.binding(id, field.key) ? { binding: content.binding(id, field.key) } : {}) }));
}
module.exports = { root, catalog, definition, selection, render, editableFields, boundValues: (id, wedding) => content.resolve(id, wedding).values };
