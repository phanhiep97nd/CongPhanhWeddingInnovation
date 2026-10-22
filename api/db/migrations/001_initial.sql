CREATE TABLE users (
  _id text PRIMARY KEY CHECK (_id ~ '^[a-f0-9]{24}$'),
  email text NOT NULL UNIQUE CHECK (email = lower(trim(email))),
  "passwordHash" text NOT NULL,
  name text NOT NULL CHECK (length(trim(name)) > 0),
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'locked')),
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE weddings (
  _id text PRIMARY KEY CHECK (_id ~ '^[a-f0-9]{24}$'),
  owner text NOT NULL REFERENCES users(_id),
  slug text NOT NULL UNIQUE CHECK (slug = lower(trim(slug)) AND length(slug) > 0),
  "slugAliases" jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_typeof("slugAliases") = 'array' AND jsonb_array_length("slugAliases") <= 5),
  plan text NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'basic', 'premium')),
  "planActivatedAt" timestamptz,
  template text NOT NULL DEFAULT 'classic' CHECK (template IN ('classic', 'minimal', 'hy3d')),
  "viewModes" jsonb NOT NULL DEFAULT '["3d","mixed","normal"]',
  "giftBox" jsonb NOT NULL DEFAULT '{"note":"","accounts":[]}',
  published boolean NOT NULL DEFAULT true,
  couple jsonb NOT NULL DEFAULT '{"groom":"","bride":"","groomFull":"","brideFull":""}',
  "eventDate" timestamptz,
  "eventTime" text NOT NULL DEFAULT '',
  "dateText" text NOT NULL DEFAULT '',
  venue jsonb NOT NULL DEFAULT '{"name":"","address":"","mapUrl":""}',
  "coverImage" text NOT NULL DEFAULT '',
  "ogImage" text NOT NULL DEFAULT '',
  story jsonb NOT NULL DEFAULT '{"title":"","body":"","image":""}',
  timeline jsonb NOT NULL DEFAULT '[]',
  gallery jsonb NOT NULL DEFAULT '[]',
  "musicUrl" text NOT NULL DEFAULT '',
  "zaloGroupLink" text NOT NULL DEFAULT '',
  "dressCode" jsonb NOT NULL DEFAULT '{"note":"","colors":[]}',
  sections jsonb NOT NULL DEFAULT '[]',
  "customSections" jsonb NOT NULL DEFAULT '[]',
  meta jsonb NOT NULL DEFAULT '{"title":"","description":""}',
  theme jsonb NOT NULL DEFAULT '{"primary":"#b76e79"}',
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX weddings_owner_updated ON weddings(owner, "updatedAt" DESC);
CREATE INDEX weddings_aliases ON weddings USING gin("slugAliases");

CREATE TABLE guests (
  _id text PRIMARY KEY CHECK (_id ~ '^[a-f0-9]{24}$'),
  wedding text NOT NULL REFERENCES weddings(_id) ON DELETE CASCADE,
  code text,
  name text NOT NULL CHECK (length(trim(name)) > 0),
  "invitationName" text NOT NULL CHECK (length(trim("invitationName")) > 0),
  phone text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'yes', 'no')),
  "guestCount" integer NOT NULL DEFAULT 1 CHECK ("guestCount" BETWEEN 0 AND 20),
  "joinGroup" boolean NOT NULL DEFAULT false,
  "pickupPoint" text NOT NULL DEFAULT '',
  room text NOT NULL DEFAULT '',
  note text NOT NULL DEFAULT '',
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  UNIQUE (wedding, code)
);
CREATE INDEX guests_wedding_created ON guests(wedding, "createdAt" DESC);
CREATE INDEX guests_wedding_status ON guests(wedding, status);

CREATE TABLE photos (
  _id text PRIMARY KEY CHECK (_id ~ '^[a-f0-9]{24}$'),
  wedding text NOT NULL REFERENCES weddings(_id) ON DELETE CASCADE,
  url text NOT NULL CHECK (length(url) > 0),
  caption text NOT NULL DEFAULT '',
  author text NOT NULL DEFAULT 'Ẩn danh',
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX photos_wedding_created ON photos(wedding, "createdAt" DESC);

CREATE TABLE orders (
  _id text PRIMARY KEY CHECK (_id ~ '^[a-f0-9]{24}$'),
  "orderCode" bigint NOT NULL UNIQUE CHECK ("orderCode" BETWEEN 1 AND 9007199254740990),
  wedding text REFERENCES weddings(_id) ON DELETE SET NULL,
  "user" text NOT NULL REFERENCES users(_id),
  plan text NOT NULL CHECK (plan IN ('free', 'basic', 'premium')),
  amount integer NOT NULL CHECK (amount >= 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled', 'expired')),
  method text NOT NULL DEFAULT 'payos' CHECK (method IN ('payos', 'manual')),
  "checkoutUrl" text NOT NULL DEFAULT '',
  "qrCode" text NOT NULL DEFAULT '',
  "paymentLinkId" text NOT NULL DEFAULT '',
  note text NOT NULL DEFAULT '',
  "paidAt" timestamptz,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX orders_wedding_created ON orders(wedding, "createdAt" DESC);
CREATE INDEX orders_user ON orders("user");
CREATE INDEX orders_status_paid ON orders(status, "paidAt");

CREATE TABLE settings (
  _id text PRIMARY KEY DEFAULT 'global' CHECK (_id = 'global'),
  prices jsonb NOT NULL DEFAULT '{"basic":30000,"premium":99000}',
  "freeGuestLimit" integer NOT NULL DEFAULT 10 CHECK ("freeGuestLimit" > 0),
  "freeGalleryLimit" integer NOT NULL DEFAULT 6 CHECK ("freeGalleryLimit" > 0),
  "paidGalleryLimit" integer NOT NULL DEFAULT 50 CHECK ("paidGalleryLimit" > 0),
  "freeExpiryDays" integer NOT NULL DEFAULT 30 CHECK ("freeExpiryDays" > 0)
);
