ALTER TABLE users ADD COLUMN IF NOT EXISTS seats INT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS company TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS fleet_code TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS users_fleet_code ON users(fleet_code) WHERE fleet_code IS NOT NULL;
CREATE TABLE IF NOT EXISTS fleet_members (
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (owner_id, email)
);
CREATE INDEX IF NOT EXISTS fleet_members_email ON fleet_members(email);
