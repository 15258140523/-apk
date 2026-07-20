export function cloudObject<T>(name: string): T {
  return uniCloud.importObject(name) as T
}

export function publicMessage(error: unknown): string {
  const value = error as { errMsg?: string; message?: string }
  return value.errMsg ?? value.message ?? '操作失败，请稍后重试'
}
