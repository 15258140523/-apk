<script setup lang="ts">
import { computed } from 'vue'
import type { LearningRecord } from '../services/learning'

const props = defineProps<{
  record: LearningRecord
  courseName?: string
}>()

const emit = defineEmits<{ tap: [record: LearningRecord] }>()

const dateText = computed(() => {
  const d = new Date(props.record.createdAt)
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric', day: 'numeric', weekday: 'short',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(d)
})

const hasLinks = computed(() => props.record.cloudLinks.length > 0)
const hasTags = computed(() => props.record.tags.length > 0)
</script>

<template>
  <view class="record-card" @click="emit('tap', record)">
    <view class="record-header">
      <text class="record-course">{{ courseName || '学习记录' }}</text>
      <text class="record-date">{{ dateText }}</text>
    </view>
    <text v-if="record.title" class="record-title">{{ record.title }}</text>
    <text v-if="record.note" class="record-note">{{ record.note }}</text>
    <view v-if="hasTags" class="tag-row">
      <text v-for="tag in record.tags" :key="tag" class="tag">{{ tag }}</text>
    </view>
    <text v-if="hasLinks" class="link-hint">包含网盘链接</text>
  </view>
</template>

<style scoped>
.record-card {
  padding: 28rpx;
  margin-bottom: 16rpx;
  border-radius: 24rpx;
  background: #fff;
  box-shadow: 0 10rpx 30rpx rgba(31, 50, 81, 0.05);
}
.record-header { display: flex; align-items: center; justify-content: space-between; }
.record-course { color: #3478f6; font-size: 24rpx; font-weight: 650; }
.record-date { color: #8a94a4; font-size: 22rpx; }
.record-title { display: block; margin-top: 14rpx; color: #273247; font-size: 30rpx; font-weight: 650; }
.record-note {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-top: 10rpx;
  color: #5a6577;
  font-size: 26rpx;
  line-height: 1.6;
}
.tag-row { display: flex; flex-wrap: wrap; gap: 10rpx; margin-top: 14rpx; }
.tag { padding: 4rpx 14rpx; border-radius: 100rpx; background: #eaf2ff; color: #286bd8; font-size: 22rpx; }
.link-hint { display: block; margin-top: 12rpx; color: #8a94a4; font-size: 22rpx; }
</style>
