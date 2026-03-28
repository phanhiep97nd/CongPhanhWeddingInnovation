export const config = {
  matcher: ['/'],
}

const OG_BOTS =
  /facebookexternalhit|Facebot|Twitterbot|WhatsApp|TelegramBot|Slackbot|Discordbot|Zalo|LinkedInBot|Pinterest|Googlebot|bingbot|Applebot/i

export default function middleware(request) {
  const ua = request.headers.get('user-agent') ?? ''
  if (!OG_BOTS.test(ua)) return // pass through for regular users

  const url = new URL(request.url)

  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <title>Công &amp; Ph.Anh — Private Wedding 03.04.2026</title>
  <meta name="description" content="Trân trọng kính mời bạn đến chung vui trong ngày trọng đại của Phương Anh &amp; Minh Công — 03/04/2026 tại Aman Villa." />
  <meta property="og:type"        content="website" />
  <meta property="og:site_name"   content="Công &amp; Ph.Anh Wedding" />
  <meta property="og:url"         content="${url.href}" />
  <meta property="og:title"       content="Công &amp; Ph.Anh — Private Wedding 03.04.2026" />
  <meta property="og:description" content="Trân trọng kính mời bạn đến chung vui trong ngày trọng đại của Phương Anh &amp; Minh Công — 03/04/2026 tại Aman Villa." />
  <meta property="og:image"       content="https://congphanh.vercel.app/images/og-image.jpg" />
  <meta property="og:image:width"  content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt"   content="Phương Anh &amp; Minh Công Wedding" />
  <meta property="og:locale"      content="vi_VN" />
  <meta name="twitter:card"        content="summary_large_image" />
  <meta name="twitter:title"       content="Công &amp; Ph.Anh — Private Wedding 03.04.2026" />
  <meta name="twitter:description" content="Trân trọng kính mời bạn đến chung vui trong ngày trọng đại của Phương Anh &amp; Minh Công — 03/04/2026 tại Aman Villa." />
  <meta name="twitter:image"       content="https://congphanh.vercel.app/images/og-image.jpg" />
</head>
<body></body>
</html>`

  return new Response(html, {
    headers: { 'content-type': 'text/html; charset=utf-8' },
  })
}
