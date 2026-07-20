package app

import (
	"database/sql"
	"io/fs"

	_ "modernc.org/sqlite"
)

func Open(path string) (*sql.DB, error) {
	db, err := sql.Open("sqlite", path+"?_pragma=busy_timeout(5000)&_pragma=foreign_keys(1)&_pragma=journal_mode(WAL)")
	if err != nil {
		return nil, err
	}
	if err = db.Ping(); err != nil {
		db.Close()
		return nil, err
	}
	if err = migrate(db); err != nil {
		db.Close()
		return nil, err
	}
	return db, nil
}

func NewHandler(db *sql.DB, assets fs.FS) *Handler { return &Handler{db: db, assets: assets} }
