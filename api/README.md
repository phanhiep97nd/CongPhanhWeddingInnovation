# Wedding API

Run `npm ci` in `api/`, copy `.env.example` to `.env`, and set `DATABASE_URL` (PostgreSQL) and `JWT_SECRET` (required). Use Node.js 22+. Set `ALLOWED_ORIGINS` (comma-separated frontend origins), `PORT` (default 3001), and `SITE_ORIGIN` for invitation/payment URLs. `MONGO_URI` is no longer used. Home deployment uses a private PostgreSQL Docker service; see [home server setup](../docs/HOME_SERVER_SETUP.md).

The API applies versioned SQL migrations on startup under a transaction/advisory lock. Use `npm run db:migrate` to apply them separately. Relational fields use foreign keys and flexible wedding content uses JSONB. API IDs and response formats are preserved. Payment confirmation and plan activation commit atomically. Database tables are created in the PostgreSQL URL's default search path; use a dedicated database for this app.

Set `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, and `PAYOS_CHECKSUM_KEY` to enable checkout. On the home domain register `https://hythiep.net/api/payos/webhook`. `ADMIN_EMAILS` promotes matching emails on register/login. `SEED_PASSWORD` is only for demo seed data; do not seed production.

Scripts: `npm start`, `npm run dev`, `npm test`, `npm run seed`, `npm run db:migrate`, `npm run db:import-mongo -- /export/directory [--apply]`, `npm run make-admin -- <email>`.

Tests use isolated in-memory PostgreSQL through PGlite (no MongoDB process or production database). Import defaults to a rollback-only dry run and requires an empty target; see [data migration](../docs/POSTGRESQL_MIGRATION.md). Back up PostgreSQL with `pg_dump` and validate restoration before schema changes; returning to older MongoDB code requires a separate cutover plan.

Authenticated endpoints require `Authorization: Bearer <token>`:

- `POST /auth/register`, `POST /auth/login`, `GET /auth/me`
- `GET /weddings`, `GET /weddings/slug-available`, `POST /weddings`
- `GET|PUT|DELETE /weddings/:id`
- `GET /weddings/:id/preview-meta?g=<code>` (owner preview, including unpublished weddings)
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

Wedding `eventTime` is an optional `HH:mm` string (24-hour time) and may be cleared with `''`.
It is editable on wedding create/update and returned in owner and public wedding responses.
The `meta.title` and `meta.description` fields are templates. Available placeholders are
`{khach}` (guest invitation name, or `bạn`), `{chure}`, `{codau}`, `{ngay}` (Vietnamese
date or `dateText`), `{thu}` (Vietnamese weekday), `{gio}` (`eventTime`), `{diadiem}`,
and `{diachi}`. Unknown placeholders are left unchanged. Guest names are included in
preview titles even when an owner template omits `{khach}`. The public metadata route
requires a published, unexpired wedding; the owner preview route works before publishing.

Cloudinary preview images are cropped to 1200 × 630 and display `Thân mời <guest name>`.
Set `OG_GUEST_OVERLAY=off` to disable the text layer, `OG_FONT` to select its Cloudinary
font (default `Roboto`), and `BRAND_NAME` to set `siteName` (default `Thiệp Cưới`).
