export type RemoteVideoModel =
  | 'grok-imagine-1.5-video'
  | 'video-v1'
  | 'MiniMax-H3-933-1440P-GF'
  | 'video-v2'
  | 'video-v2-fast'
  | 'video-v3';

export interface RemoteVideoRequest {
  model: RemoteVideoModel | string;
  prompt: string;
  duration?: number;
  fps?: number;
  aspectRatio?: string;
  resolution?: string;
  size?: string;
  images?: string[];
  videos?: string[];
  audios?: string[];
  generateAudio?: boolean;
  negativePrompt?: string;
  seed?: number;
  bypassFaceCheck?: boolean;
  gridStrength?: number;
  startFrameUrl?: string;
  endFrameUrl?: string;
}

export interface RemoteVideoTask {
  taskId: string;
  status: string;
  progress: number;
  resultUrl?: string;
  error?: string;
  model: string;
}
