CREATE TABLE wishes (
  _id text PRIMARY KEY CHECK (_id ~ '^[a-f0-9]{24}$'),
  wedding text NOT NULL REFERENCES weddings(_id) ON DELETE CASCADE,
  author text NOT NULL CHECK (length(trim(author)) BETWEEN 1 AND 100),
  message text NOT NULL CHECK (length(trim(message)) BETWEEN 1 AND 500),
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX wishes_wedding_created ON wishes(wedding, "createdAt" DESC);
