export function parseBulkGuests(text: string) {
  return text.split(/\r?\n/).map(line => {
    const [invitationName = '', name = '', phone = ''] = line.split('|').map(part => part.trim());
    return { invitationName, ...(name ? { name } : {}), ...(phone ? { phone } : {}) };
  }).filter(g => g.invitationName);
}
