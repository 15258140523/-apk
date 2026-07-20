<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import type { Lesson } from '../../domain/model'
import { useSessionStore } from '../../stores/session'
import { lessonDetail, completeLesson } from '../../services/lessons'
import { publicMessage } from '../../services/cloud'

const session = useSessionStore()

const lessonId = ref('')
const lesson = ref<Lesson | null>(null)
const courseName = ref('')
const remainingLessons = ref(0)
const loading = ref(true)
const submitting = ref(false)
const error = ref('')
const completed = ref(false)
const newBalance = ref(0)

const balanceTransition = computed(() => {
  return `${remainingLessons.value} → ${remainingLessons.value - 1}`
})

const canComplete = computed(() => {
  if (!lesson.value) return false
  return ['pending', 'rescheduled'].includes(lesson.value.status)
})

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

onLoad((options) => {
  lessonId.value = options?.lessonId ?? ''
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

async function doComplete(addRecord: boolean) {
  if (!session.family || !lesson.value || submitting.value) return
  submitting.value = true
  error.value = ''
  try {
    const result = await completeLesson(session.family.familyId, lessonId.value, generateId())
    lesson.value = result.lesson
    newBalance.value = result.remainingLessons
    completed.value = true
    uni.showToast({ title: '扣课成功', icon: 'success' })
    if (addRecord) {
      // TODO: navigate to learning record editor in Task 10
      uni.showToast({ title: '学习记录将在后续版本接入', icon: 'none' })
    }
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
      <view v-if="!completed" class="confirm-card">
        <text class="course-label">{{ courseName }}</text>
        <text class="confirm-title">确认完成本次课程？</text>

        <view class="balance-preview">
          <text class="balance-label">剩余课时</text>
          <text class="balance-change">{{ balanceTransition }}</text>
        </view>

        <text class="hint">确认后将扣除一次课时</text>

        <view v-if="remainingLessons <= 0" class="warning-card">
          <text class="warning-text">课时已用完，请先续课</text>
        </view>

        <template v-else>
          <button
            class="action-btn primary"
            :disabled="submitting || !canComplete"
            @click="doComplete(true)"
          >
            完成并添加学习记录
          </button>
          <button
            class="action-btn secondary"
            :disabled="submitting || !canComplete"
            @click="doComplete(false)"
          >
            仅扣除课时
          </button>
        </template>
      </view>

      <view v-else class="done-card">
        <text class="done-title">扣课成功</text>
        <text class="done-balance">剩余 {{ newBalance }} 课时</text>
      </view>
    </template>

    <text v-if="error" class="error-copy">{{ error }}</text>

    <button class="back-btn" @click="goBack">返回</button>
  </view>
</template>

<style scoped>
.page-shell { min-height: 100vh; padding: 28rpx 28rpx 64rpx; box-sizing: border-box; }
.confirm-card {
  padding: 40rpx 36rpx;
  border-radius: 28rpx;
  background: #fff;
  box-shadow: 0 12rpx 40rpx rgba(31, 50, 81, 0.06);
}
.course-label { display: block; color: #8a94a4; font-size: 26rpx; }
.confirm-title { display: block; margin-top: 12rpx; color: #273247; font-size: 40rpx; font-weight: 750; }

.balance-preview {
  margin: 36rpx 0;
  padding: 28rpx;
  border-radius: 20rpx;
  background: #f5f6f8;
  text-align: center;
}
.balance-label { display: block; color: #8a94a4; font-size: 24rpx; }
.balance-change { display: block; margin-top: 10rpx; color: #3478f6; font-size: 44rpx; font-weight: 750; }

.hint { display: block; margin-bottom: 28rpx; color: #8a94a4; font-size: 24rpx; text-align: center; }

.warning-card {
  margin-bottom: 24rpx;
  padding: 24rpx;
  border-radius: 16rpx;
  background: #fff3e0;
  text-align: center;
}
.warning-text { color: #e65100; font-size: 28rpx; font-weight: 600; }

.action-btn {
  margin-bottom: 16rpx;
  border: 0;
  border-radius: 22rpx;
  font-size: 30rpx;
  font-weight: 700;
}
.action-btn.primary { background: #3478f6; color: #fff; }
.action-btn.secondary { background: #f5f5f5; color: #273247; }
.action-btn[disabled] { opacity: 0.45; }

.done-card {
  padding: 48rpx 36rpx;
  border-radius: 28rpx;
  background: #e8f5e9;
  text-align: center;
}
.done-title { display: block; color: #2e7d32; font-size: 40rpx; font-weight: 750; }
.done-balance { display: block; margin-top: 16rpx; color: #388e3c; font-size: 30rpx; }

.empty-card { padding: 38rpx; border-radius: 28rpx; background: #fff; color: #667085; text-align: center; box-shadow: 0 12rpx 40rpx rgba(31, 50, 81, 0.06); }
.error-copy { display: block; margin-top: 24rpx; color: #dc2626; font-size: 25rpx; text-align: center; }
.back-btn { margin-top: 32rpx; border: 0; border-radius: 20rpx; background: #f5f5f5; color: #666; font-size: 28rpx; }
</style>
