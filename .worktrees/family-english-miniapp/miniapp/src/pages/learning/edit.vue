<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useSessionStore } from '../../stores/session'
import { useCoursesStore } from '../../stores/courses'
import { recordDetail, saveRecord } from '../../services/learning'
import { publicMessage } from '../../services/cloud'

const session = useSessionStore()
const courseStore = useCoursesStore()

const recordId = ref('')
const courseId = ref('')
const lessonId = ref('')
const title = ref('')
const note = ref('')
const tags = ref<string[]>([])
const cloudLinks = ref<string[]>([])
const loading = ref(true)
const submitting = ref(false)
const error = ref('')

const newTag = ref('')
const newLink = ref('')

function addTag() {
  const tag = newTag.value.trim()
  if (tag && !tags.value.includes(tag)) {
    tags.value = [...tags.value, tag]
    newTag.value = ''
  }
}

function removeTag(tag: string) {
  tags.value = tags.value.filter((t) => t !== tag)
}

function addLink() {
  const link = newLink.value.trim()
  if (link && !cloudLinks.value.includes(link)) {
    cloudLinks.value = [...cloudLinks.value, link]
    newLink.value = ''
  }
}

function removeLink(link: string) {
  cloudLinks.value = cloudLinks.value.filter((l) => l !== link)
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

async function submit() {
  if (!session.family || submitting.value) return
  if (!courseId.value) {
    error.value = '请选择课程'
    return
  }
  submitting.value = true
  error.value = ''
  try {
    await saveRecord(
      session.family.familyId,
      {
        id: recordId.value || undefined,
        courseId: courseId.value,
        lessonId: lessonId.value || undefined,
        title: title.value,
        note: note.value,
        tags: tags.value,
        cloudLinks: cloudLinks.value,
      },
      generateId(),
    )
    uni.showToast({ title: '已保存', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 800)
  } catch (cause) {
    error.value = publicMessage(cause)
  } finally {
    submitting.value = false
  }
}

onLoad((options) => {
  recordId.value = options?.recordId ?? ''
  courseId.value = options?.courseId ?? ''
  lessonId.value = options?.lessonId ?? ''
})

onMounted(async () => {
  if (recordId.value && session.family) {
    try {
      const detail = await recordDetail(session.family.familyId, recordId.value)
      courseId.value = detail.record.courseId
      lessonId.value = detail.record.lessonId ?? ''
      title.value = detail.record.title
      note.value = detail.record.note
      tags.value = detail.record.tags
      cloudLinks.value = detail.record.cloudLinks
    } catch (cause) {
      error.value = publicMessage(cause)
    }
  }
  loading.value = false
})
</script>

<template>
  <view class="page-shell">
    <view v-if="loading" class="empty-card">正在加载…</view>

    <template v-else>
      <text class="page-title">{{ recordId ? '编辑记录' : '添加学习记录' }}</text>

      <view class="form-card">
        <text class="field-label">课程</text>
        <picker
          :range="courseStore.courses.map(c => c.name)"
          :value="courseStore.courses.findIndex(c => c.id === courseId)"
          @change="(e: any) => { courseId = courseStore.courses[e.detail.value]?.id ?? '' }"
        >
          <view class="picker-field">
            {{ courseId ? (courseStore.courses.find(c => c.id === courseId)?.name || '请选择课程') : '请选择课程' }}
            <text>›</text>
          </view>
        </picker>

        <text class="field-label">本节主题</text>
        <input v-model="title" class="text-input" maxlength="50" placeholder="例如：自然拼读第5课" />

        <text class="field-label">学习笔记</text>
        <textarea
          v-model="note"
          class="text-area"
          maxlength="2000"
          placeholder="课堂表现、老师反馈、孩子收获…"
        />

        <text class="field-label">标签</text>
        <view class="tag-row">
          <text v-for="tag in tags" :key="tag" class="tag" @click="removeTag(tag)">{{ tag }} ✕</text>
        </view>
        <view class="add-row">
          <input v-model="newTag" class="add-input" placeholder="添加标签" @confirm="addTag" />
          <button class="add-btn" size="mini" @click="addTag">添加</button>
        </view>

        <text class="field-label">网盘链接</text>
        <view v-for="link in cloudLinks" :key="link" class="link-row">
          <text class="link-text">{{ link }}</text>
          <text class="link-remove" @click="removeLink(link)">✕</text>
        </view>
        <view class="add-row">
          <input v-model="newLink" class="add-input" placeholder="粘贴网盘链接" @confirm="addLink" />
          <button class="add-btn" size="mini" @click="addLink">添加</button>
        </view>
      </view>

      <text v-if="error" class="error-copy">{{ error }}</text>

      <button
        class="primary-button"
        :disabled="submitting"
        @click="submit"
      >
        {{ submitting ? '正在保存…' : '保存记录' }}
      </button>
    </template>
  </view>
</template>

<style scoped>
.page-shell { min-height: 100vh; padding: 28rpx 28rpx 64rpx; box-sizing: border-box; }
.page-title { display: block; margin-bottom: 24rpx; color: #172033; font-size: 40rpx; font-weight: 750; }
.form-card { padding: 32rpx; border-radius: 28rpx; background: #fff; }
.field-label { display: block; margin: 28rpx 0 14rpx; color: #39455a; font-size: 27rpx; font-weight: 650; }
.field-label:first-child { margin-top: 0; }
.text-input { height: 90rpx; box-sizing: border-box; padding: 0 24rpx; border: 2rpx solid #dce3ed; border-radius: 18rpx; background: #fbfcfe; font-size: 29rpx; }
.text-area { min-height: 200rpx; box-sizing: border-box; padding: 20rpx 24rpx; border: 2rpx solid #dce3ed; border-radius: 18rpx; background: #fbfcfe; font-size: 29rpx; width: 100%; }
.picker-field { display: flex; align-items: center; justify-content: space-between; height: 90rpx; box-sizing: border-box; padding: 0 24rpx; border: 2rpx solid #dce3ed; border-radius: 18rpx; background: #fbfcfe; font-size: 29rpx; }
.tag-row { display: flex; flex-wrap: wrap; gap: 10rpx; }
.tag { padding: 6rpx 16rpx; border-radius: 100rpx; background: #eaf2ff; color: #286bd8; font-size: 24rpx; }
.add-row { display: flex; gap: 12rpx; margin-top: 12rpx; }
.add-input { flex: 1; height: 72rpx; padding: 0 20rpx; border: 2rpx solid #dce3ed; border-radius: 14rpx; font-size: 26rpx; }
.add-btn { border-radius: 14rpx; background: #eaf2ff; color: #286bd8; font-size: 24rpx; }
.link-row { display: flex; align-items: center; gap: 12rpx; padding: 12rpx 20rpx; margin-bottom: 8rpx; border-radius: 14rpx; background: #f9fafb; }
.link-text { flex: 1; color: #3478f6; font-size: 24rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.link-remove { color: #8a94a4; font-size: 28rpx; }
.error-copy { display: block; margin-top: 20rpx; color: #dc2626; font-size: 25rpx; text-align: center; }
.primary-button { margin-top: 28rpx; border: 0; border-radius: 22rpx; background: #3478f6; color: #fff; font-size: 30rpx; font-weight: 700; }
.primary-button[disabled] { background: #aac5f7; }
.empty-card { padding: 38rpx; border-radius: 28rpx; background: #fff; color: #667085; text-align: center; box-shadow: 0 12rpx 40rpx rgba(31, 50, 81, 0.06); }
</style>
