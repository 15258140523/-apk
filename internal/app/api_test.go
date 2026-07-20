package app

import (
	"bytes"
	"encoding/json"
	"io/fs"
	"net/http"
	"net/http/httptest"
	"testing"
	"testing/fstest"
)

func TestCompleteLessonIsIdempotent(t *testing.T) {
	db, err := Open(t.TempDir() + "/test.db")
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	h := NewHandler(db, fstest.MapFS{"index.html": &fstest.MapFile{Data: []byte("ok")}})
	call := func(method, path, family string, body any, key string) *httptest.ResponseRecorder {
		var input []byte
		if body != nil {
			input, _ = json.Marshal(body)
		}
		r := httptest.NewRequest(method, path, bytes.NewReader(input))
		if family != "" {
			r.Header.Set("X-Family-ID", family)
		}
		if key != "" {
			r.Header.Set("Idempotency-Key", key)
		}
		w := httptest.NewRecorder()
		h.ServeHTTP(w, r)
		return w
	}
	created := call(http.MethodPost, "/api/families", "", map[string]string{"childName": "乐乐"}, "")
	if created.Code != http.StatusCreated {
		t.Fatalf("create family: %d %s", created.Code, created.Body.String())
	}
	var family family
	_ = json.Unmarshal(created.Body.Bytes(), &family)
	c := call(http.MethodPost, "/api/courses", family.ID, map[string]any{"name": "口语", "totalLessons": 2, "weekday": 1, "timeOfDay": "10:00"}, "")
	if c.Code != http.StatusCreated {
		t.Fatalf("create course: %d %s", c.Code, c.Body.String())
	}
	lessons := call(http.MethodGet, "/api/lessons", family.ID, nil, "")
	var list []lesson
	_ = json.Unmarshal(lessons.Body.Bytes(), &list)
	if len(list) == 0 {
		t.Fatal("expected generated lesson")
	}
	first := call(http.MethodPost, "/api/lessons/"+list[0].ID+"/complete", family.ID, nil, "same-operation")
	second := call(http.MethodPost, "/api/lessons/"+list[0].ID+"/complete", family.ID, nil, "same-operation")
	if first.Code != http.StatusOK || second.Code != http.StatusOK {
		t.Fatalf("completion should be idempotent: %d / %d", first.Code, second.Code)
	}
	var balance int
	if err := db.QueryRow(`SELECT remaining_lessons FROM courses`).Scan(&balance); err != nil {
		t.Fatal(err)
	}
	if balance != 1 {
		t.Fatalf("want one deduction, got remaining=%d", balance)
	}
}

var _ fs.FS
