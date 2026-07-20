import { cloudObject } from './cloud'

interface ExportCloudObject {
  createExport(input: {
    familyId: string
  }): Promise<{
    jobId: string
    data: Record<string, unknown[]>
    expiresAt: number
  }>

  exportStatus(input: {
    familyId: string
    jobId: string
  }): Promise<{
    status: 'not_found' | 'expired' | 'ready'
    expiresAt?: number
  }>
}

function api(): ExportCloudObject {
  return cloudObject<ExportCloudObject>('data-export')
}

export interface ExportResult {
  jobId: string
  data: Record<string, unknown[]>
  expiresAt: number
}

export async function createExport(familyId: string): Promise<ExportResult> {
  const result = await api().createExport({ familyId })
  return {
    jobId: result.jobId,
    data: result.data,
    expiresAt: result.expiresAt,
  }
}

export async function exportStatus(
  familyId: string,
  jobId: string,
): Promise<{ status: string; expiresAt?: number }> {
  return api().exportStatus({ familyId, jobId })
}
