// Explicit bindings verified against Our Love Begins; never guess roles from text.
const templateId = 'tpl-07109f7b5da0fc5f';
const groups = {
  names: ['f33'], schedule: ['f57'], date: ['f58', 'f59', 'f106', 'f107'],
  dateText: ['f60'], venue: ['f101'], address: ['f102'], map: ['f103'],
  countdown: ['f37', 'f39', 'f41', 'f43'], calendar: Array.from({ length: 38 }, (_, index) => `f${61 + index}`)
};
const labels = { names: 'Tên cô dâu và chú rể', schedule: 'Ngày và giờ làm lễ', date: 'Ngày cưới', dateText: 'Ngày hiển thị', venue: 'Tên địa điểm', address: 'Địa chỉ', map: 'Liên kết bản đồ', countdown: 'Ngày và giờ làm lễ', calendar: 'Ngày cưới' };
function binding(id, key) {
  if (id !== templateId) return undefined;
  const group = Object.keys(groups).find(group => groups[group].includes(key));
  return group ? { label: labels[group], tab: 'info' } : undefined;
}
function resolve(id, wedding) {
  if (id !== templateId || !wedding) return { values: {}, runtime: null };
  const values = {};
  const groom = wedding.couple?.groomFull || wedding.couple?.groom || '';
  const bride = wedding.couple?.brideFull || wedding.couple?.bride || '';
  if (wedding.couple) values.f33 = [groom, bride].filter(Boolean).join('  &  ');
  if (wedding.venue) { values.f101 = wedding.venue.name || ''; values.f102 = wedding.venue.address || ''; }
  let date = wedding.eventDate ? new Date(wedding.eventDate) : null;
  if (date && !Number.isFinite(date.getTime())) date = null;
  const year = date?.getUTCFullYear(), month = date ? date.getUTCMonth() + 1 : null, day = date?.getUTCDate();
  const pad = value => String(value).padStart(2, '0');
  const weekday = date ? ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'][date.getUTCDay()] : '';
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
  return { values, runtime: { year, month, day, target, mapUrl: wedding.venue?.mapUrl || '' } };
}
function runtimeScript(data) {
  if (!data) return '';
  return `(()=>{
    const data=${JSON.stringify(data).replaceAll('<', '\\u003c')};
    const field=key=>document.querySelector('[data-ht-fields~="'+key+'"]');
    // Bounds come from this layout's fixed design coordinates, before canvas zoom.
    // Keep long names/venues inside their allocated space rather than over the next row.
    function fitText(){for(const [key,maxHeight] of [['f33',160],['f101',150],['f102',160],['f60',80]]){
      const node=field(key);if(!node)continue;
      const base=Number(node.dataset.originalFontSize)||parseFloat(getComputedStyle(node).fontSize);
      node.dataset.originalFontSize=String(base);node.style.fontSize=base+'px';
      let size=base;while(size>28&&(node.scrollHeight>maxHeight||node.scrollWidth>node.clientWidth+1)){size-=2;node.style.fontSize=size+'px';}
    }}
    fitText();document.fonts.ready.then(fitText);window.addEventListener('resize',fitText);
    const grid=field('f61')?.closest('.template-three');
    if(grid){
      const heart=grid.querySelector('.heart-date')?.cloneNode(true);grid.replaceChildren();
      if(data.year){
        const offset=(new Date(Date.UTC(data.year,data.month-1,1)).getUTCDay()+6)%7;
        const count=new Date(Date.UTC(data.year,data.month,0)).getUTCDate();
        for(let index=0;index<offset+count;index++){
          const cell=document.createElement('div'),label=document.createElement('div');
          if(index<offset)cell.className='empty';
          else {const day=index-offset+1;label.textContent=String(day);label.setAttribute('data-ht-fields','f'+(60+day));
            if(day===data.day){label.className='colorF';cell.setAttribute('data-selected-date','true');if(heart)cell.append(heart);}}
          cell.append(label);grid.append(cell);
        }
      }
    }
    const map=field('f103');if(map){map.setAttribute('href',data.mapUrl||'#');map.setAttribute('target','_blank');map.setAttribute('rel','noopener noreferrer');}
    function tick(){const seconds=data.target?Math.max(0,Math.floor((data.target-Date.now())/1000)):0;
      [Math.floor(seconds/86400),Math.floor(seconds/3600)%24,Math.floor(seconds/60)%60,seconds%60].forEach((value,index)=>{const node=field(['f37','f39','f41','f43'][index]);if(node)node.textContent=String(value);});}
    tick();if(data.target)setInterval(tick,1000);
  })();`;
}
module.exports = { binding, resolve, runtimeScript };
