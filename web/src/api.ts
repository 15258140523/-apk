export type Family = { id: string; childName: string; ownerId: string; role: 'owner' | 'admin' | 'viewer' }
export type Course = { id: string; name: string; color: string; totalLessons: number; remainingLessons: number; weekday?: number; timeOfDay?: string }
export type Lesson = { id: string; courseId: string; courseName: string; startsAt: string; status: string; remainingLessons: number }
export type RecordItem = { id: string; courseId: string; courseName: string; lessonId?: string; topic: string; notes: string; tags: string; link: string; createdAt: string }
let familyId = localStorage.getItem('family-id') || ''
export function setFamilyId(id: string) { familyId = id; localStorage.setItem('family-id', id) }
async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers); headers.set('Accept', 'application/json'); if (init.body) headers.set('Content-Type','application/json'); if (familyId) headers.set('X-Family-ID',familyId)
  const response = await fetch(url, { ...init, headers }); if (!response.ok) { const data = await response.json().catch(() => ({error:'网络请求失败'})); throw new Error(data.error || '请求失败') }; return response.json()
}
export const api = {
  bootstrap: () => request<{ userId: string; family: Family | null }>('/api/bootstrap'),
  createFamily: (childName: string, displayName: string) => request<Family>('/api/families',{method:'POST',body:JSON.stringify({childName,displayName})}),
  courses: () => request<Course[]>('/api/courses'),
  createCourse: (data: Omit<Course,'id'|'remainingLessons'>) => request<Course>('/api/courses',{method:'POST',body:JSON.stringify(data)}),
  lessons: () => request<Lesson[]>('/api/lessons'),
  complete: (id: string) => request<{remainingBefore:number;remainingAfter:number}>(`/api/lessons/${id}/complete`,{method:'POST',headers:{'Idempotency-Key':crypto.randomUUID()}}),
  undo: (id: string) => request(`/api/lessons/${id}/undo`,{method:'POST'}),
  records: (courseId = '') => request<RecordItem[]>(`/api/records${courseId ? `?courseId=${encodeURIComponent(courseId)}` : ''}`),
  createRecord: (data: {courseId:string;lessonId?:string;topic:string;notes:string;tags:string;link:string}) => request('/api/records',{method:'POST',body:JSON.stringify(data)}),
  export: () => { const headers = new Headers({'X-Family-ID':familyId}); return fetch('/api/export',{headers}) }
}
