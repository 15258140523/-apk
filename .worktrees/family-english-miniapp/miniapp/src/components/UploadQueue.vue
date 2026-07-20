<script setup lang="ts">
import { ref } from 'vue'

interface QueueItem {
  id: string
  name: string
  status: 'queued' | 'compressing' | 'uploading' | 'failed' | 'done'
  progress: number
}

const items = ref<QueueItem[]>([])
const emit = defineEmits<{ remove: [id: string] }>()

function addFile(name: string) {
  items.value.push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name,
    status: 'queued',
    progress: 0,
  })
}

function removeItem(id: string) {
  items.value = items.value.filter((item) => item.id !== id)
  emit('remove', id)
}

function setStatus(id: string, status: QueueItem['status'], progress = 0) {
  const item = items.value.find((i) => i.id === id)
  if (item) {
    item.status = status
    item.progress = progress
  }
}

defineExpose({ addFile, setStatus })
</script>

<template>
  <view v-if="items.length" class="upload-queue">
    <text class="queue-title">附件</text>
    <view v-for="item in items" :key="item.id" class="queue-item">
      <text class="item-name">{{ item.name }}</text>
      <view class="item-status">
        <text v-if="item.status === 'queued'" class="status-text queued">等待中</text>
        <text v-else-if="item.status === 'compressing'" class="status-text">压缩中…</text>
        <text v-else-if="item.status === 'uploading'" class="status-text uploading">上传中 {{ item.progress }}%</text>
        <text v-else-if="item.status === 'failed'" class="status-text failed">失败</text>
        <text v-else class="status-text done">完成</text>
      </view>
      <text v-if="item.status !== 'uploading'" class="remove-btn" @click="removeItem(item.id)">✕</text>
    </view>
  </view>
</template>

<style scoped>
.upload-queue { margin-top: 20rpx; }
.queue-title { display: block; margin-bottom: 12rpx; color: #273247; font-size: 26rpx; font-weight: 650; }
.queue-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx 20rpx;
  margin-bottom: 8rpx;
  border-radius: 14rpx;
  background: #f9fafb;
}
.item-name { flex: 1; color: #273247; font-size: 26rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.status-text { font-size: 22rpx; }
.status-text.queued { color: #8a94a4; }
.status-text.uploading { color: #3478f6; }
.status-text.failed { color: #dc2626; }
.status-text.done { color: #2e7d32; }
.remove-btn { color: #8a94a4; font-size: 28rpx; }
</style>
