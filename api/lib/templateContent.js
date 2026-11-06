// Explicit bindings verified against Our Love Begins; never guess roles from text.
const templateId = 'tpl-07109f7b5da0fc5f';
const groups = {
  names: ['f33'], schedule: ['f57'], date: ['f58', 'f59', 'f106', 'f107'],
  dateText: ['f60'], venue: ['f101'], address: ['f102'], map: ['f103'],
  countdown: ['f37', 'f39', 'f41', 'f43'], calendar: Array.from({ length: 38 }, (_, index) => `f${61 + index}`)
};
// Each binding names the wedding information that produces it; the editor edits that information in place.
const sources = { names: 'names', schedule: 'schedule', date: 'schedule', countdown: 'schedule', calendar: 'schedule', dateText: 'dateText', venue: 'venue', address: 'venue', map: 'venue' };
const labels = { names: 'Tên cô dâu và chú rể', schedule: 'Ngày và giờ cưới', dateText: 'Ngày hiển thị', venue: 'Địa điểm' };
// Couple-name fields of the other wedding templates, derived from evidence in each layout by
// scripts/derive-name-bindings.mjs and committed as data; nothing is inferred while rendering.
const nameBindings = require('../data/template-name-bindings.json');
const clean = text => String(text || '').replace(/\s+/g, ' ').trim();
// Fill bound name fields from the wedding's couple; a card keeps its sample names until both partners are named.
function names(id, wedding) {
  const bound = nameBindings[id], couple = wedding?.couple;
  if (!bound || !couple || (wedding.invitationKind || 'wedding') !== 'wedding') return {};
  const short = { groom: clean(couple.groom || couple.groomFull), bride: clean(couple.bride || couple.brideFull) };
  if (!short.groom || !short.bride) return {};
  const full = { groom: clean(couple.groomFull || couple.groom), bride: clean(couple.brideFull || couple.bride) };
  const initial = (name, which) => (which === 'last' ? name.split(' ').at(-1) : name)[0] || '';
  const values = {};
  for (const [key, field] of Object.entries(bound.fields)) {
    const text = field.pattern.replace(/\{(groom|bride)(Full|Initial)?\}/g, (_, role, kind) => kind === 'Full' ? full[role] : kind === 'Initial' ? initial(short[role], field.initial) : short[role]);
    values[key] = field.upper ? text.toLocaleUpperCase('vi') : text;
  }
  return values;
}
// Calendars of every template, derived by scripts/derive-calendar-bindings.mjs: the day fields in order,
// the first weekday of the grid and the month labels next to it. They follow the wedding date and are not edited by hand.
const calendarBindings = require('../data/template-calendar-bindings.json');
const calendarKeys = id => (calendarBindings[id] || []).flatMap(entry => [...entry.days, ...(entry.labels || []).map(label => label.key)]);
const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
function weddingDate(wedding) {
  const date = wedding?.eventDate ? new Date(wedding.eventDate) : null;
  return date && Number.isFinite(date.getTime()) ? { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate(), weekday: date.getUTCDay() } : null;
}
function calendars(id, date) {
  const entries = calendarBindings[id];
  if (!entries || !date) return { values: {}, runtime: null };
  const values = {};
  for (const entry of entries) for (const label of entry.labels || []) {
    values[label.key] = label.pattern.replace(/\{(m|mm|yyyy|Month|MONTH|Mon|MON)\}/g, (_, token) => ({
      m: String(date.month), mm: String(date.month).padStart(2, '0'), yyyy: String(date.year),
      Month: monthNames[date.month - 1], MONTH: monthNames[date.month - 1].toUpperCase(), Mon: monthNames[date.month - 1].slice(0, 3), MON: monthNames[date.month - 1].slice(0, 3).toUpperCase()
    })[token]);
  }
  return { values, runtime: { year: date.year, month: date.month, day: date.day, calendars: entries.map(({ days, weekStart }) => ({ days, weekStart })) } };
}
// Text stating the wedding date (solar, weekday, time, lunar), derived by scripts/derive-date-bindings.mjs.
// These are soft: they follow the date entered in Thông tin until the owner edits that text on the card.
const dateBindings = require('../data/template-date-bindings.json');
const lunar = require('./lunar');
const weekNames = {
  vi: ['chủ nhật', 'thứ hai', 'thứ ba', 'thứ tư', 'thứ năm', 'thứ sáu', 'thứ bảy'],
  num: ['chủ nhật', 'thứ 2', 'thứ 3', 'thứ 4', 'thứ 5', 'thứ 6', 'thứ 7'],
  en: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
};
const withCase = (text, mode) => mode === 'U' ? text.toLocaleUpperCase('vi') : mode === 'L' ? text.toLocaleLowerCase('vi')
  : mode === 'T' ? text.split(' ').map(word => word[0].toLocaleUpperCase('vi') + word.slice(1)).join(' ') : text[0].toLocaleUpperCase('vi') + text.slice(1);
// The wedding time in the sample's style; without a time the sample's own time stays.
function clock(eventTime, style) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(eventTime || '');
  if (!match) return style.sample;
  let hours = Number(match[1]), suffix = '';
  if (style.meridiem) { suffix = hours >= 12 ? 'PM' : 'AM'; hours = hours % 12 || 12; if (style.meridiem === 'lower') suffix = suffix.toLowerCase(); }
  return (style.pad ? String(hours).padStart(2, '0') : String(hours)) + style.sep + match[2] + (suffix ? (style.gap ? ' ' : '') + suffix : '');
}
function softDates(id, wedding, date) {
  const bound = dateBindings[id];
  if (!bound || !date) return {};
  const moon = lunar.toLunar(date.day, date.month, date.year);
  const pad = value => String(value).padStart(2, '0');
  const plain = { d: date.day, dd: pad(date.day), m: date.month, mm: pad(date.month), yyyy: date.year, ld: moon.day, ldd: pad(moon.day), lm: moon.month, lmm: pad(moon.month) };
  const values = {};
  for (const [key, field] of Object.entries(bound.fields)) {
    const text = field.pattern.replace(/\{wd:(vi|num|en):([ULTS])\}|\{lyear:([ULTS])\}|\{(d|dd|m|mm|yyyy|ld|ldd|lm|lmm|time)\}/g, (_, form, wdCase, yearCase, token) =>
      form ? withCase(weekNames[form][date.weekday], wdCase) : yearCase ? withCase(lunar.yearName(moon.year), yearCase) : token === 'time' ? clock(wedding.eventTime, field.time) : String(plain[token]));
    values[key] = field.upper ? text.toLocaleUpperCase('vi') : text;
  }
  return values;
}
// Map buttons ("Chỉ đường", "Mở bản đồ trực tuyến") derived by scripts/derive-venue-bindings.mjs; they open the
// map link entered in Thông tin.
const venueBindings = require('../data/template-venue-bindings.json');
const mapLinks = (id, wedding) => venueBindings[id]?.map && /^https?:\/\//i.test(wedding?.venue?.mapUrl || '') ? { maps: venueBindings[id].map, mapUrl: wedding.venue.mapUrl } : null;
function bindingFor(id, key) {
  if (nameBindings[id]?.fields[key]) return { source: 'names', label: labels.names };
  if (calendarKeys(id).includes(key)) return { source: 'schedule', label: labels.schedule };
  if (id !== templateId) return undefined;
  const group = Object.keys(groups).find(group => groups[group].includes(key));
  return group ? { source: sources[group], label: labels[sources[group]] } : undefined;
}
function resolve(id, wedding) {
  const date = weddingDate(wedding);
  const calendar = calendars(id, date);
  const links = mapLinks(id, wedding);
  if (id !== templateId) return { values: { ...names(id, wedding), ...calendar.values }, soft: softDates(id, wedding, date), runtime: calendar.runtime || links ? { ...(calendar.runtime || {}), ...(links || {}) } : null };
  if (!wedding) return { values: {}, soft: {}, runtime: null };
  const values = { ...calendar.values };
  const groom = wedding.couple?.groomFull || wedding.couple?.groom || '';
  const bride = wedding.couple?.brideFull || wedding.couple?.bride || '';
  if (wedding.couple) values.f33 = [groom, bride].filter(Boolean).join('  &  ');
  if (wedding.venue) { values.f101 = wedding.venue.name || ''; values.f102 = wedding.venue.address || ''; }
  const { year, month, day } = date || {};
  const pad = value => String(value).padStart(2, '0');
  const weekday = date ? ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'][date.weekday] : '';
  if (date) {
    values.f58 = values.f59 = `${pad(day)}.${pad(month)}.${year}`;
    values.f106 = `${pad(day)} · ${pad(month)}`; values.f107 = String(year);
  } else { values.f58 = values.f59 = values.f106 = values.f107 = ''; }
  values.f57 = [wedding.eventTime, weekday].filter(Boolean).join(', ');
  // Do not retain a captured lunar date after the actual date changes.
  values.f60 = wedding.dateText || '';
  const [hours, minutes] = (wedding.eventTime || '00:00').split(':').map(Number);
  const target = date ? Date.UTC(year, month - 1, day, hours - 7, minutes) : null;
  const remaining = target ? Math.max(0, Math.floor((target - Date.now()) / 1000)) : 0;
  [Math.floor(remaining / 86400), Math.floor(remaining / 3600) % 24, Math.floor(remaining / 60) % 60, remaining % 60].forEach((value, index) => { values[groups.countdown[index]] = String(value); });
  return { values, soft: {}, runtime: { ...(calendar.runtime || {}), loveBegins: { target, mapUrl: wedding.venue?.mapUrl || '' } } };
}
// Rebuild each bound calendar grid for the wedding month: blank cells before day 1, one cell per day, and the
// sample's highlighted cell (heart, filled circle…) moved to the wedding day. Cells styled per weekday keep that style.
const calendarRuntime = `function htCalendar(spec,date){
  const nodes=spec.days.map(key=>document.querySelector('[data-ht-fields~="'+key+'"]')).filter(Boolean);
  if(nodes.length<28)return;
  let cell=nodes[0];while(cell.parentElement&&!cell.parentElement.contains(nodes[1]))cell=cell.parentElement;
  const grid=cell.parentElement;if(!grid)return;
  const cellOf=node=>{let item=node;while(item&&item.parentElement!==grid)item=item.parentElement;return item;};
  const dayCells=nodes.map(cellOf);if(dayCells.some(item=>!item))return;
  const children=[...grid.children],first=children.indexOf(dayCells[0]),last=children.indexOf(dayCells.at(-1));
  const isBlank=item=>!item.querySelector('[data-ht-fields]')&&!item.hasAttribute('data-ht-fields');
  let from=first;while(from>0&&isBlank(children[from-1]))from--;
  let to=last;while(to+1<children.length&&isBlank(children[to+1]))to++;
  const blank=children.slice(from,first).concat(children.slice(last+1,to+1))[0];
  const label=item=>[...item.querySelectorAll('[data-ht-fields]')].concat(item.hasAttribute('data-ht-fields')?[item]:[]).find(node=>/^\\d{1,2}$/.test(node.textContent.trim()));
  const signature=item=>{const copy=item.cloneNode(true);const text=label(copy);if(text)text.textContent='';return copy.outerHTML.replace(/ data-ht-fields="[^"]*"/g,'');};
  const groups=new Map();dayCells.forEach((item,index)=>{const key=signature(item);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(index);});
  const ranked=[...groups].sort((a,b)=>b[1].length-a[1].length),normal=dayCells[ranked[0][1][0]];
  const sampleOffset=first-from,special=ranked.find(([,list])=>list.length===1&&ranked.length>1),columns=new Map();
  for(const [,list] of ranked.slice(1)){if(list.length<2)continue;const cols=new Set(list.map(index=>(sampleOffset+index)%7));if(cols.size===1)columns.set([...cols][0],dayCells[list[0]]);}
  const offset=(new Date(Date.UTC(date.year,date.month-1,1)).getUTCDay()-spec.weekStart+7)%7;
  const count=new Date(Date.UTC(date.year,date.month,0)).getUTCDate();
  const fresh=[];
  for(let index=0;index<offset;index++){const item=blank?blank.cloneNode(true):normal.cloneNode(true);if(!blank){const text=label(item);if(text)text.textContent='';item.style.visibility='hidden';}fresh.push(item);}
  for(let day=1;day<=count;day++){
    const source=day===date.day&&special?dayCells[special[1][0]]:columns.get((offset+day-1)%7)||normal;
    const item=source.cloneNode(true),text=label(item);
    if(text){text.textContent=String(day);text.setAttribute('data-ht-fields',spec.days[Math.min(day,spec.days.length)-1]);}
    if(day===date.day&&!special&&text){text.style.borderRadius='50%';text.style.boxShadow='0 0 0 2px currentColor';}
    fresh.push(item);
  }
  const anchor=children[to+1]||null;children.slice(from,to+1).forEach(item=>item.remove());
  for(const item of fresh)grid.insertBefore(item,anchor);
}`;
function runtimeScript(data) {
  if (!data) return '';
  return `(()=>{
    const data=${JSON.stringify(data).replaceAll('<', '\\u003c')};
    const field=key=>document.querySelector('[data-ht-fields~="'+key+'"]');
    ${calendarRuntime}
    if(data.calendars&&data.year)for(const spec of data.calendars)htCalendar(spec,data);
    // The page around the sandboxed card opens map links (data-ht-href) in a new tab.
    if(data.maps)for(const key of data.maps){const link=field(key)?.closest('a');if(link)link.setAttribute('data-ht-href',data.mapUrl);}
    const love=data.loveBegins;if(!love)return;
    // Bounds come from this layout's fixed design coordinates, before canvas zoom.
    // Keep long names/venues inside their allocated space rather than over the next row.
    function fitText(){for(const [key,maxHeight] of [['f33',160],['f101',150],['f102',160],['f60',80]]){
      const node=field(key);if(!node)continue;
      const base=Number(node.dataset.originalFontSize)||parseFloat(getComputedStyle(node).fontSize);
      node.dataset.originalFontSize=String(base);node.style.fontSize=base+'px';
      let size=base;while(size>28&&(node.scrollHeight>maxHeight||node.scrollWidth>node.clientWidth+1)){size-=2;node.style.fontSize=size+'px';}
    }}
    fitText();document.fonts.ready.then(fitText);window.addEventListener('resize',fitText);
    const map=field('f103');if(map&&/^https?:\\/\\//i.test(love.mapUrl||''))map.setAttribute('data-ht-href',love.mapUrl);
    function tick(){const seconds=love.target?Math.max(0,Math.floor((love.target-Date.now())/1000)):0;
      [Math.floor(seconds/86400),Math.floor(seconds/3600)%24,Math.floor(seconds/60)%60,seconds%60].forEach((value,index)=>{const node=field(['f37','f39','f41','f43'][index]);if(node)node.textContent=String(value);});}
    tick();if(love.target)setInterval(tick,1000);
  })();`;
}
module.exports = { binding: bindingFor, resolve, runtimeScript };
