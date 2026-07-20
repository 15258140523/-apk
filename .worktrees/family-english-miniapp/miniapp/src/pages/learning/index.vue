<script setup lang="ts">
import { computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import type { LearningRecord } from '../../services/learning'
import { useLearningStore } from '../../stores/learning'
import { useCoursesStore } from '../../stores/courses'
import { useSessionStore } from '../../stores/session'
import LearningRecordCard from '../../components/LearningRecordCard.vue'

const session = useSessionStore()
const learning = useLearningStore()
const courseStore = useCoursesStore()

const canEdit = computed(() => ['owner', 'admin'].includes(session.currentMember?.role ?? ''))

const courseNameMap = computed(() => {
  const map: Record<string, string> = {}
  for (const c of courseStore.courses) {
    map[c.id] = c.name
  }
  return map
})

function onFilterChange(e: { detail: { value: string } }) {
  learning.setFilter(e.detail.value)
  learning.load()
}

function openRecord(record: LearningRecord) {
  uni.navigateTo({
    url: `/pages/learning/edit?recordId=${record.id}`,
  })
}

function addRecord() {
  uni.navigateTo({ url: '/pages/learning/edit' })
}

onShow(async () => {
  if (session.loading) await session.bootstrap()
  if (!session.family) {
    uni.reLaunch({ url: '/pages/bootstrap/index' })
    return
  }
  await Promise.all([courseStore.load(), learning.load()])
})
</script>

<template>
  <view class="page-shell">
    <view class="page-header">
      <text class="page-title">成长记录</text>
      <button v-if="canEdit" class="add-button" size="mini" @click="addRecord">+ 记录</button>
    </view>

    <picker
      :range="courseStore.courses.map(c => c.name)"
      :value="courseStore.courses.findIndex(c => c.id === learning.filterCourseId)"
      @change="onFilterChange"
    >
      <view class="filter-bar">
        <text class="filter-text">
          {{ learning.filterCourseId ? (courseNameMap[learning.filterCourseId] || '全部课程') : '全部课程' }}
        </text>
        <text class="filter-arrow">›</text>
      </view>
    </picker>

    <view v-if="learning.loading" class="empty-card">正在加载…</view>

    <template v-else>
      <LearningRecordCard
        v-for="record in learning.records"
        :key="record.id"
        :record="record"
        :course-name="courseNameMap[record.courseId]"
        @tap="openRecord"
      />

      <view v-if="!learning.records.length" class="empty-card">
        <text class="empty-title">还没有学习记录</text>
        <text class="empty-copy">完成课程后，可以记录课堂表现和学习收获。</text>
      </view>

      <view v-if="learning.nextCursor" class="load-more" @click="learning.loadMore">
        <text class="load-more-text">{{ learning.loadingMore ? '加载中…' : '加载更多' }}</text>
      </view>
    </template>

    <text v-if="learning.error" class="error-copy">{{ learning.error }}</text>
  </view>
</template>

<style scoped>
.page-shell { min-height: 100vh; padding: 24rpx 28rpx 64rpx; box-sizing: border-box; }
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24rpx; }
.page-title { color: #172033; font-size: 40rpx; font-weight: 750; }
.add-button { margin: 0; border-radius: 18rpx; background: #eaf2ff; color: #286bd8; font-weight: 650; }
.filter-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18rpx 24rpx;
  margin-bottom: 20rpx;
  border-radius: 16rpx;
  background: #f5f6f8;
}
.filter-text { color: #273247; font-size: 26rpx; }
.filter-arrow { color: #8a94a4; font-size: 28rpx; }
.empty-card { padding: 38rpx; border-radius: 28rpx; background: #fff; color: #667085; text-align: center; box-shadow: 0 12rpx 40rpx rgba(31, 50, 81, 0.06); }
.empty-title { display: block; color: #273247; font-size: 31rpx; font-weight: 700; }
.empty-copy { display: block; margin-top: 12rpx; font-size: 26rpx; line-height: 1.6; }
.load-more { padding: 24rpx; text-align: center; }
.load-more-text { color: #3478f6; font-size: 26rpx; }
.error-copy { display: block; margin-top: 24rpx; color: #dc2626; font-size: 25rpx; }
</style>
