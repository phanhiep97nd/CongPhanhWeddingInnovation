// Invitation envelope shown before a library card opens. One owner for both cases:
// - cards without an opening of their own get a generated envelope styled from the card itself;
// - cards whose captured opening already is an envelope (#ht-envelope) get the guest's name added to it.
// Runs inside the sandboxed template document; data arrives as a JSON literal from the server.
(() => {
  const transparent = value => !value || value === 'transparent' || /rgba\([^)]*,\s*0\)$/.test(value);
  const rgb = value => (value.match(/\d+(\.\d+)?/g) || []).slice(0, 3).map(Number);
  const luminance = ([r, g, b]) => [r, g, b].map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
  const contrast = (a, b) => { const [x, y] = [luminance(rgb(a)), luminance(rgb(b))].sort((p, q) => q - p); return (x + .05) / (y + .05); };
  const mix = (a, b, t) => { const [x, y] = [rgb(a), rgb(b)]; return `rgb(${x.map((v, i) => Math.round(v * (1 - t) + y[i] * t)).join(',')})`; };
  const alpha = (color, a) => `rgba(${rgb(color).join(',')},${a})`;
  const visible = node => { const box = node.getBoundingClientRect(); return box.width > 0 && box.height > 0; };

  // Saturation/lightness of an rgb() colour, to tell a real accent from black, white or grey ink.
  const tone = color => { const [r, g, b] = rgb(color).map(v => v / 255), max = Math.max(r, g, b), min = Math.min(r, g, b), light = (max + min) / 2; return { light, sat: max === min ? 0 : (max - min) / (1 - Math.abs(2 * light - 1)) }; };
  // The most used coloured ink, fill or border on the card (by painted area for fills, text length for ink).
  function vivid(doc) {
    const win = doc.defaultView, votes = new Map();
    const vote = (color, weight) => { const opacity = (color.match(/[\d.]+/g) || [])[3]; if (transparent(color) || (opacity !== undefined && Number(opacity) < .5)) return; const { light, sat } = tone(color); if (sat < .28 || light < .16 || light > .8) return; const key = rgb(color).join(','); votes.set(key, (votes.get(key) || 0) + weight); };
    for (const node of [...doc.body.querySelectorAll('*')].slice(0, 2500)) {
      // Buttons and icons often keep a widget's default colour rather than the design's.
      if (node.closest('#ht-opening,#blessing-box,button,svg')) continue;
      const style = win.getComputedStyle(node), box = node.getBoundingClientRect();
      if (!box.width || !box.height || style.visibility === 'hidden') continue;
      vote(style.backgroundColor, Math.min(box.width * box.height, 60000) / 400);
      if (parseFloat(style.borderTopWidth) > 0) vote(style.borderTopColor, box.width / 20);
      if (node.childNodes.length && [...node.childNodes].some(child => child.nodeType === 3 && child.textContent.trim())) vote(style.color, node.textContent.trim().length);
    }
    const best = [...votes].sort((a, b) => b[1] - a[1])[0];
    return best && best[1] >= 30 ? `rgb(${best[0]})` : '';
  }
  // Read the card's own look: display font and colour, body font and paper colour. The card itself shows, blurred, behind the envelope.
  function theme(doc) {
    const win = doc.defaultView;
    const texts = [...doc.querySelectorAll('[data-ht-fields]')].filter(node => !node.closest('#ht-envelope') && [...node.childNodes].every(child => child.nodeType === 3) && node.textContent.trim().length > 1 && visible(node));
    const weights = new Map(), inks = new Map();
    let display = null, size = 0;
    for (const node of texts) {
      const style = win.getComputedStyle(node), px = parseFloat(style.fontSize) || 0, text = node.textContent.trim();
      weights.set(style.fontFamily, (weights.get(style.fontFamily) || 0) + text.length);
      const ink = tone(style.color);
      if (ink.sat >= .1 && ink.light >= .12 && ink.light <= .8) inks.set(style.color, (inks.get(style.color) || 0) + text.length * px);
      if (px > size && text.length <= 40) { size = px; display = { fontFamily: style.fontFamily, color: style.color, node }; }
    }
    const body = [...weights].sort((a, b) => b[1] - a[1])[0]?.[0] || 'Georgia, serif';
    // The paper is the first painted background behind the card's headline (the envelope itself covers the viewport).
    let paper = '';
    for (let node = display?.node || doc.querySelector('[data-ht-fields]'); node && !paper; node = node.parentElement) {
      const color = win.getComputedStyle(node).backgroundColor; if (!transparent(color)) paper = color;
    }
    paper = paper || (transparent(win.getComputedStyle(doc.body).backgroundColor) ? 'rgb(253, 248, 244)' : win.getComputedStyle(doc.body).backgroundColor);
    // Prefer the card's coloured ink (even a muted taupe), then a coloured fill or border, then its headline colour.
    let accent = [...inks].sort((a, b) => b[1] - a[1])[0]?.[0] || vivid(doc) || display?.color || 'rgb(122, 74, 74)';
    if (contrast(accent, paper) < 2.6) accent = luminance(rgb(paper)) > .45 ? 'rgb(74, 52, 52)' : 'rgb(255, 250, 245)';
    return { display: display?.fontFamily || body, body, accent, paper, veil1: alpha(paper, .38), veil2: alpha(paper, .74) };
  }

  const css = `#ht-opening{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;overflow:hidden;font-family:var(--hto-body);color:var(--hto-accent);transition:opacity .6s ease 1.25s;-webkit-tap-highlight-color:transparent}
#ht-opening .hto-veil{position:absolute;inset:0;background:radial-gradient(circle at 50% 42%,var(--hto-veil1),var(--hto-veil2));-webkit-backdrop-filter:blur(9px) saturate(1.05);backdrop-filter:blur(9px) saturate(1.05)}
@supports not ((backdrop-filter:blur(1px)) or (-webkit-backdrop-filter:blur(1px))){#ht-opening .hto-veil{background:var(--hto-paper)}}
#ht-opening .hto-stage{position:relative;display:grid;justify-items:center;gap:16px;width:min(88vw,370px);text-align:center;transition:transform .7s cubic-bezier(.22,1,.36,1) 1.1s,opacity .5s ease 1.1s}
#ht-opening .hto-kicker{margin:0;font-size:11px;letter-spacing:.32em;text-transform:uppercase;opacity:.8}
#ht-opening .hto-names{margin:0;font:400 clamp(26px,8vw,36px)/1.15 var(--hto-display)}
#ht-opening .hto-date{margin:-8px 0 0;font-size:13px;letter-spacing:.12em;opacity:.85}
#ht-opening .hto-envelope{position:relative;width:100%;cursor:pointer;perspective:1100px;outline:none}
#ht-opening .hto-envelope canvas{position:absolute;display:block;pointer-events:none}
#ht-opening .hto-back{z-index:1}
#ht-opening .hto-letter{position:absolute;left:7%;right:7%;top:7%;bottom:10%;z-index:2;display:grid;place-content:center;gap:4px;padding:10px;border-radius:4px;background:var(--hto-paper);box-shadow:0 1px 4px rgba(0,0,0,.12);transition:transform .75s cubic-bezier(.22,1,.36,1) .55s}
#ht-opening .hto-letter span{font-size:10px;letter-spacing:.28em;text-transform:uppercase;opacity:.7}
#ht-opening .hto-letter strong{font:400 22px/1.15 var(--hto-display)}
#ht-opening .hto-front{z-index:3}
#ht-opening .hto-flap{z-index:5;transition:transform .6s cubic-bezier(.4,0,.2,1)}
#ht-opening .hto-to{position:absolute;left:12%;right:12%;bottom:9%;z-index:4;display:grid;gap:3px;pointer-events:none}
#ht-opening .hto-to span{font-size:10.5px;letter-spacing:.3em;text-transform:uppercase;opacity:.72}
#ht-opening .hto-to strong{font:400 26px/1.2 var(--hto-display);overflow-wrap:anywhere;text-wrap:balance}
#ht-opening .hto-to i{display:block;width:44%;height:1px;margin:4px auto 0;background:linear-gradient(90deg,transparent,currentColor,transparent);opacity:.45}
#ht-opening .hto-seal{position:absolute;left:50%;z-index:6;width:58px;height:58px;margin:-29px 0 0 -29px;display:grid;place-items:center;color:var(--hto-paper);font:400 18px/1 var(--hto-display);text-shadow:0 -1px 0 rgba(0,0,0,.25),0 1px 0 rgba(255,255,255,.25);transition:opacity .3s ease,transform .3s ease}
#ht-opening .hto-seal canvas{position:absolute;inset:0;z-index:-1}
#ht-opening .hto-open{min-height:44px;padding:11px 30px;border:1px solid var(--hto-accent);border-radius:999px;background:var(--hto-accent);color:var(--hto-paper);font:600 14px/1 var(--hto-body);letter-spacing:.08em;cursor:pointer;box-shadow:0 6px 18px rgba(40,24,24,.18)}
#ht-opening .hto-open:focus-visible,#ht-opening .hto-envelope:focus-visible{outline:2px solid var(--hto-accent);outline-offset:4px}
#ht-opening.is-opening .hto-seal{opacity:0;transform:scale(.5)}
#ht-opening.is-opening .hto-flap{transform:rotateX(178deg)}
#ht-opening.is-lifted .hto-flap{z-index:0}
#ht-opening.is-opening .hto-letter{transform:translateY(-58%)}
#ht-opening.is-opening .hto-to,#ht-opening.is-opening .hto-open{opacity:0;transition:opacity .25s}
#ht-opening.is-opening .hto-stage{transform:translateY(24px) scale(.97);opacity:0}
#ht-opening.is-opening{opacity:0;pointer-events:none}
.ht-guest-line{margin:-2px 0 14px;font-size:clamp(22px,7vw,30px);line-height:1.25;overflow-wrap:anywhere}
@media(prefers-reduced-motion:reduce){#ht-opening,#ht-opening *{transition-duration:.01ms!important;transition-delay:0s!important}}`;

  function el(doc, tag, className, text) { const node = doc.createElement(tag); if (className) node.className = className; if (text) node.textContent = text; return node; }
  const initials = names => names.split('&').map(part => part.trim()[0] || '').filter(Boolean).join('·') || '♥';

  // Envelope artwork, drawn on canvas in the card's own colours. Layers, back to front: inside of the
  // envelope, the letter (DOM), the pocket, the guest's name (DOM), the top flap, the wax seal.
  let grain = null;
  function paperGrain(doc) {
    if (grain) return grain;
    grain = doc.createElement('canvas'); grain.width = grain.height = 96;
    const ctx = grain.getContext('2d'); if (!ctx) return grain;
    const image = ctx.createImageData(96, 96);
    let seed = 7;
    for (let i = 0; i < image.data.length; i += 4) { seed = (seed * 16807) % 2147483647; const value = seed % 255; image.data[i] = image.data[i + 1] = image.data[i + 2] = value; image.data[i + 3] = 9 + (seed % 9); }
    ctx.putImageData(image, 0, 0);
    return grain;
  }
  function surface(doc, width, height) {
    const canvas = doc.createElement('canvas'), ratio = Math.min(doc.defaultView.devicePixelRatio || 1, 3);
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    canvas.style.width = width + 'px'; canvas.style.height = height + 'px';
    const ctx = canvas.getContext('2d'); if (ctx) ctx.scale(ratio, ratio);
    return { canvas, ctx };
  }
  const shade = (look, t) => mix(look.paper, look.accent, t);
  function texture(ctx, doc, width, height) {
    const pattern = ctx.createPattern(paperGrain(doc), 'repeat'); if (!pattern) return;
    ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = pattern; ctx.fillRect(0, 0, width, height); ctx.restore();
  }
  function rounded(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function drawBack(ctx, doc, look, w, h, pad) {
    ctx.save(); ctx.shadowColor = 'rgba(40,24,24,.28)'; ctx.shadowBlur = 26; ctx.shadowOffsetY = 14;
    rounded(ctx, pad, pad, w, h, 8); ctx.fillStyle = shade(look, .24); ctx.fill(); ctx.restore();
    ctx.save(); rounded(ctx, pad, pad, w, h, 8); ctx.clip();
    const inner = ctx.createLinearGradient(0, pad, 0, pad + h); inner.addColorStop(0, shade(look, .34)); inner.addColorStop(1, shade(look, .2));
    ctx.fillStyle = inner; ctx.fillRect(pad, pad, w, h); texture(ctx, doc, w + pad * 2, h + pad * 2); ctx.restore();
  }
  function drawFront(ctx, doc, look, w, h, pad) {
    const x = pad, y = pad;
    ctx.save(); rounded(ctx, x, y, w, h, 8); ctx.clip();
    const side = (from, to) => { const g = ctx.createLinearGradient(from, 0, to, 0); g.addColorStop(0, shade(look, .13)); g.addColorStop(1, shade(look, .07)); return g; };
    // Left and right flaps meet in the middle with soft creases.
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + w * .3, y + h * .28, x + w * .5 + 2, y + h * .48); ctx.lineTo(x, y + h); ctx.closePath(); ctx.fillStyle = side(x, x + w * .5); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + w, y); ctx.quadraticCurveTo(x + w * .7, y + h * .28, x + w * .5 - 2, y + h * .48); ctx.lineTo(x + w, y + h); ctx.closePath(); ctx.fillStyle = side(x + w, x + w * .5); ctx.fill();
    // The bottom flap carries the address, lit from above.
    ctx.save(); ctx.shadowColor = 'rgba(40,24,24,.16)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = -3;
    ctx.beginPath(); ctx.moveTo(x, y + h); ctx.quadraticCurveTo(x + w * .26, y + h * .5, x + w * .5, y + h * .38); ctx.quadraticCurveTo(x + w * .74, y + h * .5, x + w, y + h); ctx.closePath();
    const bottom = ctx.createLinearGradient(0, y + h * .38, 0, y + h); bottom.addColorStop(0, shade(look, .04)); bottom.addColorStop(1, shade(look, .1));
    ctx.fillStyle = bottom; ctx.fill(); ctx.restore();
    // A hairline in the card's accent just inside the bottom flap.
    ctx.beginPath(); ctx.moveTo(x + 12, y + h - 6); ctx.quadraticCurveTo(x + w * .27, y + h * .54, x + w * .5, y + h * .43); ctx.quadraticCurveTo(x + w * .73, y + h * .54, x + w - 12, y + h - 6);
    ctx.strokeStyle = alpha(look.accent, .28); ctx.lineWidth = 1; ctx.stroke();
    texture(ctx, doc, w + pad * 2, h + pad * 2); ctx.restore();
  }
  function drawFlap(ctx, doc, look, w, h, pad) {
    const x = pad, depth = h * .46;
    const outline = () => { ctx.beginPath(); ctx.moveTo(x, pad); ctx.lineTo(x + w, pad); ctx.quadraticCurveTo(x + w * .62, pad + depth * .78, x + w * .5, pad + depth); ctx.quadraticCurveTo(x + w * .38, pad + depth * .78, x, pad); ctx.closePath(); };
    ctx.save(); ctx.shadowColor = 'rgba(40,24,24,.22)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 5;
    outline(); const g = ctx.createLinearGradient(0, pad, 0, pad + depth); g.addColorStop(0, shade(look, .1)); g.addColorStop(1, shade(look, .17));
    ctx.fillStyle = g; ctx.fill(); ctx.restore();
    ctx.save(); outline(); ctx.clip(); texture(ctx, doc, w + pad * 2, depth + pad * 2); ctx.restore();
    ctx.beginPath(); ctx.moveTo(x + 10, pad + 3); ctx.quadraticCurveTo(x + w * .4, pad + depth * .72, x + w * .5, pad + depth - 8); ctx.quadraticCurveTo(x + w * .6, pad + depth * .72, x + w - 10, pad + 3);
    ctx.strokeStyle = alpha(look.accent, .22); ctx.lineWidth = 1; ctx.stroke();
  }
  function drawSeal(ctx, look, size) {
    const c = size / 2, base = look.accent;
    ctx.beginPath();
    for (let i = 0; i <= 64; i++) { const a = i / 64 * Math.PI * 2, r = c * (.9 + .06 * Math.sin(a * 9) + .03 * Math.sin(a * 23)); ctx[i ? 'lineTo' : 'moveTo'](c + r * Math.cos(a), c + r * Math.sin(a)); }
    const wax = ctx.createRadialGradient(c * .7, c * .6, c * .1, c, c, c);
    wax.addColorStop(0, mix(base, 'rgb(255,255,255)', .28)); wax.addColorStop(.55, base); wax.addColorStop(1, mix(base, 'rgb(0,0,0)', .32));
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.3)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2; ctx.fillStyle = wax; ctx.fill(); ctx.restore();
    ctx.beginPath(); ctx.arc(c, c, c * .62, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.beginPath(); ctx.arc(c, c, c * .66, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = 1; ctx.stroke();
  }
  // Shrink the guest's name until the whole address block fits the room left under the seal.
  function fitName(block, node, room) {
    let size = 26;
    node.style.fontSize = size + 'px';
    while (size > 13 && block.offsetHeight > room) { size -= 1; node.style.fontSize = size + 'px'; }
  }

  function mount(data, doc = document) {
    const style = el(doc, 'style'); style.id = 'ht-opening-style'; style.textContent = css; doc.head.append(style);
    const guest = data.guest || 'Quý khách';
    const existing = doc.getElementById('ht-envelope');
    if (existing) {
      // The captured envelope already carries the card's look; add the guest's name above its open button.
      const open = existing.querySelector('a[href="?open=1"]'), title = existing.querySelector('h1');
      if (!open || existing.querySelector('.ht-guest-line')) return;
      const line = el(doc, 'div', 'ht-guest-line', guest);
      const look = title && doc.defaultView.getComputedStyle(title);
      if (look) { line.style.fontFamily = look.fontFamily; line.style.color = look.color; }
      open.before(line);
      return;
    }
    if (!data.inject) return;
    const root = el(doc, 'div'); root.id = 'ht-opening'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', 'Thiệp mời');
    const stage = el(doc, 'div', 'hto-stage');
    const texts = data.texts || {};
    stage.append(el(doc, 'p', 'hto-kicker', texts.kicker || data.kicker || 'Trân trọng kính mời'));
    if (data.names) stage.append(el(doc, 'p', 'hto-names', data.names));
    if (data.date) stage.append(el(doc, 'p', 'hto-date', data.date));
    const envelope = el(doc, 'div', 'hto-envelope'); envelope.tabIndex = 0; envelope.setAttribute('role', 'button'); envelope.setAttribute('aria-label', 'Mở phong thư');
    const letter = el(doc, 'div', 'hto-letter'); letter.append(el(doc, 'span', '', texts.letter || 'Thiệp mời'), el(doc, 'strong', '', data.names || guest));
    const to = el(doc, 'div', 'hto-to'), name = el(doc, 'strong', '', guest);
    to.append(el(doc, 'span', '', texts.to || 'Kính gửi'), name, el(doc, 'i'));
    const seal = el(doc, 'div', 'hto-seal', initials(data.names || ''));
    const button = el(doc, 'button', 'hto-open', texts.button || 'Mở thiệp'); button.type = 'button';
    stage.append(envelope, button);
    root.append(el(doc, 'div', 'hto-veil'), stage);
    doc.body.append(root);

    let look = theme(doc);
    // Paint (or repaint after a resize or once the card settles) every layer at the envelope's current width.
    const paint = () => {
      const width = envelope.clientWidth || 340, height = Math.round(width * .72), pad = 28;
      envelope.style.height = height + 'px';
      for (const key of Object.keys(look)) root.style.setProperty(`--hto-${key}`, look[key]);
      const back = surface(doc, width + pad * 2, height + pad * 2), front = surface(doc, width + pad * 2, height + pad * 2), flap = surface(doc, width + pad * 2, height * .46 + pad * 2), wax = surface(doc, 58, 58);
      const layers = [[back, 'hto-back'], [front, 'hto-front'], [flap, 'hto-flap']].map(([layer, className]) => { layer.canvas.className = className; layer.canvas.style.left = layer.canvas.style.top = -pad + 'px'; return layer.canvas; });
      flap.canvas.style.transformOrigin = `50% ${pad}px`;
      if (back.ctx && front.ctx && flap.ctx) { drawBack(back.ctx, doc, look, width, height, pad); drawFront(front.ctx, doc, look, width, height, pad); drawFlap(flap.ctx, doc, look, width, height, pad); }
      if (wax.ctx) { drawSeal(wax.ctx, look, 58); seal.querySelector('canvas')?.remove(); seal.prepend(wax.canvas); }
      envelope.replaceChildren(layers[0], letter, layers[1], to, layers[2], seal);
      seal.style.top = Math.round(height * .46) + 'px';
      // Room for the address: below the seal, above the bottom margin.
      fitName(to, name, height * (1 - .46 - .09) - 29 - 8);
    };
    paint();
    // Some layouts hydrate after load; read the card's look again while the envelope is still shown.
    const refresh = () => { if (root.isConnected && !root.classList.contains('is-opening')) { look = theme(doc); paint(); } };
    for (const delay of [400, 1500, 3500]) setTimeout(refresh, delay);
    doc.fonts?.ready.then(refresh);
    doc.defaultView.addEventListener('resize', refresh);

    let done = false;
    const open = () => {
      if (done) return; done = true;
      const reduce = data.motion === false || doc.defaultView.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      if (reduce) { root.remove(); return; }
      root.classList.add('is-opening');
      setTimeout(() => root.classList.add('is-lifted'), 300);
      setTimeout(() => root.remove(), 1950);
    };
    button.addEventListener('click', open); envelope.addEventListener('click', open);
    // In the editor, clicking the envelope's wording selects it for editing instead of opening.
    if (data.editing) stage.addEventListener('click', event => {
      if (event.target.closest('.hto-open')) return;
      event.stopPropagation(); window.parent.postMessage({ type: 'ht:envelope' }, '*');
    }, true);
    envelope.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); } });
  }
  window.htEnvelope = { mount };
})();
