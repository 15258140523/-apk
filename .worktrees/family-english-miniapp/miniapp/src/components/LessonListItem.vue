<script setup lang="ts">
import { computed } from 'vue'
import type { Lesson } from '../domain/model'

const props = defineProps<{ lesson: Lesson; courseName?: string }>()
const emit = defineEmits<{ tap: [lesson: Lesson] }>()

const timeText = computed(() => {
  const d = new Date(props.lesson.actualAt)
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d)
})

const statusLabel = computed(() => {
  const map: Record<string, string> = {
    pending: '',
    completed: '已完成',
    leave: '已请假',
    cancelled: '已取消',
    rescheduled: '已改期',
  }
  return map[props.lesson.status] ?? ''
})

const statusClass = computed(() => `status-${props.lesson.status}`)
</script>

<template>
  <view class="lesson-row" :class="{ dimmed: lesson.status !== 'pending' && lesson.status !== 'rescheduled' }" @click="emit('tap', lesson)">
    <view class="lesson-time-col">
      <text class="lesson-time">{{ timeText }}</text>
    </view>
    <view class="lesson-info">
      <text class="lesson-course">{{ courseName || '课程' }}</text>
      <text v-if="statusLabel" :class="['lesson-status', statusClass]">{{ statusLabel }}</text>
    </view>
    <text class="lesson-arrow">›</text>
  </view>
</template>

<style scoped>
.lesson-row {
  display: flex;
  align-items: center;
  padding: 24rpx 28rpx;
  margin-bottom: 12rpx;
  border-radius: 20rpx;
  background: #fff;
  box-shadow: 0 8rpx 24rpx rgba(31, 50, 81, 0.05);
}
.lesson-row.dimmed { opacity: 0.55; }
.lesson-time-col { width: 100rpx; }
.lesson-time { color: #273247; font-size: 28rpx; font-weight: 650; }
.lesson-info { flex: 1; }
.lesson-course { display: block; color: #202b3c; font-size: 28rpx; font-weight: 600; }
.lesson-status {
  display: inline-block;
  margin-top: 6rpx;
  padding: 4rpx 14rpx;
  border-radius: 100rpx;
  font-size: 22rpx;
}
.status-completed { background: #e8f5e9; color: #2e7d32; }
.status-leave { background: #fff3e0; color: #e65100; }
.status-cancelled { background: #fce4ec; color: #c62828; }
.status-rescheduled { background: #e3f2fd; color: #1565c0; }
.lesson-arrow { color: #c0c6d0; font-size: 32rpx; }
</style>
