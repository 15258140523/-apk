<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import type { Lesson, LessonStatus } from '../../domain/model'
import { useSessionStore } from '../../stores/session'
import { lessonDetail, adjustLesson } from '../../services/lessons'
import { publicMessage } from '../../services/cloud'

const session = useSessionStore()

const lessonId = ref('')
const courseId = ref('')
const lesson = ref<Lesson | null>(null)
const courseName = ref('')
const remainingLessons = ref(0)
const loading = ref(true)
const submitting = ref(false)
const error = ref('')
const success = ref(false)

const canEdit = computed(() => ['owner', 'admin'].includes(session.currentMember?.role ?? ''))

const originalTime = computed(() => {
  if (!lesson.value) return ''
  const d = new Date(lesson.value.plannedAt)
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric', day: 'numeric', weekday: 'short',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(d)
})

const actualTime = computed(() => {
  if (!lesson.value) return ''
  const d = new Date(lesson.value.actualAt)
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric', day: 'numeric', weekday: 'short',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(d)
})

const showRescheduleForm = ref(false)
const newDate = ref('')
const newTime = ref('')

const statusLabel: Record<LessonStatus, string> = {
  pending: '待上课',
  completed: '已完成',
  leave: '已请假',
  cancelled: '已取消',
  rescheduled: '已改期',
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

onLoad((options) => {
  lessonId.value = options?.lessonId ?? ''
  courseId.value = options?.courseId ?? ''
})

onMounted(async () => {
  if (!session.family || !lessonId.value) return
  try {
    const detail = await lessonDetail(session.family.familyId, lessonId.value)
    lesson.value = detail.lesson
    courseName.value = detail.course?.name ?? ''
    remainingLessons.value = detail.course?.remainingLessons ?? 0
  } catch (cause) {
    error.value = publicMessage(cause)
  } finally {
    loading.value = false
  }
})

async function doAdjust(action: 'leave' | 'cancel') {
  if (!session.family || !lesson.value || submitting.value) return
  submitting.value = true
  error.value = ''
  try {
    lesson.value = await adjustLesson(session.family.familyId, lessonId.value, action, generateId())
    success.value = true
    uni.showToast({ title: action === 'leave' ? '已请假' : '已取消', icon: 'success' })
  } catch (cause) {
    error.value = publicMessage(cause)
  } finally {
    submitting.value = false
  }
}

function startReschedule() {
  showRescheduleForm.value = true
  const d = new Date(lesson.value!.actualAt)
  newDate.value = d.toISOString().slice(0, 10)
  newTime.value = d.toISOString().slice(11, 16)
}

async function confirmReschedule() {
  if (!session.family || !lesson.value || submitting.value) return
  if (!newDate.value || !newTime.value) {
    error.value = '请选择新的上课时间'
    return
  }
  const actualAt = `${newDate.value}T${newTime.value}:00+08:00`
  submitting.value = true
  error.value = ''
  try {
    lesson.value = await adjustLesson(
      session.family.familyId, lessonId.value, 'reschedule', generateId(), actualAt,
    )
    showRescheduleForm.value = false
    success.value = true
    uni.showToast({ title: '已改期', icon: 'success' })
  } catch (cause) {
    error.value = publicMessage(cause)
  } finally {
    submitting.value = false
  }
}

function goBack() {
  uni.navigateBack()
}
</script>

<template>
  <view class="page-shell">
    <view v-if="loading" class="empty-card">正在加载…</view>

    <template v-else-if="lesson">
      <view class="info-card">
        <text class="course-label">{{ courseName }}</text>
        <text class="status-badge" :class="`badge-${lesson.status}`">
          {{ statusLabel[lesson.status] }}
        </text>

        <view class="time-section">
          <text class="time-label">原定时间</text>
          <text class="time-value">{{ originalTime }}</text>
        </view>
        <view v-if="lesson.status === 'rescheduled' && lesson.plannedAt !== lesson.actualAt" class="time-section">
          <text class="time-label">调整后</text>
          <text class="time-value highlight">{{ actualTime }}</text>
        </view>

        <text class="hint">仅修改本次课程，不影响每周固定课表</text>
      </view>

      <view v-if="canEdit && lesson.status !== 'completed'" class="actions-card">
        <template v-if="!showRescheduleForm">
          <button
            class="action-btn reschedule"
            :disabled="submitting || success"
            @click="startReschedule"
          >
            改期
          </button>
          <button
            class="action-btn leave"
            :disabled="submitting || success"
            @click="doAdjust('leave')"
          >
            请假
          </button>
          <button
            class="action-btn cancel"
            :disabled="submitting || success"
            @click="doAdjust('cancel')"
          >
            取消
          </button>
        </template>

        <template v-else>
          <text class="form-label">新的上课时间</text>
          <view class="form-row">
            <picker mode="date" :value="newDate" @change="(e: any) => { newDate = e.detail.value }">
              <view class="picker-btn">{{ newDate || '选择日期' }}</view>
            </picker>
            <picker mode="time" :value="newTime" @change="(e: any) => { newTime = e.detail.value }">
              <view class="picker-btn">{{ newTime || '选择时间' }}</view>
            </picker>
          </view>
          <view class="form-actions">
            <button class="action-btn cancel" :disabled="submitting" @click="showRescheduleForm = false">取消</button>
            <button class="action-btn reschedule" :disabled="submitting" @click="confirmReschedule">确认改期</button>
          </view>
        </template>
      </view>

      <view v-else-if="lesson.status === 'completed'" class="done-card">
        <text class="done-text">课程已完成，剩余 {{ remainingLessons }} 课时</text>
      </view>
    </template>

    <text v-if="error" class="error-copy">{{ error }}</text>

    <button class="back-btn" @click="goBack">返回</button>
  </view>
</template>

<style scoped>
.page-shell { min-height: 100vh; padding: 28rpx 28rpx 64rpx; box-sizing: border-box; }
.info-card {
  padding: 36rpx;
  border-radius: 28rpx;
  background: #fff;
  box-shadow: 0 12rpx 40rpx rgba(31, 50, 81, 0.06);
}
.course-label { display: block; color: #273247; font-size: 36rpx; font-weight: 750; }
.status-badge {
  display: inline-block;
  margin-top: 16rpx;
  padding: 6rpx 18rpx;
  border-radius: 100rpx;
  font-size: 24rpx;
}
.badge-pending { background: #e3f2fd; color: #1565c0; }
.badge-completed { background: #e8f5e9; color: #2e7d32; }
.badge-leave { background: #fff3e0; color: #e65100; }
.badge-cancelled { background: #fce4ec; color: #c62828; }
.badge-rescheduled { background: #e3f2fd; color: #1565c0; }
.time-section { margin-top: 28rpx; }
.time-label { display: block; color: #8a94a4; font-size: 24rpx; }
.time-value { display: block; margin-top: 6rpx; color: #273247; font-size: 30rpx; font-weight: 600; }
.time-value.highlight { color: #3478f6; }
.hint { display: block; margin-top: 32rpx; color: #8a94a4; font-size: 24rpx; }

.actions-card {
  margin-top: 28rpx;
  padding: 32rpx;
  border-radius: 28rpx;
  background: #fff;
  box-shadow: 0 12rpx 40rpx rgba(31, 50, 81, 0.06);
}
.action-btn {
  margin-bottom: 16rpx;
  border: 0;
  border-radius: 20rpx;
  font-size: 28rpx;
  font-weight: 650;
}
.action-btn.reschedule { background: #3478f6; color: #fff; }
.action-btn.leave { background: #fff3e0; color: #e65100; }
.action-btn.cancel { background: #f5f5f5; color: #666; }
.action-btn[disabled] { opacity: 0.45; }
.form-label { display: block; margin-bottom: 16rpx; color: #273247; font-size: 28rpx; font-weight: 600; }
.form-row { display: flex; gap: 16rpx; margin-bottom: 24rpx; }
.picker-btn {
  flex: 1;
  padding: 20rpx;
  border-radius: 16rpx;
  background: #f5f6f8;
  color: #273247;
  font-size: 28rpx;
  text-align: center;
}
.form-actions { display: flex; gap: 16rpx; }
.form-actions .action-btn { flex: 1; }

.done-card {
  margin-top: 28rpx;
  padding: 36rpx;
  border-radius: 28rpx;
  background: #e8f5e9;
  text-align: center;
}
.done-text { color: #2e7d32; font-size: 28rpx; font-weight: 600; }

.empty-card { padding: 38rpx; border-radius: 28rpx; background: #fff; color: #667085; text-align: center; box-shadow: 0 12rpx 40rpx rgba(31, 50, 81, 0.06); }
.error-copy { display: block; margin-top: 24rpx; color: #dc2626; font-size: 25rpx; text-align: center; }
.back-btn { margin-top: 32rpx; border: 0; border-radius: 20rpx; background: #f5f5f5; color: #666; font-size: 28rpx; }
</style>
