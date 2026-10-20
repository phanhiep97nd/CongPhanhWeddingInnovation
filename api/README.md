# Wedding API

Run `npm install` in `api/`, then set `MONGO_URI` and `JWT_SECRET` (required), `ALLOWED_ORIGINS` (comma-separated frontend origins), `PORT` (default 3001), `API_ORIGIN` for Vercel middleware, and `SITE_ORIGIN` for invite URLs in metadata. `LEGACY_OWNER_EMAIL` is required for migration; `SEED_PASSWORD` sets the demo password (default `demo12345`).

Scripts: `npm start`, `npm run dev`, `npm test`, `npm run seed`, `npm run migrate:legacy`.

Authenticated endpoints require `Authorization: Bearer <token>`:

- `POST /auth/register`, `POST /auth/login`, `GET /auth/me`
- `GET /weddings`, `GET /weddings/slug-available`, `POST /weddings`
- `GET|PUT|DELETE /weddings/:id`
- `GET|POST /weddings/:id/guests`, `POST /weddings/:id/guests/bulk`
- `PUT|DELETE /weddings/:id/guests/:guestId`, `GET /weddings/:id/stats`
- `GET /weddings/:id/photos`, `DELETE /weddings/:id/photos/:photoId`

Public endpoints:

- `GET /public/weddings/:slug`
- `GET /public/weddings/:slug/guests/:code`, `PUT /public/weddings/:slug/guests/:code/rsvp`
- `POST /public/weddings/:slug/register`, `GET /public/weddings/:slug/rooms`
- `GET|POST /public/weddings/:slug/photos`, `GET /public/weddings/:slug/meta?g=<code>`

The frontend uses `/api` as a proxy prefix. The API routes above omit that prefix.

For crawler requests to `/w/:slug` or `/w/:slug/:code`, Vercel middleware fetches the
metadata and `/index.html` together, replaces the shell's social tags, and returns the
complete SPA. This also keeps the page usable in Zalo's in-app browser. If the shell
cannot be fetched, it returns a minimal preview page; if metadata cannot be fetched,
it inserts generic preview tags into the shell.
