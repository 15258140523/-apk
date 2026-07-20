<script setup lang="ts">
import { computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import type { Lesson } from '../../domain/model'
import { useCalendarStore } from '../../stores/calendar'
import { useCoursesStore } from '../../stores/courses'
import { useSessionStore } from '../../stores/session'
import LessonListItem from '../../components/LessonListItem.vue'

const session = useSessionStore()
const calendar = useCalendarStore()
const courseStore = useCoursesStore()

const courseNameMap = computed(() => {
  const map: Record<string, string> = {}
  for (const c of courseStore.courses) {
    map[c.id] = c.name
  }
  return map
})

function openLesson(lesson: Lesson) {
  uni.navigateTo({
    url: `/pages/lesson/adjust?lessonId=${lesson.id}&courseId=${lesson.courseId}`,
  })
}

onShow(async () => {
  if (session.loading) await session.bootstrap()
  if (!session.family) {
    uni.reLaunch({ url: '/pages/bootstrap/index' })
    return
  }
  await Promise.all([courseStore.load(), calendar.loadWeek()])
})

function prevWeek() { calendar.goPrevWeek(); calendar.loadWeek() }
function nextWeek() { calendar.goNextWeek(); calendar.loadWeek() }
function thisWeek() { calendar.goThisWeek(); calendar.loadWeek() }
</script>

<template>
  <view class="page-shell">
    <view class="week-nav">
      <text class="nav-arrow" @click="prevWeek">‹</text>
      <text class="nav-label" @click="thisWeek">{{ calendar.weekLabel }}</text>
      <text class="nav-arrow" @click="nextWeek">›</text>
    </view>

    <view v-if="calendar.loading" class="empty-card">正在加载课程…</view>

    <template v-else>
      <view v-for="day in calendar.dayGroups" :key="day.date" class="day-section">
        <text class="day-label">{{ day.label }}</text>
        <LessonListItem
          v-for="lesson in day.lessons"
          :key="lesson.id"
          :lesson="lesson"
          :course-name="courseNameMap[lesson.courseId]"
          @tap="openLesson"
        />
        <view v-if="!day.lessons.length" class="day-empty">
          <text class="day-empty-text">没有课程</text>
        </view>
      </view>
    </template>

    <text v-if="calendar.error" class="error-copy">{{ calendar.error }}</text>
  </view>
</template>

<style scoped>
.page-shell { min-height: 100vh; padding: 24rpx 28rpx 64rpx; box-sizing: border-box; }
.week-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 36rpx;
  margin-bottom: 32rpx;
}
.nav-arrow { color: #3478f6; font-size: 44rpx; font-weight: 700; }
.nav-label { color: #273247; font-size: 30rpx; font-weight: 650; }
.day-section { margin-bottom: 28rpx; }
.day-label { display: block; margin-bottom: 14rpx; color: #5a6577; font-size: 26rpx; font-weight: 600; }
.day-empty { padding: 20rpx 28rpx; }
.day-empty-text { color: #b0b8c5; font-size: 24rpx; }
.empty-card { padding: 38rpx; border-radius: 28rpx; background: #fff; color: #667085; text-align: center; box-shadow: 0 12rpx 40rpx rgba(31, 50, 81, 0.06); }
.error-copy { display: block; margin-top: 24rpx; color: #dc2626; font-size: 25rpx; }
</style>
