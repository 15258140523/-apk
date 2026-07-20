import type { AttachmentKind } from './model'

const MB = 1024 * 1024

export function quotaDecision(ratio: number) {
  return {
    warn: ratio >= 0.8,
    allowFileUpload: ratio < 0.95,
  }
}

export function validateAttachment(
  kind: AttachmentKind,
  bytes: number,
  durationSeconds = 0,
): void {
  if (kind === 'video' && bytes > 30 * MB) throw new Error('VIDEO_TOO_LARGE')
  if (kind === 'video' && durationSeconds > 60) throw new Error('VIDEO_TOO_LONG')
  if (kind === 'pdf' && bytes > 10 * MB) throw new Error('PDF_TOO_LARGE')
}
