<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { publicMessage } from '../../services/cloud'
import { courseDetail, createCourse, updateCourse } from '../../services/courses'
import { useSessionStore } from '../../stores/session'
import MemberPicker from '../../components/MemberPicker.vue'

const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
const session = useSessionStore()
const courseId = ref('')
const version = ref(0)
const name = ref('')
const remainingLessons = ref('0')
const weekday = ref(6)
const time = ref('10:00')
const reminderMemberIds = ref<string[]>([])
const submitting = ref(false)
const title = computed(() => (courseId.value ? '编辑课程' : '添加课程'))

function onWeekdayChange(event: { detail: { value: string } }) {
  weekday.value = Number(event.detail.value)
}

function onTimeChange(event: { detail: { value: string } }) {
  time.value = event.detail.value
}

function onReminderChange(event: { detail: { value: string[] } }) {
  reminderMemberIds.value = event.detail.value
}

function toggleMember(memberId: string) {
  const idx = reminderMemberIds.value.indexOf(memberId)
  if (idx >= 0) {
    reminderMemberIds.value = reminderMemberIds.value.filter((id) => id !== memberId)
  } else {
    reminderMemberIds.value = [...reminderMemberIds.value, memberId]
  }
}

async function loadExisting() {
  if (!courseId.value || !session.family) return
  const detail = await courseDetail(session.family.familyId, courseId.value)
  name.value = detail.course.name
  remainingLessons.value = String(detail.course.remainingLessons)
  version.value = detail.course.version
  weekday.value = detail.rule?.weekday ?? 6
  time.value = `${String(detail.rule?.hour ?? 10).padStart(2, '0')}:${String(detail.rule?.minute ?? 0).padStart(2, '0')}`
  reminderMemberIds.value = detail.reminderMemberIds
}

async function submit() {
  if (!session.family || submitting.value) return
  const [hour, minute] = time.value.split(':').map(Number)
  const input = {
    familyId: session.family.familyId,
    name: name.value,
    remainingLessons: Number(remainingLessons.value),
    weeklyRule: { weekday: weekday.value, hour, minute },
    reminderMemberIds: reminderMemberIds.value,
  }
  submitting.value = true
  try {
    if (courseId.value) {
      await updateCourse({ ...input, courseId: courseId.value, version: version.value })
    } else {
      await createCourse(input)
    }
    uni.reLaunch({ url: '/pages/home/index' })
  } catch (error) {
    uni.showToast({ title: publicMessage(error), icon: 'none' })
  } finally {
    submitting.value = false
  }
}

onLoad((options) => {
  courseId.value = typeof options?.courseId === 'string' ? options.courseId : ''
})

onShow(async () => {
  await session.loadMembers()
  await loadExisting()
})
</script>

<template>
  <view class="page-shell">
    <text class="page-title">{{ title }}</text>
    <text class="page-copy">每门课程分别设置课时、固定时间和提醒家人。</text>

    <view class="form-card">
      <text class="field-label">课程名称</text>
      <input v-model="name" class="text-input" maxlength="30" placeholder="例如：外教口语" />

      <text class="field-label">当前剩余课时</text>
      <input v-model="remainingLessons" class="text-input" type="number" placeholder="0" />

      <text class="field-label">每周固定上课日</text>
      <picker :range="weekdays" :value="weekday" @change="onWeekdayChange">
        <view class="picker-field">{{ weekdays[weekday] }} <text>›</text></view>
      </picker>

      <text class="field-label">固定上课时间</text>
      <picker mode="time" :value="time" @change="onTimeChange">
        <view class="picker-field">{{ time }} <text>›</text></view>
      </picker>

      <MemberPicker
        :members="session.members"
        :selected="reminderMemberIds"
        @toggle="toggleMember"
      />
    </view>

    <button
      class="primary-button"
      :disabled="!name.trim() || submitting"
      @click="submit"
    >
      {{ submitting ? '正在保存…' : '保存课程' }}
    </button>
  </view>
</template>

<style scoped>
.page-shell { min-height: 100vh; padding: 36rpx 28rpx 64rpx; box-sizing: border-box; }
.page-title { display: block; color: #172033; font-size: 42rpx; font-weight: 750; }
.page-copy { display: block; margin-top: 10rpx; color: #7a8495; font-size: 25rpx; }
.form-card { margin-top: 30rpx; padding: 32rpx; border-radius: 28rpx; background: #fff; }
.field-label { display: block; margin: 30rpx 0 14rpx; color: #39455a; font-size: 27rpx; font-weight: 650; }
.field-label:first-child { margin-top: 0; }
.text-input, .picker-field { height: 90rpx; box-sizing: border-box; padding: 0 24rpx; border: 2rpx solid #dce3ed; border-radius: 18rpx; background: #fbfcfe; font-size: 29rpx; }
.picker-field { display: flex; align-items: center; justify-content: space-between; }
.member-options { display: flex; flex-wrap: wrap; gap: 16rpx; }
.member-option { display: flex; align-items: center; gap: 10rpx; padding: 18rpx 22rpx; border-radius: 18rpx; background: #f4f7fb; font-size: 27rpx; }
.primary-button { margin-top: 30rpx; border: 0; border-radius: 22rpx; background: #3478f6; color: #fff; font-size: 30rpx; font-weight: 700; }
.primary-button[disabled] { background: #aac5f7; }
</style>
