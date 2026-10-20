function ogImageUrl(url) {
  if (!url) return url;
  return url.replace(
    /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)/i,
    '$1c_fill,w_1200,h_630,f_jpg,q_auto/'
  );
}

module.exports = { ogImageUrl };
