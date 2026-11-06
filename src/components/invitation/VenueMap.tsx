import { venueMap, type MapVenue } from '../../lib/venueMap';
import '../../styles/venue-map.css';

export default function VenueMap({ venue }: { venue: MapVenue }) {
  const map = venueMap(venue);
  if (!map.embedUrl && !map.openUrl) return null;
  return <section className="venue-map" aria-label="Bản đồ địa điểm tổ chức">
    <div className="venue-map-heading"><strong>{venue.name || 'Địa điểm tổ chức'}</strong>{venue.address && <p>{venue.address}</p>}</div>
    {map.embedUrl && <iframe className="venue-map-frame" title="Bản đồ địa điểm tổ chức" src={map.embedUrl} width="420" height="240" loading="lazy" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />}
    {map.openUrl && <a className="venue-map-link" href={map.openUrl} target="_blank" rel="noopener noreferrer">Mở Google Maps ↗</a>}
  </section>;
}
