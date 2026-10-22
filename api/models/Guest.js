const Guest = require('../db/model').model('Guest');
const db = require('../db');
Guest.stats = async wedding => (await db.query(`
  SELECT count(*)::int AS total,
    count(*) FILTER (WHERE status = 'yes')::int AS yes,
    count(*) FILTER (WHERE status = 'no')::int AS no,
    count(*) FILTER (WHERE status = 'pending')::int AS pending,
    coalesce(sum("guestCount") FILTER (WHERE status = 'yes'), 0)::int AS attendees
  FROM guests WHERE wedding = $1`, [wedding])).rows[0];
module.exports = Guest;
