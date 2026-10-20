function personalizedOgImage(url, guestName) {
  if (!url) return url;

  const prefix = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)/i;
  if (!prefix.test(url)) return url;

  let transformations = 'c_fill,g_auto,w_1200,h_630,f_jpg,q_auto/';
  if (guestName && process.env.OG_GUEST_OVERLAY !== 'off') {
    const name = Array.from(guestName).slice(0, 40).join('');
    const label = encodeURIComponent(`Thân mời ${name}`)
      .replace(/%2C/gi, '%252C')
      .replace(/%2F/gi, '%252F');
    const font = process.env.OG_FONT || 'Roboto';
    // Position only in fl_layer_apply (repeating it on the layer rendered the text twice), and a soft
    // dark drop shadow keeps white text readable on bright photos. Verified against Cloudinary's demo cloud.
    transformations += `l_text:${font}_58_bold:${label},co_rgb:FFFFFF/e_shadow:60,x_0,y_3,co_rgb:000000/fl_layer_apply,g_south,y_60/`;
  }
  return url.replace(prefix, `$1${transformations}`);
}

function ogImageUrl(url) {
  return personalizedOgImage(url, '');
}

module.exports = { personalizedOgImage, ogImageUrl };
