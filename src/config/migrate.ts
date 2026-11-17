import pool from './db';

const sql = `
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email       TEXT UNIQUE NOT NULL,
  password    TEXT NOT NULL,
  name        TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'user'  CHECK (role IN ('user','admin')),
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS books (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title        TEXT NOT NULL,
  author       TEXT NOT NULL,
  subject      TEXT NOT NULL,
  grade        INT,
  year         INT,
  format       TEXT NOT NULL CHECK (format IN ('pdf','epub','fb2')),
  file_path    TEXT NOT NULL,
  cover_path   TEXT,
  file_size    BIGINT NOT NULL DEFAULT 0,
  description  TEXT,
  tags         TEXT[] DEFAULT '{}',
  downloads    INT DEFAULT 0,
  uploaded_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_books (
  user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
  book_id      UUID REFERENCES books(id) ON DELETE CASCADE,
  saved_at     TIMESTAMPTZ DEFAULT NOW(),
  current_page INT DEFAULT 1,
  total_pages  INT,
  last_opened  TIMESTAMPTZ,
  PRIMARY KEY (user_id, book_id)
);

CREATE INDEX IF NOT EXISTS idx_books_subject ON books(subject);
CREATE INDEX IF NOT EXISTS idx_books_grade ON books(grade);
CREATE INDEX IF NOT EXISTS idx_books_title ON books USING gin(to_tsvector('russian', title));
`;

(async () => {
  try {
    await pool.query(sql);
    console.log('Migration OK');
    process.exit(0);
  } catch (e) {
    console.error('Migration failed:', e);
    process.exit(1);
  }
})();
