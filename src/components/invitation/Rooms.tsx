import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
export default function Rooms({ slug, refresh }: { slug: string; refresh: number }) { const [rooms, setRooms] = useState<{ invitationName: string; room: string }[]>([]); useEffect(() => { api<{ invitationName: string; room: string }[]>(`/public/weddings/${encodeURIComponent(slug)}/rooms`).then(setRooms).catch(() => {}); }, [slug, refresh]); return <section className="invite-section white-section" id="rooms"><span className="eyebrow">Nghỉ ngơi</span><h2>Phòng nghỉ</h2>{rooms.length ? <div className="room-list">{rooms.map((row, i) => <div key={i}><span>{row.invitationName}</span><strong>{row.room || 'Đang sắp xếp'}</strong></div>)}</div> : <p>Thông tin phòng nghỉ sẽ được cập nhật tại đây.</p>}</section>; }

