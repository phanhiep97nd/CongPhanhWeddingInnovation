// Reuse the captured CineLove blessing-box DOM/CSS from thiep-cuoi-2.
// This one DOM owner runs both in sandboxed templates and native invitation shells.
(() => {
  const scope = 'jsx-3173425662';
  const samples = [
    { id: 'sample-1', author: 'Đức', message: '🌟 Chúc mừng hạnh phúc lứa đôi!' },
    { id: 'sample-2', author: 'Ngọc Anh', message: '🌟 Chúc mừng hạnh phúc lứa đôi!' },
    { id: 'sample-3', author: 'Tùng', message: '💖 Mãi mãi hạnh phúc bên nhau!' },
    { id: 'sample-4', author: 'Hoàng Dũng', message: '🌟 Chúc mừng hạnh phúc lứa đôi!' },
    { id: 'sample-5', author: 'Trung', message: '💖 Mãi mãi hạnh phúc bên nhau!' },
  ];
  const css = `#blessing-box.jsx-3173425662{display:flex;overflow:hidden;z-index:1000;height:180px;position:absolute;width:285px;bottom:58px;left:16px;transition:opacity .3s ease-in-out;-webkit-mask-image:linear-gradient(to bottom,transparent 0,#000 28px);mask-image:linear-gradient(to bottom,transparent 0,#000 28px);-webkit-touch-callout:none;user-select:none;-webkit-tap-highlight-color:transparent;pointer-events:none}.blessing-offset.jsx-3173425662{width:100%;padding-top:40px}.blessing-track.jsx-3173425662{will-change:transform}.blessing-track[data-running].jsx-3173425662{animation-name:blessingRise;animation-timing-function:linear;animation-iteration-count:infinite}@keyframes blessingRise{from{transform:translate3d(0,0,0)}to{transform:translate3d(0,-50%,0)}}.blessing-copy.jsx-3173425662{display:flex;flex-direction:column;align-items:flex-start;gap:7px;padding-bottom:7px;min-height:180px;box-sizing:border-box}.blessing-message.jsx-3173425662{font-size:11px;color:white;min-height:28px;max-width:100%;line-height:14px;border-radius:7px;padding:2px 10px;display:flex;text-align:left;align-items:center;justify-content:center;background:rgba(225,117,117,.5);user-select:none;-webkit-tap-highlight-color:transparent}
  /* Fit the original display above the shared two-action toolbar. */
  #blessing-box.jsx-3173425662{bottom:50px;max-width:calc(100% - 32px);font-family:Arial,sans-serif;visibility:visible}
  #blessing-box[hidden]{display:none!important}.blessing-text.jsx-3173425662{overflow-wrap:anywhere}
  @media(prefers-reduced-motion:reduce){#blessing-box .blessing-track{animation:none!important}}`;
  function mount(root, { embedded = false } = {}) {
    const doc = root.ownerDocument;
    if (!doc.getElementById('ht-blessing-style')) {
      const style = doc.createElement('style'); style.id = 'ht-blessing-style'; style.textContent = css; doc.head.append(style);
    }
    const existing = [...root.querySelectorAll('#blessing-box')];
    const box = existing.shift() || doc.createElement('div');
    existing.forEach(node => node.remove());
    box.id = 'blessing-box'; box.className = scope; box.hidden = true;
    box.style.position = embedded ? 'fixed' : 'absolute';
    box.setAttribute('aria-hidden', 'true');
    const create = (tag, name) => { const node = doc.createElement(tag); node.className = `${scope} ${name}`; return node; };
    const offset = create('div', 'blessing-offset'), track = create('div', 'blessing-track');
    track.setAttribute('data-running', 'true'); track.style.animationDuration = '6s';
    offset.append(track); box.replaceChildren(offset); root.append(box);
    function set(values) {
      if (!Array.isArray(values)) return;
      const wishes = values.slice(0, 50).filter(value => value && typeof value.author === 'string' && value.author.length <= 100 && typeof value.message === 'string' && value.message.length <= 500);
      const fragment = doc.createDocumentFragment();
      for (let copy = 0; copy < 2; copy++) {
        const list = create('div', 'blessing-copy');
        for (const wish of wishes) {
          const item = create('div', 'blessing-message'), text = create('span', 'blessing-text'), name = create('strong', '');
          name.textContent = wish.author;
          text.append(name, doc.createTextNode(`: ${wish.message}`)); item.append(text); list.append(item);
        }
        fragment.append(list);
      }
      track.replaceChildren(fragment); box.hidden = wishes.length === 0;
      track.style.animationDuration = `${Math.max(6, wishes.length * 1.2)}s`;
    }
    const receive = event => { if (event.source === window.parent && event.data?.type === 'ht:blessings') set(event.data.wishes); };
    const visibility = () => { track.style.animationPlayState = doc.hidden ? 'paused' : 'running'; };
    doc.addEventListener('visibilitychange', visibility); visibility();
    if (embedded) { window.addEventListener('message', receive); window.parent.postMessage({ type: 'ht:blessings-ready' }, '*'); }
    return { set, destroy() { doc.removeEventListener('visibilitychange', visibility); window.removeEventListener('message', receive); box.remove(); } };
  }
  window.htBlessings = { mount, samples };
})();
