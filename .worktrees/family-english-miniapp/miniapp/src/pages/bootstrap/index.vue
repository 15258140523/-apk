<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { useSessionStore } from '../../stores/session'

const session = useSessionStore()
const childName = ref('')
const submitting = ref(false)
const joined = computed(() => Boolean(session.family))

function requestId() {
  return `family-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

async function submitCreate() {
  const value = childName.value.trim()
  if (!value || submitting.value) return
  submitting.value = true
  try {
    await session.createFamily(value, requestId())
    uni.reLaunch({ url: '/pages/home/index' })
  } finally {
    submitting.value = false
  }
}

onLoad(async (options) => {
  const token = typeof options?.invite === 'string' ? options.invite : ''
  if (token && !session.family) {
    await session.acceptInvite(token)
  }
})

onShow(() => {
  if (session.family) {
    uni.reLaunch({ url: '/pages/home/index' })
  }
})
</script>

<template>
  <view class="page-shell">
    <view v-if="session.loading" class="state-card loading-state">
      <view class="spinner" />
      <text class="state-title">正在打开家庭学习账本</text>
      <text class="state-copy">同步课程和家庭成员…</text>
    </view>

    <view v-else-if="!joined" class="state-card">
      <text class="eyebrow">英语学习账本</text>
      <text class="page-title">先创建孩子的学习空间</text>
      <text class="state-copy">以后可以邀请家人一起记录课程、课时和学习资料。</text>

      <label class="field-label" for="child-name">孩子昵称</label>
      <input
        id="child-name"
        v-model="childName"
        class="text-input"
        maxlength="20"
        placeholder="例如：果果"
      />
      <button
        class="primary-button"
        :disabled="!childName.trim() || submitting"
        @click="submitCreate"
      >
        {{ submitting ? '正在创建…' : '创建家庭学习空间' }}
      </button>
      <text v-if="session.error" class="error-copy">{{ session.error }}</text>
    </view>

    <view v-else class="state-card loading-state">
      <text class="state-title">家庭已加入</text>
      <text class="state-copy">正在进入 {{ session.family?.childName }} 的课程首页…</text>
    </view>
  </view>
</template>

<style scoped>
.page-shell {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 96rpx 32rpx 48rpx;
  background: linear-gradient(180deg, #eef6ff 0%, #f7f8fc 48%, #f7f8fc 100%);
}

.state-card {
  padding: 52rpx 40rpx;
  border-radius: 32rpx;
  background: #fff;
  box-shadow: 0 24rpx 70rpx rgba(37, 74, 122, 0.12);
}

.loading-state {
  display: flex;
  min-height: 340rpx;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  text-align: center;
}

.spinner {
  width: 64rpx;
  height: 64rpx;
  margin-bottom: 28rpx;
  border: 8rpx solid #dbeafe;
  border-top-color: #3478f6;
  border-radius: 50%;
}

.eyebrow {
  display: block;
  margin-bottom: 16rpx;
  color: #3478f6;
  font-size: 26rpx;
  font-weight: 700;
}

.page-title,
.state-title {
  display: block;
  color: #172033;
  font-size: 44rpx;
  font-weight: 700;
  line-height: 1.3;
}

.state-copy {
  display: block;
  margin-top: 18rpx;
  color: #687386;
  font-size: 28rpx;
  line-height: 1.7;
}

.field-label {
  display: block;
  margin: 48rpx 0 16rpx;
  color: #374151;
  font-size: 28rpx;
  font-weight: 600;
}

.text-input {
  height: 96rpx;
  padding: 0 28rpx;
  border: 2rpx solid #dce3ed;
  border-radius: 22rpx;
  background: #fbfcfe;
  font-size: 32rpx;
}

.primary-button {
  margin-top: 32rpx;
  border: 0;
  border-radius: 22rpx;
  background: #3478f6;
  color: #fff;
  font-size: 30rpx;
  font-weight: 700;
}

.primary-button[disabled] {
  background: #aac5f7;
  color: #f8fbff;
}

.error-copy {
  display: block;
  margin-top: 22rpx;
  color: #dc2626;
  font-size: 26rpx;
}
</style>
