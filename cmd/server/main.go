package main

import (
	"embed"
	"flag"
	"io/fs"
	"log"
	"net/http"
	"os"
	"path/filepath"

	"family-english-app/internal/app"
)

//go:embed all:web/dist
var webFS embed.FS

func main() {
	var addr, dataDir string
	flag.StringVar(&addr, "addr", env("APP_ADDR", ":8080"), "listen address")
	flag.StringVar(&dataDir, "data", env("APP_DATA_DIR", "./data"), "SQLite data directory")
	flag.Parse()
	if err := os.MkdirAll(dataDir, 0750); err != nil {
		log.Fatal(err)
	}
	dbPath := filepath.Join(dataDir, "family-english.db")
	db, err := app.Open(dbPath)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()
	assets, err := fs.Sub(webFS, "web/dist")
	if err != nil {
		log.Fatal(err)
	}
	h := app.NewHandler(db, assets)
	log.Printf("Family English App listening on http://%s", addr)
	log.Fatal(http.ListenAndServe(addr, h))
}

func env(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
