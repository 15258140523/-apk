package app

import (
	"database/sql"
	"encoding/json"
	"errors"
	"io/fs"
	"net/http"
	"path"
	"strings"
)

type Handler struct {
	db     *sql.DB
	assets fs.FS
}
type apiError struct {
	Error string `json:"error"`
}

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if strings.HasPrefix(r.URL.Path, "/api/") {
		h.routeAPI(w, r)
		return
	}
	p := strings.TrimPrefix(path.Clean(r.URL.Path), "/")
	if p == "" {
		p = "index.html"
	}
	content, err := fs.ReadFile(h.assets, p)
	if err != nil {
		content, err = fs.ReadFile(h.assets, "index.html")
	}
	if err != nil {
		http.Error(w, "web assets missing; run npm run build", 500)
		return
	}
	if strings.HasSuffix(p, ".js") {
		w.Header().Set("Content-Type", "application/javascript; charset=utf-8")
	}
	if strings.HasSuffix(p, ".css") {
		w.Header().Set("Content-Type", "text/css; charset=utf-8")
	}
	if strings.HasSuffix(p, ".html") {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
	}
	if _, err := fs.Stat(h.assets, p); err != nil {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
	}
	_, _ = w.Write(content)
}

func (h *Handler) routeAPI(w http.ResponseWriter, r *http.Request) {
	defer func() {
		if recover() != nil {
			respondError(w, http.StatusInternalServerError, "internal server error")
		}
	}()
	switch {
	case r.Method == http.MethodGet && r.URL.Path == "/api/health":
		respond(w, http.StatusOK, map[string]string{"status": "ok"})
	case r.Method == http.MethodGet && r.URL.Path == "/api/bootstrap":
		h.bootstrap(w, r)
	case r.Method == http.MethodPost && r.URL.Path == "/api/families":
		h.createFamily(w, r)
	case r.Method == http.MethodGet && r.URL.Path == "/api/courses":
		h.listCourses(w, r)
	case r.Method == http.MethodPost && r.URL.Path == "/api/courses":
		h.createCourse(w, r)
	case r.Method == http.MethodGet && r.URL.Path == "/api/lessons":
		h.listLessons(w, r)
	case r.Method == http.MethodPost && strings.HasSuffix(r.URL.Path, "/complete"):
		h.completeLesson(w, r)
	case r.Method == http.MethodPost && strings.HasSuffix(r.URL.Path, "/undo"):
		h.undoLesson(w, r)
	case r.Method == http.MethodGet && r.URL.Path == "/api/records":
		h.listRecords(w, r)
	case r.Method == http.MethodPost && r.URL.Path == "/api/records":
		h.createRecord(w, r)
	case r.Method == http.MethodGet && r.URL.Path == "/api/export":
		h.export(w, r)
	default:
		respondError(w, http.StatusNotFound, "route not found")
	}
}

func userID(r *http.Request) string {
	if v := r.Header.Get("X-User-ID"); v != "" {
		return v
	}
	return "local-owner"
}
func familyID(r *http.Request) string { return r.Header.Get("X-Family-ID") }
func decode(r *http.Request, dst any) error {
	return json.NewDecoder(http.MaxBytesReader(nil, r.Body, 1<<20)).Decode(dst)
}
func respond(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}
func respondError(w http.ResponseWriter, status int, message string) {
	respond(w, status, apiError{message})
}
func requireRole(db *sql.DB, family, user string, write bool) (string, error) {
	var role string
	err := db.QueryRow(`SELECT role FROM members WHERE family_id=? AND user_id=? AND active=1`, family, user).Scan(&role)
	if err != nil {
		return "", errors.New("family access denied")
	}
	if write && role == "viewer" {
		return "", errors.New("write permission denied")
	}
	return role, nil
}
