<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useSessionStore } from '../../stores/session'
import { createExport } from '../../services/exports'
import { publicMessage } from '../../services/cloud'

const session = useSessionStore()

const canManage = computed(() => session.currentMember?.role === 'owner')
const isOwner = computed(() => session.currentMember?.role === 'owner')

const exporting = ref(false)
const exportError = ref('')

const childNameConfirm = ref('')
const showDeleteConfirm = ref(false)

const familyMembers = computed(() => session.members)

function goMemberManagement() {
  uni.navigateTo({ url: '/pages/family/member' })
}

async function doExport() {
  if (!session.family || exporting.value) return
  exporting.value = true
  exportError.value = ''
  try {
    const result = await createExport(session.family.familyId)
    const json = JSON.stringify(result.data, null, 2)
    uni.setClipboardData({
      data: json,
      success: () => {
        uni.showToast({ title: '已复制到剪贴板', icon: 'success' })
      },
    })
  } catch (cause) {
    exportError.value = publicMessage(cause)
  } finally {
    exporting.value = false
  }
}

async function doDeleteFamily() {
  if (!session.family) return
  if (childNameConfirm.value !== session.family.childName) {
    uni.showToast({ title: '请输入正确的孩子昵称', icon: 'none' })
    return
  }
  try {
    await session.requestDelete()
    uni.showToast({ title: '家庭已进入删除流程', icon: 'none' })
    showDeleteConfirm.value = false
  } catch (cause) {
    uni.showToast({ title: publicMessage(cause), icon: 'none' })
  }
}

onShow(async () => {
  if (session.loading) await session.bootstrap()
  if (!session.family) {
    uni.reLaunch({ url: '/pages/bootstrap/index' })
    return
  }
  await session.loadMembers()
})
</script>

<template>
  <view class="page-shell">
    <text class="page-title">家庭</text>

    <view class="info-card">
      <text class="info-label">孩子</text>
      <text class="info-value">{{ session.family?.childName }}</text>
      <text class="info-label">你的角色</text>
      <text class="info-value">
        {{ session.currentMember?.role === 'owner' ? '创建者' : session.currentMember?.role === 'admin' ? '管理员' : '查看成员' }}
      </text>
    </view>

    <view class="section">
      <text class="section-title">家庭成员</text>
      <view
        v-for="member in familyMembers"
        :key="member.id"
        class="member-row"
      >
        <text class="member-name">{{ member.displayName }}</text>
        <text class="member-role">
          {{ member.role === 'owner' ? '创建者' : member.role === 'admin' ? '管理员' : '查看成员' }}
        </text>
      </view>
      <button v-if="isOwner" class="link-button" @click="goMemberManagement">管理成员</button>
    </view>

    <view class="section">
      <text class="section-title">数据</text>
      <button class="action-button" :disabled="exporting" @click="doExport">
        {{ exporting ? '正在导出…' : '导出数据' }}
      </button>
      <text v-if="exportError" class="error-copy">{{ exportError }}</text>
    </view>

    <view v-if="isOwner" class="section danger-section">
      <text class="section-title">危险操作</text>
      <button class="danger-button" @click="showDeleteConfirm = true">删除家庭</button>
    </view>

    <view v-if="showDeleteConfirm" class="modal-overlay" @click.self="showDeleteConfirm = false">
      <view class="modal-card">
        <text class="modal-title">确认删除家庭？</text>
        <text class="modal-copy">此操作将进入30天延迟删除流程，期间可恢复。请输入孩子昵称确认：</text>
        <input v-model="childNameConfirm" class="confirm-input" :placeholder="session.family?.childName" />
        <view class="modal-actions">
          <button class="modal-btn cancel" @click="showDeleteConfirm = false">取消</button>
          <button class="modal-btn danger" :disabled="childNameConfirm !== session.family?.childName" @click="doDeleteFamily">确认删除</button>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page-shell { min-height: 100vh; padding: 24rpx 28rpx 64rpx; box-sizing: border-box; }
.page-title { display: block; margin-bottom: 28rpx; color: #172033; font-size: 40rpx; font-weight: 750; }
.info-card {
  padding: 28rpx 32rpx;
  border-radius: 24rpx;
  background: #fff;
  box-shadow: 0 10rpx 30rpx rgba(31, 50, 81, 0.05);
}
.info-label { display: block; color: #8a94a4; font-size: 24rpx; }
.info-value { display: block; margin-bottom: 16rpx; color: #273247; font-size: 30rpx; font-weight: 650; }
.info-value:last-child { margin-bottom: 0; }
.section { margin-top: 32rpx; }
.section-title { display: block; margin-bottom: 16rpx; color: #273247; font-size: 30rpx; font-weight: 700; }
.member-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 24rpx;
  margin-bottom: 10rpx;
  border-radius: 18rpx;
  background: #fff;
  box-shadow: 0 8rpx 24rpx rgba(31, 50, 81, 0.04);
}
.member-name { color: #273247; font-size: 28rpx; font-weight: 600; }
.member-role { color: #8a94a4; font-size: 24rpx; }
.link-button { margin-top: 12rpx; border: 0; background: transparent; color: #3478f6; font-size: 26rpx; font-weight: 600; }
.action-button {
  border: 0;
  border-radius: 20rpx;
  background: #eaf2ff;
  color: #286bd8;
  font-size: 28rpx;
  font-weight: 650;
}
.danger-section { margin-top: 48rpx; }
.danger-button { border: 0; border-radius: 20rpx; background: #fce4ec; color: #c62828; font-size: 28rpx; font-weight: 650; }
.error-copy { display: block; margin-top: 12rpx; color: #dc2626; font-size: 24rpx; }
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}
.modal-card {
  width: 80%;
  max-width: 600rpx;
  padding: 40rpx 32rpx;
  border-radius: 28rpx;
  background: #fff;
}
.modal-title { display: block; color: #273247; font-size: 34rpx; font-weight: 750; }
.modal-copy { display: block; margin-top: 16rpx; color: #5a6577; font-size: 26rpx; line-height: 1.6; }
.confirm-input {
  margin-top: 20rpx;
  height: 80rpx;
  padding: 0 20rpx;
  border: 2rpx solid #dce3ed;
  border-radius: 16rpx;
  font-size: 28rpx;
}
.modal-actions { display: flex; gap: 16rpx; margin-top: 28rpx; }
.modal-btn { flex: 1; border: 0; border-radius: 18rpx; font-size: 28rpx; font-weight: 650; }
.modal-btn.cancel { background: #f5f5f5; color: #666; }
.modal-btn.danger { background: #c62828; color: #fff; }
.modal-btn[disabled] { opacity: 0.45; }
</style>
