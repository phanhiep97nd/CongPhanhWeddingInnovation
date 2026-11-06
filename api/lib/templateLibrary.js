const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const { fail } = require('./common');
const content = require('./templateContent');
const { entitlementsFor } = require('./plans');
const blessingRuntime = fs.readFileSync(path.join(__dirname, '../data/blessings.js'), 'utf8');
const envelopeRuntime = fs.readFileSync(path.join(__dirname, '../data/envelope.js'), 'utf8');
// Openings captured with the source layouts. Cards without one get the shared envelope from data/envelope.js (#ht-opening).
const nativeOpenings = ['#ht-envelope', '.animated-envelope-component', '.animated-image-overlay', '.ip-opening-container', '.opening-envelope-splash', '.photobooth-opening', '.slr-root'];
const openingPattern = new RegExp(nativeOpenings.map(selector => selector[0] === '#' ? `id="${selector.slice(1)}"` : String.raw`class="[^"]*\b${selector.slice(1)}\b`).join('|'));
const envelopeTexts = ['kicker', 'to', 'letter', 'button'];
const hasNativeOpening = layout => (layout.nativeOpening ??= openingPattern.test(layout.html));
function invitationText(wedding) {
  if (!wedding) return { names: '', date: '' };
  const wedding_ = (wedding.invitationKind || 'wedding') === 'wedding';
  const names = wedding_ ? [wedding.couple?.groom, wedding.couple?.bride].filter(Boolean).join(' & ') : wedding.eventTitle || '';
  // The envelope states the wedding date itself (dd/mm/yyyy); the free-form display text is only a fallback.
  const day = wedding.eventDate ? new Date(wedding.eventDate) : null;
  const date = day && Number.isFinite(day.getTime()) ? [day.getUTCDate(), day.getUTCMonth() + 1].map(value => String(value).padStart(2, '0')).concat(day.getUTCFullYear()).join('/') : wedding.dateText || '';
  return { names, date, kicker: wedding_ ? 'Trân trọng kính mời' : 'Thân mời bạn đến chung vui' };
}

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
  // The owner's photo album (scripts/derive-album-bindings.mjs): at most one photo per album position of the template.
  let album;
  if (Object.hasOwn(value, 'album') && value.album !== null) {
    const limit = albumBindings[layout.id]?.photos.length || 0;
    if (!Array.isArray(value.album) || value.album.length > limit) fail(limit ? `Album của mẫu này nhận tối đa ${limit} ảnh` : 'Mẫu này không có album ảnh');
    for (const photo of value.album) {
      let url; try { url = new URL(photo); } catch { fail('Ảnh cần đường dẫn HTTPS'); }
      if (typeof photo !== 'string' || photo.length > 2048 || url.protocol !== 'https:' || url.username || url.password) fail('Ảnh cần đường dẫn HTTPS');
    }
    if (value.album.length) album = [...value.album];
  }
  // Owner wording for the shared opening envelope (api/data/envelope.js); names and dates come from the wedding.
  let envelope;
  if (Object.hasOwn(value, 'envelope') && value.envelope !== null) {
    if (!value.envelope || typeof value.envelope !== 'object' || Array.isArray(value.envelope)) fail('Nội dung phong thư không hợp lệ');
    for (const [key, text] of Object.entries(value.envelope)) {
      if (!envelopeTexts.includes(key) || typeof text !== 'string' || text.length > 120) fail('Nội dung phong thư không hợp lệ');
      if (text.trim()) (envelope ??= {})[key] = text.trim();
    }
  }
  return { templateId: layout.id, values, opening: value.opening !== false, motion: value.motion !== false, ...(album ? { album } : {}), ...(envelope ? { envelope } : {}) };
}
// Album photos fill the album positions in order and repeat when there are fewer photos than positions; every slot of
// a position (a slide and its thumbnail) shows the same photo.
const albumBindings = require('../data/template-album-bindings.json');
function albumValues(selected) {
  const positions = albumBindings[selected.templateId]?.photos, album = selected.album || [];
  if (!positions || !album.length) return {};
  return Object.fromEntries(positions.flatMap((keys, index) => keys.map(key => [key, album[index % album.length]])));
}
// Asset URLs are signed per template so layouts never need a static route.
function assetBase(id) {
  const token = jwt.sign({ scope: 'template-assets', templateId: id }, process.env.JWT_SECRET, { expiresIn: '2h', audience: 'template-assets' });
  return `/api/templates/assets/${token}/`;
}
const escape = text => String(text).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
function render(selected, { editing = false, guestName = '', wedding } = {}) {
  const layout = definition(selected.templateId);
  const nonce = crypto.randomBytes(18).toString('base64');
  const base = assetBase(layout.id);
  const fields = new Map(layout.fields.map(f => [f.key, f]));
  const resolved = content.resolve(layout.id, wedding);
  const owner = { ...albumValues(selected), ...selected.values };
  // One replacement pass: values cannot introduce HTML or additional template slots.
  let html = layout.html.replace(/%%HT_(f\d+)%%/g, (_, key) => {
    const field = fields.get(key);
    // Precedence: synchronized information, then the owner's edit or album, then text following the wedding date, then the sample.
    let value = Object.hasOwn(resolved.values, key) ? resolved.values[key] : Object.hasOwn(owner, key) ? owner[key] : Object.hasOwn(resolved.soft, key) ? resolved.soft[key] : field.value;
    if (field.context === 'css-url' && Object.hasOwn(owner, key)) value = value.replace(/[\s"'()\\<>]/g, char => encodeURIComponent(char).replaceAll("'", '%27').replaceAll('(', '%28').replaceAll(')', '%29'));
    return escape((field.type === 'image' && !value ? 'data:,' : value).replaceAll('{khach}', guestName || 'Quý khách'));
  }).replaceAll('%%HT_ASSETS%%', base);
  // The owner's music (a plan feature) replaces the template's own track; cards without one get a small toggle.
  const music = wedding?.musicUrl && /^https:\/\//i.test(wedding.musicUrl) && entitlementsFor(wedding.plan || 'free').customMusic ? wedding.musicUrl : '';
  const bridge = `(()=>{
    const editing=${editing ? 'true' : 'false'};
    const music=${JSON.stringify(music).replaceAll('<', '\\u003c')};
    if(music){
      const players=[...document.querySelectorAll('audio')];
      if(players.length)players.forEach(player=>{player.querySelectorAll('source').forEach(source=>source.remove());player.src=music;player.load?.();});
      else{
        const player=document.createElement('audio');player.src=music;player.loop=true;player.preload='none';document.body.append(player);
        const toggle=document.createElement('button');toggle.type='button';toggle.setAttribute('aria-label','Bật hoặc tắt nhạc');toggle.textContent='♪';
        toggle.style.cssText='position:fixed;top:12px;right:12px;z-index:2147482000;width:40px;height:40px;border:0;border-radius:50%;background:rgba(40,30,30,.45);color:#fff;font-size:18px;cursor:pointer;opacity:.7';
        const sync=()=>{toggle.style.opacity=player.paused?'.7':'1';};
        toggle.addEventListener('click',event=>{event.stopPropagation();(player.paused?player.play():Promise.resolve(player.pause())).catch(()=>{}).finally(sync);});
        document.body.append(toggle);
        if(!editing){const start=()=>{player.play().then(sync).catch(()=>{});document.removeEventListener('pointerdown',start,true);};document.addEventListener('pointerdown',start,true);}
      }
    }
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
      // Editor bridge: the parent selects/highlights fields and applies plain text edits without a reload.
      const nodes=key=>[...document.querySelectorAll('[data-ht-fields~="'+CSS.escape(key)+'"]')];
      const mark=(name,keys)=>{document.querySelectorAll('['+name+']').forEach(node=>node.removeAttribute(name));[].concat(keys||[]).forEach(key=>{if(key)nodes(key).forEach(node=>node.setAttribute(name,''));});};
      const visible=node=>{const box=node.getBoundingClientRect();return box.width>0&&box.height>0;};
      // scrollIntoView would also scroll the editor page around the iframe; scroll only the card's own container.
      const reveal=node=>{
        let box=node.parentElement;
        while(box&&box!==document.body&&!(/(auto|scroll)/.test(getComputedStyle(box).overflowY)&&box.scrollHeight>box.clientHeight))box=box.parentElement;
        const scroller=box&&box!==document.body?box:document.scrollingElement,rect=node.getBoundingClientRect();
        const view=scroller===document.scrollingElement?{top:0,height:innerHeight}:scroller.getBoundingClientRect();
        scroller.scrollBy({top:rect.top-view.top-(view.height-Math.min(rect.height,view.height))/2,behavior:'smooth'});
      };
      const order=()=>{const keys=[];for(const node of document.querySelectorAll('[data-ht-fields]'))for(const key of node.getAttribute('data-ht-fields').split(' '))if(!keys.includes(key))keys.push(key);return keys;};
      parent.postMessage({type:'ht:ready',order:order()},'*');
      window.addEventListener('message',event=>{
        if(event.source!==parent)return;const data=event.data||{};
        if(data.type==='ht:select'){mark('data-ht-selected',data.keys||data.key);const target=data.key&&nodes(data.key).find(visible);if(target&&data.scroll)reveal(target);}
        else if(data.type==='ht:hover')mark('data-ht-hover',data.keys||data.key);
        else if(data.type==='ht:text'&&typeof data.key==='string'&&typeof data.value==='string'){
          // Only elements owning exactly this one field and holding only its text can be patched safely.
          const targets=[...document.querySelectorAll('[data-ht-fields="'+CSS.escape(data.key)+'"]')];
          const ok=targets.length>0&&targets.every(node=>[...node.childNodes].every(child=>child.nodeType===3));
          if(ok)targets.forEach(node=>{node.textContent=data.value.replaceAll('{khach}','Quý khách');});
          parent.postMessage({type:'ht:text-applied',key:data.key,value:data.value,ok},'*');
        }
      });
      let queued=false;
      document.addEventListener('scroll',()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;parent.postMessage({type:'ht:scroll',top:window.scrollY,inner:document.querySelector('.styles_customScroll__X5r6w')?.scrollTop||0},'*');});},true);
      window.addEventListener('message',event=>{if(event.source!==parent||event.data?.type!=='ht:restore')return;const data=event.data;if(data.skipOpening)skipOpening();requestAnimationFrame(()=>{window.scrollTo(0,Number(data.top)||0);const inner=document.querySelector('.styles_customScroll__X5r6w');if(inner)inner.scrollTop=Number(data.inner)||0;});});
    }
    // Many layouts render text with pointer-events:none, so a click lands on a wrapper; resolve the field under the pointer.
    // Layouts stack wrappers, backgrounds and pointer-events:none text, so the event target is often not the part the
    // user sees. Pick the smallest visible field under the pointer anywhere on the card.
    const fieldAt=event=>{
      const x=event.clientX,y=event.clientY,direct=event.target.closest?.('[data-ht-fields]')||null;
      let best=direct,area=Infinity;
      if(direct){const box=direct.getBoundingClientRect();if(box.width*box.height>0)area=box.width*box.height;}
      for(const node of document.querySelectorAll('[data-ht-fields]')){
        const box=node.getBoundingClientRect(),size=box.width*box.height;
        if(!size||size>=area||x<box.left||x>box.right||y<box.top||y>box.bottom)continue;
        const style=getComputedStyle(node);if(style.visibility==='hidden'||style.opacity==='0')continue;
        best=node;area=size;
      }
      return best;
    };
    if(editing){
      let pending=null;
      document.addEventListener('mousemove',event=>{if(pending)return;pending=requestAnimationFrame(()=>{pending=null;
        const node=event.target.closest('.animated-image-overlay,.animated-envelope-component,.ip-opening-container,.opening-envelope-splash,.photobooth-opening')?null:fieldAt(event);
        document.querySelectorAll('[data-ht-point]').forEach(item=>{if(item!==node)item.removeAttribute('data-ht-point');});
        if(node)node.setAttribute('data-ht-point','');document.documentElement.style.cursor=node?'pointer':'';});},true);
    }
    const editable=event=>{if(!editing||event.target.closest?.('a[href="?open=1"],#ht-opening,.animated-image-overlay,.animated-envelope-component,.ip-opening-container,.opening-envelope-splash,.photobooth-opening,.slr-ui-open-button'))return null;return fieldAt(event);};
    const choose=node=>parent.postMessage({type:'ht:field',keys:node.getAttribute('data-ht-fields').split(' ')},'*');
    // Touch browsers do not send click for taps on non-interactive wrappers (the field text itself has pointer-events:none),
    // so a short, still touch/pen press selects the field directly. Mouse input keeps using click.
    let press=null,tapped=0;
    if(editing){
      document.addEventListener('pointerdown',event=>{press=event.pointerType==='mouse'||!event.isPrimary?null:{x:event.clientX,y:event.clientY,time:Date.now()};},true);
      document.addEventListener('pointercancel',()=>{press=null;},true);
      document.addEventListener('pointerup',event=>{
        const start=press;press=null;
        if(!start||Math.hypot(event.clientX-start.x,event.clientY-start.y)>10||Date.now()-start.time>700)return;
        const node=editable(event);if(node){tapped=Date.now();choose(node);}
      },true);
    }
    document.addEventListener('click',event=>{
      const node=editable(event);
      if(node){
        event.preventDefault();event.stopImmediatePropagation();
        if(Date.now()-tapped>700)choose(node);return;
      }
      const link=event.target.closest('a');
      if(link&&link.getAttribute('href')==='#')event.preventDefault();
      const away=event.target.closest('[data-ht-href]');
      if(away&&!editing){event.preventDefault();parent.postMessage({type:'ht:link',url:away.getAttribute('data-ht-href')},'*');return;}
      if(event.target.closest('[data-ht-rsvp]')){event.preventDefault();parent.postMessage({type:'ht:rsvp'},'*');}
    },true);
    // The guest page pauses the card's music while the couple's recorded invitation plays.
    window.addEventListener('message',event=>{if(event.source===parent&&event.data?.type==='ht:pause-media')document.querySelectorAll('audio,video').forEach(media=>media.pause());});
    document.querySelectorAll('input,textarea,select').forEach(node=>{node.disabled=true;});
    function skipOpening(){document.querySelector('#ht-envelope')?.remove();document.querySelector('#ht-opening')?.remove();document.querySelectorAll('.animated-envelope-component').forEach(node=>(node.parentElement?.closest('[style*="position: fixed"]')||node).remove());document.querySelectorAll('.animated-image-overlay,.animated-background,.animated-image-container,.ip-opening-container,.opening-envelope-splash,.photobooth-opening,.slr-root,.opening-overlay-container').forEach(node=>node.remove());document.querySelectorAll('.styles_customScroll__X5r6w').forEach(node=>{node.style.overflowY='auto';node.style.touchAction='auto';});document.querySelectorAll('a[href="?open=1"]').forEach(node=>node.click());}
    ${selected.opening === false ? 'skipOpening();' : ''}
  })();`;
  // Cards without "Ẩn thương hiệu" end with one thin line naming the site, placed after the last content inside the
  // layout's own scroller (many layouts scroll inside a phone frame rather than the page).
  const branded = Boolean(wedding) && !entitlementsFor(wedding.plan || 'free').removeBranding;
  const brandScript = branded ? `(()=>{const line=document.createElement('a');line.id='ht-brand';line.setAttribute('data-ht-href','https://hythiep.net');line.href='#';
    line.innerHTML='<b>hythiep.net</b><span> · Thiệp hỷ gửi tận tên từng người</span>';
    const scrollers=[...document.querySelectorAll('.styles_customScroll__X5r6w,.phone-container-screen')].filter(node=>node.scrollHeight>node.clientHeight+1);
    (scrollers.at(-1)||document.body).append(line);})();` : '';
  const opening = selected.opening === false ? null : { inject: !hasNativeOpening(layout), guest: guestName, motion: selected.motion !== false, editing, ...invitationText(wedding), texts: selected.envelope || {} };
  const openingScript = opening ? `${envelopeRuntime}\nwindow.htEnvelope.mount(${JSON.stringify(opening).replaceAll('<', '\\u003c')});` : '';
  const scripts = [...layout.scripts, bridge, content.runtimeScript(resolved.runtime, editing), brandScript, openingScript, blessingRuntime, 'window.htBlessings.mount(document.body,{embedded:true});'].map(code => `<script nonce="${nonce}">${code.replaceAll('</script', '<\\/script')}</script>`).join('');
  const mapFrames = resolved.runtime?.mapEmbed ? require('../data/google-map-hosts.json').map(host => `https://${host}/maps https://${host}/maps/`).join(' ') : "'none'";
  const csp = `default-src 'none'; img-src 'self' https: data:; style-src 'unsafe-inline' 'self'; font-src 'self' data:; media-src 'self' https:; script-src 'nonce-${nonce}'; connect-src 'none'; frame-src ${mapFrames}; form-action 'none'; base-uri 'none'`;
  html = html.replace('<head>', `<head><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="${csp}"><meta name="referrer" content="no-referrer">`);
  html = html.replace('</head>', `<style>html,body{margin:0;max-width:100%;overflow-x:hidden}button,a{-webkit-tap-highlight-color:transparent}.template-preview-mobile-header,.phone-container-footer{display:none!important}.phone-container-wrapper,.phone-container-frame,.phone-container-clip,.phone-container-screen{width:100%!important;max-width:100%!important;margin:0!important;border:0!important;border-radius:0!important;box-sizing:border-box!important}.phone-container-wrapper{padding:0!important;height:100dvh!important}.phone-container-screen{height:100dvh!important;overflow-y:auto!important;padding:0!important}[data-ht-fields]{${editing ? 'cursor:pointer' : ''}}${editing ? '[data-ht-fields]:hover,[data-ht-point],[data-ht-hover]{outline:2px dashed #a85e65;outline-offset:2px}[data-ht-selected]{outline:2px solid #a85e65!important;outline-offset:3px;box-shadow:0 0 0 6px #a85e652e!important;border-radius:4px}' : ''}${selected.motion === false ? '*,*::before,*::after{animation:none!important;transition:none!important}' : ''}#ht-brand{display:block;clear:both;position:relative;z-index:1;padding:14px 12px calc(14px + env(safe-area-inset-bottom));text-align:center;font:400 11px/1.4 system-ui,-apple-system,sans-serif;letter-spacing:.04em;color:#8a7a7c;background:#fffaf9;border-top:1px solid #0000000f;text-decoration:none}#ht-brand b{font-weight:600;color:#7a3b46}@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important;transition-duration:.01ms!important}}</style></head>`);
  return html.replace('</body>', scripts + '</body>');
}
function originalImages(id) {
  const layout = definition(id), base = assetBase(layout.id);
  return Object.fromEntries(layout.fields.filter(field => field.type === 'image' && !field.retired && field.value).map(field => [field.key, field.value.replaceAll('%%HT_ASSETS%%', base)]));
}
function editableFields(id) {
  const layout = definition(id);
  const album = new Map((albumBindings[id]?.photos || []).flatMap((keys, index) => keys.map(key => [key, index])));
  return layout.fields.filter(field => !field.retired).map(field => ({ ...field, value: field.type === 'image' ? '' : field.value, ...(content.binding(id, field.key) ? { binding: content.binding(id, field.key) } : {}), ...(album.has(field.key) ? { album: album.get(field.key) } : {}) }));
}
// The picture a shared link shows for a library card: the first photo the owner put on the card (in card order),
// else the template's cover. Signed asset URLs expire, so original template photos are never used.
function shareImage(selected) {
  if (!selected?.templateId) return '';
  let layout; try { layout = definition(selected.templateId); } catch { return ''; }
  const images = new Map(layout.fields.filter(field => field.type === 'image' && !field.retired).map(field => [field.key, field]));
  const owner = { ...albumValues(selected), ...selected.values };
  for (const match of layout.html.matchAll(/%%HT_(f\d+)%%/g)) {
    const value = owner[match[1]];
    if (images.has(match[1]) && /^https:\/\//i.test(value || '')) return value;
  }
  return catalog().find(item => item.id === layout.id)?.thumbnail || '';
}
// Which opening a card shows: its own captured one, or the shared envelope the owner can word.
const openingKind = id => hasNativeOpening(definition(id)) ? 'native' : 'shared';
module.exports = { root, catalog, definition, selection, render, editableFields, originalImages, openingKind, shareImage, boundValues: (id, wedding) => content.resolve(id, wedding).values, softValues: (id, wedding) => content.resolve(id, wedding).soft };
