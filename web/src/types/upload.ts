export enum FileStatus {
  UPLOADING = 'uploading',
  UPLOAD_SUCCEED = 'upload_succeed',
  UPLOAD_FAILED = 'upload_failed'
}

export interface UploadItem {
  uid: string;
  fileName: string;
  mediaType: string;
  knowledgeBaseId?: string;
  sourceUrl?: string;
  status: FileStatus;
  progress: number;
  error?: string;
}

export interface UploadProgress {
  currentProgress: number;
  simulatedProgress: number;
  stopPosition: number;
  isSimulating: boolean;
}

// 用于模拟上传进度的配置
export const PROGRESS_SIMULATION_CONFIG = {
  LINEAR_DURATION: 4000,  // 4秒内线性增长
  MIN_STOP_POSITION: 90,  // 最小停止位置
  MAX_STOP_POSITION: 98,  // 最大停止位置
  SUCCESS_COMPLETION_DURATION: 500,  // 成功后0.5秒完成
}; 