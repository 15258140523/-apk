package app

import "database/sql"

func migrate(db *sql.DB) error {
	_, err := db.Exec(`
CREATE TABLE IF NOT EXISTS families (id TEXT PRIMARY KEY, child_name TEXT NOT NULL, owner_id TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS members (family_id TEXT NOT NULL, user_id TEXT NOT NULL, display_name TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('owner','admin','viewer')), active INTEGER NOT NULL DEFAULT 1, PRIMARY KEY(family_id,user_id), FOREIGN KEY(family_id) REFERENCES families(id));
CREATE TABLE IF NOT EXISTS courses (id TEXT PRIMARY KEY, family_id TEXT NOT NULL, name TEXT NOT NULL, color TEXT NOT NULL DEFAULT '#16803c', total_lessons INTEGER NOT NULL, remaining_lessons INTEGER NOT NULL, weekday INTEGER, time_of_day TEXT, version INTEGER NOT NULL DEFAULT 1, archived INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, FOREIGN KEY(family_id) REFERENCES families(id));
CREATE TABLE IF NOT EXISTS lessons (id TEXT PRIMARY KEY, course_id TEXT NOT NULL, family_id TEXT NOT NULL, starts_at TEXT NOT NULL, original_starts_at TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','completed','cancelled','leave')), completed_at TEXT, version INTEGER NOT NULL DEFAULT 1, UNIQUE(course_id, original_starts_at), FOREIGN KEY(course_id) REFERENCES courses(id));
CREATE TABLE IF NOT EXISTS learning_records (id TEXT PRIMARY KEY, family_id TEXT NOT NULL, course_id TEXT NOT NULL, lesson_id TEXT, topic TEXT NOT NULL, notes TEXT NOT NULL DEFAULT '', tags TEXT NOT NULL DEFAULT '', link TEXT NOT NULL DEFAULT '', created_by TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT, FOREIGN KEY(course_id) REFERENCES courses(id));
CREATE TABLE IF NOT EXISTS operation_logs (id TEXT PRIMARY KEY, family_id TEXT NOT NULL, actor_id TEXT NOT NULL, action TEXT NOT NULL, entity_id TEXT NOT NULL, detail TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS request_claims (key TEXT PRIMARY KEY, response TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_courses_family ON courses(family_id);
CREATE INDEX IF NOT EXISTS idx_lessons_family_start ON lessons(family_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_records_family_created ON learning_records(family_id, created_at DESC);`)
	return err
}
