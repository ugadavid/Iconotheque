PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS app_meta (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS roots (
  id INTEGER PRIMARY KEY,
  path TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  opened_at TEXT,
  last_scanned_at TEXT
);

CREATE TABLE IF NOT EXISTS folders (
  id INTEGER PRIMARY KEY,
  root_id INTEGER NOT NULL,
  path TEXT NOT NULL,
  relative_path TEXT NOT NULL,
  name TEXT NOT NULL,
  parent_path TEXT,
  direct_image_count INTEGER DEFAULT 0,
  subfolder_count INTEGER DEFAULT 0,
  scan_error TEXT,
  last_scanned_at TEXT,
  UNIQUE(root_id, path),
  FOREIGN KEY(root_id) REFERENCES roots(id)
);

CREATE TABLE IF NOT EXISTS images (
  id INTEGER PRIMARY KEY,
  root_id INTEGER NOT NULL,
  folder_id INTEGER,
  path TEXT UNIQUE NOT NULL,
  file_name TEXT NOT NULL,
  folder_path TEXT NOT NULL,
  extension TEXT,
  size_bytes INTEGER,
  modified_at TEXT,
  preview_id TEXT,
  indexed_at TEXT,
  FOREIGN KEY(root_id) REFERENCES roots(id),
  FOREIGN KEY(folder_id) REFERENCES folders(id)
);

CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  type TEXT DEFAULT 'custom',
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS image_tags (
  image_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  source TEXT DEFAULT 'manual',
  confidence REAL,
  created_at TEXT,
  PRIMARY KEY(image_id, tag_id),
  FOREIGN KEY(image_id) REFERENCES images(id),
  FOREIGN KEY(tag_id) REFERENCES tags(id)
);

CREATE TABLE IF NOT EXISTS image_user_meta (
  image_id INTEGER PRIMARY KEY,
  description TEXT,
  is_favorite INTEGER DEFAULT 0,
  rating INTEGER CHECK(rating IS NULL OR (rating >= 0 AND rating <= 5)),
  reference_date TEXT,
  source TEXT,
  generation_tool TEXT,
  prompt_text TEXT,
  color_mode TEXT CHECK(color_mode IN ('color', 'bw', 'mixed', 'unknown')),
  workflow_color TEXT DEFAULT 'none',
  status TEXT,
  created_at TEXT,
  updated_at TEXT,
  FOREIGN KEY(image_id) REFERENCES images(id)
);

CREATE TABLE IF NOT EXISTS terms (
  id INTEGER PRIMARY KEY,
  kind TEXT NOT NULL,
  label TEXT NOT NULL,
  normalized_label TEXT NOT NULL,
  created_at TEXT,
  UNIQUE(kind, normalized_label)
);

CREATE TABLE IF NOT EXISTS image_terms (
  image_id INTEGER NOT NULL,
  term_id INTEGER NOT NULL,
  created_at TEXT,
  PRIMARY KEY(image_id, term_id),
  FOREIGN KEY(image_id) REFERENCES images(id),
  FOREIGN KEY(term_id) REFERENCES terms(id)
);
