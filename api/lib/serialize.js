function serialize(document, omit = []) {
  const result = document.toObject ? document.toObject() : { ...document };
  result.id = String(result._id);
  delete result._id;
  delete result.__v;
  for (const key of omit) delete result[key];
  return result;
}

// The guest's recorded invitation is shown only while the card's plan includes it.
function publicGuest(guest, voice = false) {
  return {
    ...(voice && guest.voiceUrl ? { voiceUrl: guest.voiceUrl } : {}),
    code: guest.code,
    invitationName: guest.invitationName,
    status: guest.status,
    guestCount: guest.guestCount,
    joinGroup: guest.joinGroup,
    pickupPoint: guest.pickupPoint,
    room: guest.room
  };
}

module.exports = { serialize, publicGuest };
