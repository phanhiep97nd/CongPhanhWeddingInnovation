function serialize(document, omit = []) {
  const result = document.toObject ? document.toObject() : { ...document };
  result.id = String(result._id);
  delete result._id;
  delete result.__v;
  for (const key of omit) delete result[key];
  return result;
}

function publicGuest(guest) {
  return {
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
