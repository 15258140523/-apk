<script setup lang="ts">
import { computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import type { Course } from '../../domain/model'
import CourseHeroCard from '../../components/CourseHeroCard.vue'
import { useCoursesStore } from '../../stores/courses'
import { useSessionStore } from '../../stores/session'

const session = useSessionStore()
const courseStore = useCoursesStore()
const canEdit = computed(() => ['owner', 'admin'].includes(session.currentMember?.role ?? ''))

function openCourse(course: Course) {
  uni.navigateTo({ url: `/pages/course/edit?courseId=${course.id}` })
}

function addCourse() {
  uni.navigateTo({ url: '/pages/course/edit' })
}

function beginCompletion(course: Course) {
  if (!course.nextLesson) return
  uni.navigateTo({
    url: `/pages/course/detail?lessonId=${course.nextLesson.id}`,
  })
}

onShow(async () => {
  if (session.loading) await session.bootstrap()
  if (!session.family) {
    uni.reLaunch({ url: '/pages/bootstrap/index' })
    return
  }
  await courseStore.load()
})
</script>

<template>
  <view class="page-shell">
    <view class="page-header">
      <view>
        <text class="greeting">{{ session.family?.childName }}的英语学习</text>
        <text class="subheading">今天也记录一点进步</text>
      </view>
      <button v-if="canEdit" class="add-button" size="mini" @click="addCourse">＋ 课程</button>
    </view>

    <view v-if="courseStore.loading" class="empty-card">正在同步课程…</view>

    <template v-else>
      <CourseHeroCard
        v-if="courseStore.nextCourse"
        :course="courseStore.nextCourse"
        @complete="beginCompletion"
      />

      <view v-else class="empty-card">
        <text class="empty-title">还没有待上的课程</text>
        <text class="empty-copy">添加一门课程，设置剩余课时和每周固定时间。</text>
        <button v-if="canEdit" class="primary-button" @click="addCourse">添加第一门课程</button>
      </view>

      <view v-if="courseStore.otherCourses.length" class="section">
        <text class="section-title">其他课程</text>
        <view
          v-for="course in courseStore.otherCourses"
          :key="course.id"
          class="course-row"
          @click="openCourse(course)"
        >
          <view>
            <text class="course-name">{{ course.name }}</text>
            <text class="course-meta">
              {{ course.nextLesson ? '已安排下一节课' : '暂未排课' }}
            </text>
          </view>
          <text class="course-balance">{{ course.remainingLessons }} 课时 ›</text>
        </view>
      </view>

      <view class="section">
        <text class="section-title">最近学习记录</text>
        <view class="learning-preview">
          <text class="preview-title">还没有学习记录</text>
          <text class="preview-copy">完成课程后，可以记录课堂表现、课件、图片和视频。</text>
        </view>
      </view>
    </template>

    <text v-if="courseStore.error" class="error-copy">{{ courseStore.error }}</text>
  </view>
</template>

<style scoped>
.page-shell { min-height: 100vh; padding: 32rpx 28rpx 64rpx; box-sizing: border-box; }
.page-header { display: flex; align-items: center; justify-content: space-between; margin: 18rpx 4rpx 34rpx; }
.greeting { display: block; color: #172033; font-size: 40rpx; font-weight: 750; }
.subheading { display: block; margin-top: 8rpx; color: #7a8495; font-size: 25rpx; }
.add-button { margin: 0; border-radius: 18rpx; background: #eaf2ff; color: #286bd8; font-weight: 650; }
.empty-card, .learning-preview { padding: 38rpx; border-radius: 28rpx; background: #fff; color: #667085; box-shadow: 0 12rpx 40rpx rgba(31, 50, 81, 0.06); }
.empty-title, .preview-title { display: block; color: #273247; font-size: 31rpx; font-weight: 700; }
.empty-copy, .preview-copy { display: block; margin-top: 12rpx; font-size: 26rpx; line-height: 1.6; }
.primary-button { margin-top: 28rpx; border: 0; border-radius: 20rpx; background: #3478f6; color: #fff; }
.section { margin-top: 42rpx; }
.section-title { display: block; margin: 0 4rpx 18rpx; color: #273247; font-size: 31rpx; font-weight: 700; }
.course-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16rpx; padding: 28rpx; border-radius: 24rpx; background: #fff; box-shadow: 0 10rpx 30rpx rgba(31, 50, 81, 0.05); }
.course-name { display: block; color: #202b3c; font-size: 30rpx; font-weight: 650; }
.course-meta { display: block; margin-top: 8rpx; color: #8a94a4; font-size: 24rpx; }
.course-balance { color: #3478f6; font-size: 26rpx; font-weight: 650; }
.error-copy { display: block; margin-top: 24rpx; color: #dc2626; font-size: 25rpx; }
</style>
