CREATE TABLE IF NOT EXISTS sellers (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  legal_name TEXT NOT NULL DEFAULT '',
  business_name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  phone_verified_at TIMESTAMPTZ,
  email TEXT,
  email_verified_at TIMESTAMPTZ,
  agreed_at TIMESTAMPTZ,
  agreed_version TEXT,
  stripe_account TEXT,
  charges_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS verify_codes (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  target TEXT NOT NULL,
  code_hash TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  tries INT NOT NULL DEFAULT 0,
  sent_count INT NOT NULL DEFAULT 1,
  PRIMARY KEY (user_id, kind)
);
CREATE TABLE IF NOT EXISTS listings (
  id TEXT PRIMARY KEY,
  seller_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'program',
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  delivery TEXT NOT NULL DEFAULT '',
  price_cents INT NOT NULL,
  ships BOOLEAN NOT NULL DEFAULT FALSE,
  has_image BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'pending',
  reason TEXT,
  sales INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS listings_status ON listings(status, created_at DESC);
CREATE INDEX IF NOT EXISTS listings_seller ON listings(seller_id);
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  listing_id TEXT REFERENCES listings(id) ON DELETE SET NULL,
  buyer_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  seller_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  amount INT NOT NULL,
  fee INT NOT NULL,
  stripe_session TEXT,
  stripe_account TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  shipping JSONB,
  buyer_email TEXT,
  fulfilled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS orders_buyer ON orders(buyer_id);
CREATE INDEX IF NOT EXISTS orders_seller ON orders(seller_id);
CREATE TABLE IF NOT EXISTS listing_reports (
  listing_id TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (listing_id, user_id)
);
