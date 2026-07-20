<script setup lang="ts">
import { computed } from 'vue'
import type { Course } from '../domain/model'

const props = defineProps<{ course: Course }>()
const emit = defineEmits<{ complete: [course: Course] }>()

const lessonTime = computed(() => {
  if (!props.course.nextLesson) return '暂未排课'
  const date = new Date(props.course.nextLesson.actualAt)
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
})
</script>

<template>
  <view class="hero-card">
    <view class="hero-topline">
      <text class="next-label">下一节课</text>
      <text class="balance">剩余 {{ course.remainingLessons }} 课时</text>
    </view>
    <text class="course-name">{{ course.name }}</text>
    <text class="lesson-time">{{ lessonTime }}</text>
    <button
      class="complete-button"
      data-action="complete"
      @click="emit('complete', course)"
    >
      完成本次课程
    </button>
  </view>
</template>

<style scoped>
.hero-card {
  padding: 36rpx;
  overflow: hidden;
  border-radius: 32rpx;
  background: linear-gradient(145deg, #2f76ed 0%, #5a8ff2 100%);
  color: #fff;
  box-shadow: 0 24rpx 56rpx rgba(52, 120, 246, 0.26);
}

.hero-topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.next-label {
  padding: 9rpx 18rpx;
  border-radius: 100rpx;
  background: rgba(255, 255, 255, 0.18);
  font-size: 24rpx;
}

.balance { font-size: 26rpx; opacity: 0.9; }
.course-name { display: block; margin-top: 34rpx; font-size: 48rpx; font-weight: 750; }
.lesson-time { display: block; margin-top: 14rpx; font-size: 30rpx; opacity: 0.92; }
.complete-button {
  margin-top: 38rpx;
  border: 0;
  border-radius: 22rpx;
  background: #fff;
  color: #2467d5;
  font-size: 30rpx;
  font-weight: 700;
}
</style>
