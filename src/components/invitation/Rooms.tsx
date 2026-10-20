import { useEffect, useState } from "react";
import { api } from "../../lib/api";

interface RoomRow {
  invitationName: string;
  room: string;
}

export function RoomTable({ rooms }: { rooms: RoomRow[] }) {
  if (rooms.length === 0) {
    return <p>Thông tin phòng nghỉ sẽ được cập nhật tại đây.</p>;
  }

  return (
    <div className="room-list" role="table" aria-label="Danh sách phòng nghỉ">
      <div role="row" className="room-list-head"><strong role="columnheader">Khách mời</strong><strong role="columnheader">Phòng</strong></div>
      {rooms.map((row, index) => (
        <div role="row" key={`${row.invitationName}-${index}`}>
          <span role="cell">{row.invitationName}</span>
          <strong role="cell">{row.room || "Đang sắp xếp"}</strong>
        </div>
      ))}
    </div>
  );
}

export default function Rooms({ slug, refresh }: { slug: string; refresh: number }) {
  const [rooms, setRooms] = useState<RoomRow[]>([]);

  useEffect(() => {
    let active = true;
    api<RoomRow[]>(`/public/weddings/${encodeURIComponent(slug)}/rooms`)
      .then((rows) => { if (active) setRooms(rows); })
      .catch(() => {});
    return () => { active = false; };
  }, [slug, refresh]);

  return (
    <section className="invite-section white-section" id="rooms">
      <h2>Phòng nghỉ</h2>
      <RoomTable rooms={rooms} />
    </section>
  );
}
