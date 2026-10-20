import type { Wedding } from "../../lib/types";
import ImageField from "./ImageField";
import { Field } from "./Fields";
import { clientId } from "../../lib/sections";

export default function ImagesTab({ wedding: w, change }: { wedding: Wedding; change: (patch: Partial<Wedding>) => void; }) {
  const gallery = w.gallery;
  const update = (index: number, patch: Partial<Wedding["gallery"][number]>) => change({ gallery: gallery.map((item, i) => i === index ? { ...item, ...patch } : item) });
  const move = (index: number, target: number) => {
    if (target < 0 || target >= gallery.length) return;
    const copy = [...gallery];
    [copy[index], copy[target]] = [copy[target], copy[index]];
    change({ gallery: copy });
  };
  return <div className="editor-stack">
    <ImageField label="Ảnh bìa" value={w.coverImage} onChange={coverImage => change({ coverImage })} />
    <ImageField label="Ảnh chia sẻ (OG)" value={w.ogImage} onChange={ogImage => change({ ogImage })} />
    <ImageField label="Ảnh câu chuyện" value={w.story.image} onChange={image => change({ story: { ...w.story, image } })} />
    <h3>Bộ sưu tập ảnh
    </h3>
    {gallery.map((item, i) => <article className="editor-item" key={item.id}>
      <ImageField label={`Ảnh ${i + 1}`} value={item.url} onChange={url => update(i, { url })} />
      <Field label="Tiêu đề" value={item.title} onChange={title => update(i, { title })} />
      <Field label="Mô tả" value={item.desc} onChange={desc => update(i, { desc })} />
      <label className="checkbox-row">
        <input type="checkbox" checked={item.full} onChange={e => update(i, { full: e.target.checked })} /> Ảnh rộng
      </label>
      <div className="actions">
        <button onClick={() => move(i, i - 1)} disabled={i === 0}>↑
        </button>
        <button onClick={() => move(i, i + 1)} disabled={i === gallery.length - 1}>↓
        </button>
        <button onClick={() => change({ gallery: gallery.filter(g => g.id !== item.id) })}>Xóa ảnh
        </button>
      </div>
    </article>)}
    <button className="button-outline" onClick={() => change({ gallery: [...gallery, { id: clientId(), url: "", title: "", desc: "", full: false }] })}>Thêm ảnh
    </button>
  </div>;
}

