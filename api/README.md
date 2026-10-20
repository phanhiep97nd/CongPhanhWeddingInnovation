# Wedding API

Run `npm install` in `api/`, then set `MONGO_URI` and `JWT_SECRET` (required), `ALLOWED_ORIGINS` (comma-separated frontend origins), `PORT` (default 3001), `API_ORIGIN` for Vercel middleware, and `SITE_ORIGIN` for invite URLs, payment returns, and cancellations. Set `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, and `PAYOS_CHECKSUM_KEY` to enable checkout. Register `<API>/payos/webhook` as the webhook URL in the PayOS dashboard. `ADMIN_EMAILS` is a comma-separated list promoted to admin at registration or login. `LEGACY_OWNER_EMAIL` is required for migration; `SEED_PASSWORD` sets the demo password (default `demo12345`).

Scripts: `npm start`, `npm run dev`, `npm test`, `npm run seed`, `npm run migrate:legacy`, `npm run make-admin -- <email>`.

Authenticated endpoints require `Authorization: Bearer <token>`:

- `POST /auth/register`, `POST /auth/login`, `GET /auth/me`
- `GET /weddings`, `GET /weddings/slug-available`, `POST /weddings`
- `GET|PUT|DELETE /weddings/:id`
- `GET|POST /weddings/:id/guests`, `POST /weddings/:id/guests/bulk`
- `PUT|DELETE /weddings/:id/guests/:guestId`, `GET /weddings/:id/stats`
- `GET /weddings/:id/photos`, `DELETE /weddings/:id/photos/:photoId`
- `POST|GET /weddings/:id/orders`, `POST /weddings/:id/orders/:orderCode/sync`

Admin endpoints require an admin bearer token:

- `GET /admin/stats`
- `GET /admin/users`, `GET|PATCH /admin/users/:id`
- `PATCH /admin/weddings/:id/plan`
- `GET /admin/orders`, `POST /admin/orders/:orderCode/mark-paid`
- `GET|PUT /admin/settings`

Public endpoints:

- `GET /public/weddings/:slug`
- `GET /public/weddings/:slug/guests/:code`, `PUT /public/weddings/:slug/guests/:code/rsvp`
- `POST /public/weddings/:slug/register`, `GET /public/weddings/:slug/rooms`
- `GET|POST /public/weddings/:slug/photos`, `GET /public/weddings/:slug/meta?g=<code>`
- `GET /public/pricing`, `POST /payos/webhook`

Free weddings get a four-character slug suffix on creation. Free guests and gallery entries are limited by admin settings. Basic unlocks unlimited guests, a larger gallery, Excel export, guest QR, and removes branding. Premium also unlocks gift box, photo wall, custom music, permanent invitations, custom slugs, and premium templates. Plan paywalls return HTTP 402 with `code: "PLAN_REQUIRED"`. Expired invitations return HTTP 410 with `code: "EXPIRED"` on public routes.

The frontend uses `/api` as a proxy prefix. The API routes above omit that prefix.

For crawler requests to `/w/:slug` or `/w/:slug/:code`, Vercel middleware fetches the
metadata and `/index.html` together, replaces the shell's social tags, and returns the
complete SPA. This also keeps the page usable in Zalo's in-app browser. If the shell
cannot be fetched, it returns a minimal preview page; if metadata cannot be fetched,
it inserts generic preview tags into the shell.
