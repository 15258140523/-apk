<script setup lang="ts">
import type { FamilyMember } from '../domain/model'

const props = defineProps<{
  members: FamilyMember[]
  selected: string[]
}>()

const emit = defineEmits<{
  toggle: [memberId: string]
}>()

function isSelected(memberId: string) {
  return props.selected.includes(memberId)
}

function toggle(memberId: string) {
  emit('toggle', memberId)
}
</script>

<template>
  <view class="member-picker">
    <text class="picker-title">提醒成员</text>
    <view v-if="!members.length" class="picker-empty">
      <text class="empty-text">暂无家庭成员</text>
    </view>
    <view
      v-for="member in members"
      :key="member.id"
      class="member-row"
      @click="toggle(member.id)"
    >
      <view class="member-info">
        <text class="member-name">{{ member.displayName }}</text>
        <text class="member-role">{{ member.role === 'owner' ? '创建者' : member.role === 'admin' ? '管理员' : '查看成员' }}</text>
      </view>
      <view :class="['check-box', { checked: isSelected(member.id) }]">
        <text v-if="isSelected(member.id)" class="check-mark">✓</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.member-picker { margin-top: 8rpx; }
.picker-title { display: block; margin-bottom: 16rpx; color: #273247; font-size: 28rpx; font-weight: 650; }
.picker-empty { padding: 20rpx; }
.empty-text { color: #8a94a4; font-size: 24rpx; }
.member-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 24rpx;
  margin-bottom: 8rpx;
  border-radius: 16rpx;
  background: #f9fafb;
}
.member-info { flex: 1; }
.member-name { display: block; color: #273247; font-size: 28rpx; font-weight: 600; }
.member-role { display: block; margin-top: 4rpx; color: #8a94a4; font-size: 22rpx; }
.check-box {
  width: 44rpx;
  height: 44rpx;
  border: 3rpx solid #d0d5dd;
  border-radius: 10rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.check-box.checked { background: #3478f6; border-color: #3478f6; }
.check-mark { color: #fff; font-size: 26rpx; font-weight: 700; }
</style>
