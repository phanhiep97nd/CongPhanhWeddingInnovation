-- A recorded invitation for one guest (Premium): the couple's voice, played on that guest's card.
ALTER TABLE guests ADD COLUMN "voiceUrl" text NOT NULL DEFAULT '' CHECK ("voiceUrl" = '' OR ("voiceUrl" LIKE 'https://%' AND length("voiceUrl") <= 2048));
