<script setup lang="ts">
import { computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { createInvite } from '../../services/family'
import { publicMessage } from '../../services/cloud'
import { useSessionStore } from '../../stores/session'

const session = useSessionStore()
const isOwner = computed(() => session.currentMember?.role === 'owner')

async function copyInvite() {
  if (!session.family) return
  try {
    const result = await createInvite(session.family.familyId)
    await uni.setClipboardData({
      data: `/pages/bootstrap/index?invite=${encodeURIComponent(result.token)}`,
    })
    uni.showToast({ title: '邀请信息已复制', icon: 'success' })
  } catch (error) {
    uni.showToast({ title: publicMessage(error), icon: 'none' })
  }
}

async function setRole(memberId: string, role: 'admin' | 'viewer') {
  try {
    await session.changeRole(memberId, role)
  } catch (error) {
    uni.showToast({ title: publicMessage(error), icon: 'none' })
  }
}

async function remove(memberId: string) {
  const result = await uni.showModal({
    title: '移除家庭成员',
    content: '移除后，对方将不能再查看这个家庭的课程和学习记录。',
    confirmText: '确认移除',
  })
  if (!result.confirm) return
  try {
    await session.removeMember(memberId)
  } catch (error) {
    uni.showToast({ title: publicMessage(error), icon: 'none' })
  }
}

onShow(() => session.loadMembers())
</script>

<template>
  <view class="page-shell">
    <view class="header-row">
      <view>
        <text class="page-title">家庭成员</text>
        <text class="page-copy">一个家庭可设置多位管理员</text>
      </view>
      <button class="invite-button" size="mini" @click="copyInvite">邀请家人</button>
    </view>

    <view class="member-list">
      <view v-for="member in session.members" :key="member.id" class="member-card">
        <view class="avatar">{{ member.displayName.slice(0, 1) }}</view>
        <view class="member-main">
          <text class="member-name">{{ member.displayName }}</text>
          <text class="role-label">
            {{ member.role === 'owner' ? '家庭所有者' : member.role === 'admin' ? '管理员' : '只读成员' }}
          </text>
        </view>

        <view v-if="isOwner && member.role !== 'owner'" class="member-actions">
          <button
            class="role-button"
            size="mini"
            :class="{ active: member.role === 'admin' }"
            @click="setRole(member.id, 'admin')"
          >管理员</button>
          <button
            class="role-button"
            size="mini"
            :class="{ active: member.role === 'viewer' }"
            @click="setRole(member.id, 'viewer')"
          >只读</button>
          <button class="remove-button" size="mini" @click="remove(member.id)">移除</button>
        </view>
      </view>
    </view>

    <view v-if="!isOwner" class="permission-note">
      只有家庭所有者可以调整管理员和只读成员角色。
    </view>
  </view>
</template>

<style scoped>
.page-shell { min-height: 100vh; padding: 36rpx 28rpx; box-sizing: border-box; }
.header-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 32rpx; }
.page-title { display: block; color: #172033; font-size: 42rpx; font-weight: 700; }
.page-copy { display: block; margin-top: 10rpx; color: #7a8495; font-size: 25rpx; }
.invite-button { margin: 0; border-radius: 18rpx; background: #3478f6; color: #fff; }
.member-list { display: flex; flex-direction: column; gap: 20rpx; }
.member-card { display: flex; align-items: center; padding: 28rpx; border-radius: 24rpx; background: #fff; box-shadow: 0 10rpx 30rpx rgba(31, 50, 81, 0.06); }
.avatar { display: flex; width: 76rpx; height: 76rpx; align-items: center; justify-content: center; border-radius: 50%; background: #eaf2ff; color: #3478f6; font-weight: 700; }
.member-main { flex: 1; margin-left: 22rpx; }
.member-name { display: block; font-size: 30rpx; font-weight: 650; }
.role-label { display: block; margin-top: 8rpx; color: #7a8495; font-size: 24rpx; }
.member-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; width: 280rpx; gap: 8rpx; }
.role-button, .remove-button { margin: 0; border-radius: 14rpx; font-size: 22rpx; }
.role-button.active { background: #eaf2ff; color: #2563eb; }
.remove-button { color: #dc2626; }
.permission-note { margin-top: 28rpx; padding: 24rpx; border-radius: 20rpx; background: #eef2f7; color: #667085; font-size: 25rpx; line-height: 1.6; }
</style>
