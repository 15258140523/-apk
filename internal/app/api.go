package app

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"
)

type family struct {
	ID        string `json:"id"`
	ChildName string `json:"childName"`
	OwnerID   string `json:"ownerId"`
	Role      string `json:"role"`
}
type course struct {
	ID               string  `json:"id"`
	Name             string  `json:"name"`
	Color            string  `json:"color"`
	TotalLessons     int     `json:"totalLessons"`
	RemainingLessons int     `json:"remainingLessons"`
	Weekday          *int    `json:"weekday"`
	TimeOfDay        *string `json:"timeOfDay"`
}
type lesson struct {
	ID               string `json:"id"`
	CourseID         string `json:"courseId"`
	CourseName       string `json:"courseName"`
	StartsAt         string `json:"startsAt"`
	Status           string `json:"status"`
	RemainingLessons int    `json:"remainingLessons"`
}

func (h *Handler) bootstrap(w http.ResponseWriter, r *http.Request) {
	u := userID(r)
	var f family
	err := h.db.QueryRow(`SELECT f.id,f.child_name,f.owner_id,m.role FROM families f JOIN members m ON m.family_id=f.id WHERE m.user_id=? AND m.active=1 ORDER BY f.created_at LIMIT 1`, u).Scan(&f.ID, &f.ChildName, &f.OwnerID, &f.Role)
	if err == sql.ErrNoRows {
		respond(w, 200, map[string]any{"userId": u, "family": nil})
		return
	}
	if err != nil {
		respondError(w, 500, err.Error())
		return
	}
	respond(w, 200, map[string]any{"userId": u, "family": f})
}

func (h *Handler) createFamily(w http.ResponseWriter, r *http.Request) {
	var in struct {
		ChildName   string `json:"childName"`
		DisplayName string `json:"displayName"`
	}
	if err := decode(r, &in); err != nil || strings.TrimSpace(in.ChildName) == "" {
		respondError(w, 400, "childName is required")
		return
	}
	u, id, now := userID(r), newID(), nowUTC()
	if in.DisplayName == "" {
		in.DisplayName = "家庭创建者"
	}
	tx, err := h.db.Begin()
	if err != nil {
		respondError(w, 500, err.Error())
		return
	}
	defer tx.Rollback()
	if _, err = tx.Exec(`INSERT INTO families(id,child_name,owner_id,created_at) VALUES(?,?,?,?)`, id, strings.TrimSpace(in.ChildName), u, now); err == nil {
		_, err = tx.Exec(`INSERT INTO members(family_id,user_id,display_name,role) VALUES(?,?,?,'owner')`, id, u, in.DisplayName)
	}
	if err != nil {
		respondError(w, 500, err.Error())
		return
	}
	_ = tx.Commit()
	respond(w, 201, family{ID: id, ChildName: in.ChildName, OwnerID: u, Role: "owner"})
}

func (h *Handler) listCourses(w http.ResponseWriter, r *http.Request) {
	f, u := familyID(r), userID(r)
	if _, err := requireRole(h.db, f, u, false); err != nil {
		respondError(w, 403, err.Error())
		return
	}
	rows, err := h.db.Query(`SELECT id,name,color,total_lessons,remaining_lessons,weekday,time_of_day FROM courses WHERE family_id=? AND archived=0 ORDER BY created_at`, f)
	if err != nil {
		respondError(w, 500, err.Error())
		return
	}
	defer rows.Close()
	out := make([]course, 0)
	for rows.Next() {
		var c course
		if err := rows.Scan(&c.ID, &c.Name, &c.Color, &c.TotalLessons, &c.RemainingLessons, &c.Weekday, &c.TimeOfDay); err == nil {
			out = append(out, c)
		}
	}
	respond(w, 200, out)
}

func (h *Handler) createCourse(w http.ResponseWriter, r *http.Request) {
	f, u := familyID(r), userID(r)
	if _, err := requireRole(h.db, f, u, true); err != nil {
		respondError(w, 403, err.Error())
		return
	}
	var in struct {
		Name         string  `json:"name"`
		Color        string  `json:"color"`
		TotalLessons int     `json:"totalLessons"`
		Weekday      *int    `json:"weekday"`
		TimeOfDay    *string `json:"timeOfDay"`
	}
	if err := decode(r, &in); err != nil || strings.TrimSpace(in.Name) == "" || in.TotalLessons < 1 {
		respondError(w, 400, "course name and positive totalLessons are required")
		return
	}
	if in.Color == "" {
		in.Color = "#16803c"
	}
	id := newID()
	now := nowUTC()
	_, err := h.db.Exec(`INSERT INTO courses(id,family_id,name,color,total_lessons,remaining_lessons,weekday,time_of_day,created_at) VALUES(?,?,?,?,?,?,?,?,?)`, id, f, strings.TrimSpace(in.Name), in.Color, in.TotalLessons, in.TotalLessons, in.Weekday, in.TimeOfDay, now)
	if err != nil {
		respondError(w, 500, err.Error())
		return
	}
	if in.Weekday != nil && in.TimeOfDay != nil {
		if err := h.generateLessons(f, id, *in.Weekday, *in.TimeOfDay); err != nil {
			respondError(w, 500, err.Error())
			return
		}
	}
	logOperation(h.db, f, u, "course.created", id, in.Name)
	respond(w, 201, course{ID: id, Name: in.Name, Color: in.Color, TotalLessons: in.TotalLessons, RemainingLessons: in.TotalLessons, Weekday: in.Weekday, TimeOfDay: in.TimeOfDay})
}

func (h *Handler) generateLessons(familyID, courseID string, weekday int, timeOfDay string) error {
	if weekday < 0 || weekday > 6 {
		return fmt.Errorf("weekday must be 0-6")
	}
	clock, err := time.Parse("15:04", timeOfDay)
	if err != nil {
		return fmt.Errorf("timeOfDay must be HH:MM")
	}
	now := time.Now().In(time.Local)
	offset := (weekday - int(now.Weekday()) + 7) % 7
	first := time.Date(now.Year(), now.Month(), now.Day(), clock.Hour(), clock.Minute(), 0, 0, now.Location()).AddDate(0, 0, offset)
	if first.Before(now.Add(-time.Minute)) {
		first = first.AddDate(0, 0, 7)
	}
	tx, err := h.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	for i := 0; i < 16; i++ {
		at := first.AddDate(0, 0, 7*i).UTC().Format(time.RFC3339)
		if _, err = tx.Exec(`INSERT OR IGNORE INTO lessons(id,course_id,family_id,starts_at,original_starts_at,status) VALUES(?,?,?,?,?,'pending')`, newID(), courseID, familyID, at, at); err != nil {
			return err
		}
	}
	return tx.Commit()
}

func (h *Handler) listLessons(w http.ResponseWriter, r *http.Request) {
	f, u := familyID(r), userID(r)
	if _, err := requireRole(h.db, f, u, false); err != nil {
		respondError(w, 403, err.Error())
		return
	}
	from := r.URL.Query().Get("from")
	to := r.URL.Query().Get("to")
	if from == "" {
		from = time.Now().AddDate(0, 0, -14).UTC().Format(time.RFC3339)
	}
	if to == "" {
		to = time.Now().AddDate(0, 0, 90).UTC().Format(time.RFC3339)
	}
	rows, err := h.db.Query(`SELECT l.id,l.course_id,c.name,l.starts_at,l.status,c.remaining_lessons FROM lessons l JOIN courses c ON c.id=l.course_id WHERE l.family_id=? AND l.starts_at>=? AND l.starts_at<=? ORDER BY l.starts_at`, f, from, to)
	if err != nil {
		respondError(w, 500, err.Error())
		return
	}
	defer rows.Close()
	out := make([]lesson, 0)
	for rows.Next() {
		var l lesson
		if rows.Scan(&l.ID, &l.CourseID, &l.CourseName, &l.StartsAt, &l.Status, &l.RemainingLessons) == nil {
			out = append(out, l)
		}
	}
	respond(w, 200, out)
}

func (h *Handler) completeLesson(w http.ResponseWriter, r *http.Request) {
	f, u := familyID(r), userID(r)
	if _, err := requireRole(h.db, f, u, true); err != nil {
		respondError(w, 403, err.Error())
		return
	}
	lessonID := strings.TrimSuffix(strings.TrimPrefix(r.URL.Path, "/api/lessons/"), "/complete")
	key := r.Header.Get("Idempotency-Key")
	if key == "" {
		respondError(w, 400, "Idempotency-Key is required")
		return
	}
	if saved, ok := claimResponse(h.db, key); ok {
		respond(w, 200, saved)
		return
	}
	tx, err := h.db.Begin()
	if err != nil {
		respondError(w, 500, err.Error())
		return
	}
	defer tx.Rollback()
	var courseID, status string
	var before int
	err = tx.QueryRow(`SELECT l.course_id,l.status,c.remaining_lessons FROM lessons l JOIN courses c ON c.id=l.course_id WHERE l.id=? AND l.family_id=?`, lessonID, f).Scan(&courseID, &status, &before)
	if err != nil {
		respondError(w, 404, "lesson not found")
		return
	}
	if status == "completed" {
		respondError(w, 409, "LESSON_ALREADY_COMPLETED")
		return
	}
	if status != "pending" {
		respondError(w, 409, "lesson cannot be completed from current status")
		return
	}
	if before < 1 {
		respondError(w, 409, "NO_REMAINING_LESSONS")
		return
	}
	if result, err := tx.Exec(`UPDATE lessons SET status='completed',completed_at=?,version=version+1 WHERE id=? AND status='pending'`, nowUTC(), lessonID); err != nil {
		respondError(w, 500, err.Error())
		return
	} else if n, _ := result.RowsAffected(); n != 1 {
		respondError(w, 409, "LESSON_ALREADY_COMPLETED")
		return
	}
	if _, err = tx.Exec(`UPDATE courses SET remaining_lessons=remaining_lessons-1,version=version+1 WHERE id=? AND remaining_lessons>0`, courseID); err != nil {
		respondError(w, 500, err.Error())
		return
	}
	body := map[string]any{"lessonId": lessonID, "remainingBefore": before, "remainingAfter": before - 1}
	raw, _ := json.Marshal(body)
	if _, err = tx.Exec(`INSERT INTO request_claims(key,response,created_at) VALUES(?,?,?)`, key, string(raw), nowUTC()); err != nil {
		respondError(w, 409, "duplicate request")
		return
	}
	if _, err = tx.Exec(`INSERT INTO operation_logs(id,family_id,actor_id,action,entity_id,detail,created_at) VALUES(?,?,?,?,?,?,?)`, newID(), f, u, "lesson.completed", lessonID, fmt.Sprintf("%d -> %d", before, before-1), nowUTC()); err != nil {
		respondError(w, 500, err.Error())
		return
	}
	if err = tx.Commit(); err != nil {
		respondError(w, 500, err.Error())
		return
	}
	respond(w, 200, body)
}

func (h *Handler) undoLesson(w http.ResponseWriter, r *http.Request) {
	f, u := familyID(r), userID(r)
	if _, err := requireRole(h.db, f, u, true); err != nil {
		respondError(w, 403, err.Error())
		return
	}
	id := strings.TrimSuffix(strings.TrimPrefix(r.URL.Path, "/api/lessons/"), "/undo")
	tx, err := h.db.Begin()
	if err != nil {
		respondError(w, 500, err.Error())
		return
	}
	defer tx.Rollback()
	var courseID, status string
	if err = tx.QueryRow(`SELECT course_id,status FROM lessons WHERE id=? AND family_id=?`, id, f).Scan(&courseID, &status); err != nil || status != "completed" {
		respondError(w, 409, "only completed lessons can be undone")
		return
	}
	if _, err = tx.Exec(`UPDATE lessons SET status='pending',completed_at=NULL,version=version+1 WHERE id=?`, id); err == nil {
		_, err = tx.Exec(`UPDATE courses SET remaining_lessons=remaining_lessons+1,version=version+1 WHERE id=?`, courseID)
	}
	if err != nil {
		respondError(w, 500, err.Error())
		return
	}
	_, _ = tx.Exec(`INSERT INTO operation_logs(id,family_id,actor_id,action,entity_id,detail,created_at) VALUES(?,?,?,?,?,?,?)`, newID(), f, u, "lesson.undone", id, "lesson balance restored", nowUTC())
	if err = tx.Commit(); err != nil {
		respondError(w, 500, err.Error())
		return
	}
	respond(w, 200, map[string]bool{"undone": true})
}

func (h *Handler) listRecords(w http.ResponseWriter, r *http.Request) {
	f, u := familyID(r), userID(r)
	if _, err := requireRole(h.db, f, u, false); err != nil {
		respondError(w, 403, err.Error())
		return
	}
	args := []any{f}
	q := `SELECT r.id,r.course_id,c.name,r.lesson_id,r.topic,r.notes,r.tags,r.link,r.created_by,r.created_at,r.updated_at FROM learning_records r JOIN courses c ON c.id=r.course_id WHERE r.family_id=? AND r.deleted_at IS NULL`
	if cid := r.URL.Query().Get("courseId"); cid != "" {
		q += " AND r.course_id=?"
		args = append(args, cid)
	}
	q += " ORDER BY r.created_at DESC"
	rows, err := h.db.Query(q, args...)
	if err != nil {
		respondError(w, 500, err.Error())
		return
	}
	defer rows.Close()
	out := make([]map[string]any, 0)
	for rows.Next() {
		var id, cid, cname string
		var lid sql.NullString
		var topic, notes, tags, link, by, created, updated string
		if rows.Scan(&id, &cid, &cname, &lid, &topic, &notes, &tags, &link, &by, &created, &updated) == nil {
			out = append(out, map[string]any{"id": id, "courseId": cid, "courseName": cname, "lessonId": lid.String, "topic": topic, "notes": notes, "tags": tags, "link": link, "createdBy": by, "createdAt": created, "updatedAt": updated})
		}
	}
	respond(w, 200, out)
}

func (h *Handler) createRecord(w http.ResponseWriter, r *http.Request) {
	f, u := familyID(r), userID(r)
	if _, err := requireRole(h.db, f, u, true); err != nil {
		respondError(w, 403, err.Error())
		return
	}
	var in struct {
		CourseID string `json:"courseId"`
		LessonID string `json:"lessonId"`
		Topic    string `json:"topic"`
		Notes    string `json:"notes"`
		Tags     string `json:"tags"`
		Link     string `json:"link"`
	}
	if err := decode(r, &in); err != nil || in.CourseID == "" || strings.TrimSpace(in.Topic) == "" {
		respondError(w, 400, "courseId and topic are required")
		return
	}
	var exists int
	if h.db.QueryRow(`SELECT COUNT(*) FROM courses WHERE id=? AND family_id=?`, in.CourseID, f).Scan(&exists) != nil || exists == 0 {
		respondError(w, 400, "course does not belong to this family")
		return
	}
	id, now := newID(), nowUTC()
	_, err := h.db.Exec(`INSERT INTO learning_records(id,family_id,course_id,lesson_id,topic,notes,tags,link,created_by,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)`, id, f, in.CourseID, nullIfEmpty(in.LessonID), strings.TrimSpace(in.Topic), in.Notes, in.Tags, in.Link, u, now, now)
	if err != nil {
		respondError(w, 500, err.Error())
		return
	}
	logOperation(h.db, f, u, "record.created", id, in.Topic)
	respond(w, 201, map[string]string{"id": id})
}

func (h *Handler) export(w http.ResponseWriter, r *http.Request) {
	f, u := familyID(r), userID(r)
	role, err := requireRole(h.db, f, u, false)
	if err != nil || role != "owner" {
		respondError(w, 403, "only the owner can export data")
		return
	}
	tables := []string{"families", "members", "courses", "lessons", "learning_records", "operation_logs"}
	out := map[string]any{}
	for _, t := range tables {
		rows, e := h.db.Query("SELECT * FROM "+t+" WHERE "+map[string]string{"families": "id", "members": "family_id", "courses": "family_id", "lessons": "family_id", "learning_records": "family_id", "operation_logs": "family_id"}[t]+"=?", f)
		if e != nil {
			continue
		}
		cols, _ := rows.Columns()
		var list []map[string]any
		for rows.Next() {
			vals := make([]any, len(cols))
			refs := make([]any, len(cols))
			for i := range vals {
				refs[i] = &vals[i]
			}
			if rows.Scan(refs...) == nil {
				row := map[string]any{}
				for i, c := range cols {
					row[c] = vals[i]
				}
				list = append(list, row)
			}
		}
		rows.Close()
		out[t] = list
	}
	w.Header().Set("Content-Disposition", "attachment; filename=family-export.json")
	respond(w, 200, out)
}

func newID() string {
	return fmt.Sprintf("%x", time.Now().UnixNano()) + fmt.Sprintf("%x", time.Now().UnixMicro()%997)
}
func nowUTC() string { return time.Now().UTC().Format(time.RFC3339) }
func nullIfEmpty(v string) any {
	if v == "" {
		return nil
	}
	return v
}
func claimResponse(db *sql.DB, key string) (any, bool) {
	var raw string
	if db.QueryRow(`SELECT response FROM request_claims WHERE key=?`, key).Scan(&raw) != nil {
		return nil, false
	}
	var body any
	if json.Unmarshal([]byte(raw), &body) != nil {
		return nil, false
	}
	return body, true
}
func logOperation(db *sql.DB, f, u, action, id, detail string) {
	_, _ = db.Exec(`INSERT INTO operation_logs(id,family_id,actor_id,action,entity_id,detail,created_at) VALUES(?,?,?,?,?,?,?)`, newID(), f, u, action, id, detail, nowUTC())
}
