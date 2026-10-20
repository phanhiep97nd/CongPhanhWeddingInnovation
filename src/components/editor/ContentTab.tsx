import type { Wedding } from "../../lib/types";
import { Field } from "./Fields";
import { clientId } from "../../lib/sections";
import DressColors from "./DressColors";

export default function ContentTab({ wedding: w, change }: { wedding: Wedding; change: (patch: Partial<Wedding>) => void; }) {
  const timeline = w.timeline;
  const update = (index: number, patch: Partial<Wedding["timeline"][number]>) => change({ timeline: timeline.map((item, i) => i === index ? { ...item, ...patch } : item) });
  const move = (index: number, target: number) => {
    if (target < 0 || target >= timeline.length) return;
    const copy = [...timeline];
    [copy[index], copy[target]] = [copy[target], copy[index]];
    change({ timeline: copy });
  };
  return <div className="editor-stack">
    <Field label="Tiêu đề câu chuyện" value={w.story.title} onChange={title => change({ story: { ...w.story, title } })} />
    <Field label="Nội dung câu chuyện" value={w.story.body} textarea onChange={body => change({ story: { ...w.story, body } })} />
    <h3>Lịch trình
    </h3>
    {timeline.map((item, i) => <article key={item.id} className="editor-item">
      <Field label="Giờ" value={item.time} onChange={time => update(i, { time })} />
      <Field label="Tiêu đề" value={item.title} onChange={title => update(i, { title })} />
      <Field label="Mô tả" value={item.desc} onChange={desc => update(i, { desc })} />
      <div className="actions">
        <button onClick={() => move(i, i - 1)} disabled={i === 0}>↑
        </button>
        <button onClick={() => move(i, i + 1)} disabled={i === timeline.length - 1}>↓
        </button>
        <button onClick={() => change({ timeline: timeline.filter(t => t.id !== item.id) })}>Xóa
        </button>
      </div>
    </article>)}
    <button className="button-outline" onClick={() => change({ timeline: [...timeline, { id: clientId(), time: "", title: "", desc: "" }] })}>Thêm mốc thời gian
    </button>
    <Field label="Ghi chú trang phục" value={w.dressCode.note} textarea onChange={note => change({ dressCode: { ...w.dressCode, note } })} />
    <DressColors colors={w.dressCode.colors} wedding={w} onChange={colors => change({ dressCode: { ...w.dressCode, colors } })} />
  </div>;
}

