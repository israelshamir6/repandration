CREATE TABLE IF NOT EXISTS creators (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  handle TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL DEFAULT '',
  bio TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS videos (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'uploading',
  reason TEXT NOT NULL DEFAULT '',
  raw_chunks INT NOT NULL DEFAULT 0,
  raw_size BIGINT NOT NULL DEFAULT 0,
  out_size BIGINT NOT NULL DEFAULT 0,
  out_chunks INT NOT NULL DEFAULT 0,
  duration REAL NOT NULL DEFAULT 0,
  views INT NOT NULL DEFAULT 0,
  reports INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS videos_status ON videos(status, published_at DESC);
CREATE INDEX IF NOT EXISTS videos_user ON videos(user_id);
CREATE TABLE IF NOT EXISTS follows (
  follower_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  creator_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (follower_id, creator_id)
);
CREATE INDEX IF NOT EXISTS follows_creator ON follows(creator_id);
CREATE TABLE IF NOT EXISTS video_reports (
  video_id TEXT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (video_id, user_id)
);
