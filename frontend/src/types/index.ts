// ============================================================================
// Type Definitions for YouTube Topic Modeling Application
// ============================================================================

// ============================================================================
// Channel & Video Types
// ============================================================================

export interface Video {
  id: string;
  title: string;
  url: string;
}

export interface VideoWithComments extends Video {
  video_id: string;
  comment_count: number;
  comments: Comment[];
  error?: string | null;
}

export interface Comment {
  author: string;
  author_id: string;
  text: string;
  likes: number;
  timestamp: number;
  parent: string;
  is_reply: boolean;
}

export interface ChannelInfo {
  channel_name: string;
  channel_id: string;
  channel_url?: string;
  description: string;
  subscriber_count: number | null;
  video_count: number;
  videos?: Video[];
}

export interface ChannelStats {
  folder: string;
  channel_name: string;
  channel_id?: string;
  description?: string;
  video_count: number;
  total_videos_available?: number;
  comment_count: number;
  subscriber_count: number | null;
  last_updated: string;
  size: string;
}

export interface ChannelDetail {
  channel_name: string;
  channel_id: string;
  description: string;
  subscriber_count: number | null;
  last_updated: string;
  total_videos: number;
  total_comments: number;
  videos: VideoWithComments[];
}

// ============================================================================
// Extraction Types
// ============================================================================

export interface ExtractionState {
  active: boolean;
  stop_requested: boolean;
  current_channel: string | null;
  current_video: string | null;
  videos_total: number;
  videos_completed: number;
  comments_extracted: number;
  filename: string | null;
  queue: QueueItem[];
}

export interface QueueItem {
  id: string;
  channel: string;
  status: 'queued' | 'running' | 'completed' | 'error';
  result: ExtractionResult | null;
}

export interface ExtractionResult {
  success: boolean;
  channel_name?: string;
  folder?: string;
  total_videos?: number;
  total_comments?: number;
  stopped?: boolean;
  rate_limited?: boolean;
  message?: string;
  error?: string;
}

export interface ScrapeCommentsRequest {
  channel: string;
  limit?: number;
  skip_existing?: boolean;
  workers?: number;
}

export interface ScrapeCommentsResponse {
  success: boolean;
  job_ids: string[];
  channels_queued: number;
  message: string;
  queue_size: number;
}

export interface SystemInfo {
  cpu_count: number;
  default_workers: number;
  max_workers: number;
}

export interface FilesStatsResponse {
  files: ChannelStats[];
  total_channels: number;
  total_videos: number;
  total_comments: number;
}

// ============================================================================
// Topic Modeling Types
// ============================================================================

export interface Topic {
  id: number;
  label: string;
  words: [string, number][];
  document_count: number;
  representative_comments: string[];
}

export interface CommentMetadata {
  channel: string;
  video_id: string;
  video_title: string;
  author: string;
  likes: number;
  timestamp: number;
}

export interface ModelInfo {
  algorithm: 'lda' | 'nmf';
  num_topics: number;
  n_gram_range: [number, number];
  max_iter: number;
  perplexity?: number; // LDA only
  reconstruction_error?: number; // NMF only
  coherence?: number;
  vocabulary_size?: number;
}

export interface PreprocessingStats {
  original_comments: number;
  valid_comments: number;
  filtered_comments: number;
  average_length_original: number;
  average_length_processed: number;
  total_vocabulary: number;
  language_distribution: Record<string, number>;
  most_common_words?: Array<[string, number]>;
}

export interface ModelingResult {
  success: boolean;
  job_id: string;
  algorithm: 'lda' | 'nmf';
  num_topics: number;
  total_comments: number;
  valid_comments: number;
  channels: string[];
  topics: Topic[];
  document_topics: number[][];
  metadata: CommentMetadata[];
  diversity: number;
  model_info: ModelInfo;
  preprocessing_stats: PreprocessingStats;
}

export interface ModelingSelectDataRequest {
  channels: string[];
}

export interface ModelingSelectDataResponse {
  success: boolean;
  channels: string[];
  total_comments: number;
  language_distribution: Record<string, number>;
  date_range: {
    start: number | null;
    end: number | null;
  };
  recommended_topics: number;
}

export interface ModelingParams {
  num_topics?: number;
  n_gram_range?: [number, number];
  max_iter?: number;
  language?: string;
}

export interface ModelingRunRequest {
  channels: string[];
  algorithm: 'lda' | 'nmf';
  params: ModelingParams;
}

export interface ModelingRunResponse {
  success: boolean;
  job_id: string;
  status: 'queued';
}

export interface ModelingStatusResponse {
  job_id: string;
  status: 'queued' | 'running' | 'completed' | 'error';
  progress: number;
  stage?: string;
  message?: string;
  channels?: string[];
  result?: ModelingResult | { success: false; error: string } | null;
}

export interface ModelingJob {
  id: string;
  channels: string[];
  algorithm: 'lda' | 'nmf';
  status: 'queued' | 'running' | 'completed' | 'error';
  created_at: string;
}

export interface ModelingJobsResponse {
  jobs: ModelingJob[];
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ChannelInfoResponse {
  channel_name: string;
  channel_id: string;
  channel_url?: string;
  description: string;
  subscriber_count: number | null;
  video_count: number;
  videos?: Video[];
}

export interface ExtractionStatusResponse {
  active: boolean;
  stop_requested: boolean;
  current_channel: string | null;
  current_video: string | null;
  videos_total: number;
  videos_completed: number;
  comments_extracted: number;
  filename: string | null;
  queue: QueueItem[];
}

export interface StopExtractionResponse {
  success: boolean;
  message: string;
}

export interface ClearQueueResponse {
  success: boolean;
}

export interface SystemInfoResponse {
  cpu_count: number;
  default_workers: number;
  max_workers: number;
}

export interface FileDetailResponse extends ChannelDetail {}

export interface ModelingResultsResponse extends ModelingResult {
  error?: string;
}

export interface DeleteJobResponse {
  success: boolean;
}

// ============================================================================
// API Error Types
// ============================================================================

export interface ApiError {
  error: string;
}

export type ApiResponse<T> = T | ApiError;

export function isApiError<T>(response: ApiResponse<T>): response is ApiError {
  return (response as ApiError).error !== undefined;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Algorithm type
 */
export type Algorithm = 'lda' | 'nmf';

/**
 * Job status type
 */
export type JobStatus = 'queued' | 'running' | 'completed' | 'error';

/**
 * Modeling stage type
 */
export type ModelingStage = 'idle' | 'loading' | 'preprocessing' | 'training' | 'finalizing';

/**
 * Queue status type
 */
export type QueueStatus = 'queued' | 'running' | 'completed' | 'error';

/**
 * Topic word tuple type
 */
export type TopicWord = [string, number];
