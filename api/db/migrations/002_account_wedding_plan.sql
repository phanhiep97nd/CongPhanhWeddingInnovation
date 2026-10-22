ALTER TABLE users ADD COLUMN "defaultWeddingPlan" text NOT NULL DEFAULT 'free'
  CHECK ("defaultWeddingPlan" IN ('free', 'premium'));
