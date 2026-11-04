ALTER TABLE weddings ADD COLUMN IF NOT EXISTS "invitationKind" text NOT NULL DEFAULT 'wedding';
ALTER TABLE weddings ADD COLUMN IF NOT EXISTS "eventTitle" text NOT NULL DEFAULT '';
ALTER TABLE weddings ADD COLUMN IF NOT EXISTS "importedTemplate" jsonb DEFAULT NULL;
