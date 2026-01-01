# API Quick Reference

Quick reference for the YouTube Topic Modeling API client.

## Import

```typescript
import { api } from '@/lib/api';
import type { /* types */ } from '@/types';
```

## Extraction API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `api.getChannelInfo(channel)` | `POST /api/channel-info` | Get channel metadata |
| `api.scrapeComments(request)` | `POST /api/scrape-comments` | Start extraction |
| `api.getExtractionStatus()` | `GET /api/extraction-status` | Get progress |
| `api.stopExtraction()` | `POST /api/stop-extraction` | Stop extraction |
| `api.clearQueue()` | `POST /api/clear-queue` | Clear queue |
| `api.getSystemInfo()` | `GET /api/system-info` | Get CPU info |
| `api.getFilesStats()` | `GET /api/files-stats` | List all channels |
| `api.getFileDetail(folder)` | `GET /api/file-detail/<folder>` | Get channel detail |

## Modeling API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `api.modelingSelectData(request)` | `POST /api/modeling/select-data` | Preview data |
| `api.modelingRun(request)` | `POST /api/modeling/run` | Start modeling |
| `api.modelingStatus(jobId)` | `GET /api/modeling/status/<job_id>` | Get progress |
| `api.modelingResults(jobId)` | `GET /api/modeling/results/<job_id>` | Get results |
| `api.modelingListJobs()` | `GET /api/modeling/jobs` | List all jobs |
| `api.modelingDeleteJob(jobId)` | `DELETE /api/modeling/jobs/<job_id>` | Delete job |

## Common Workflows

### 1. Extract Comments

```typescript
// Get channel info
const info = await api.getChannelInfo('@veritasium');

// Start extraction
const { job_ids } = await api.scrapeComments({
  channel: '@veritasium',
  skip_existing: true,
  workers: 2,
});

// Poll status
const interval = setInterval(async () => {
  const status = await api.getExtractionStatus();
  if (!status.active) clearInterval(interval);
}, 1000);
```

### 2. Run Topic Modeling

```typescript
// Preview data
const preview = await api.modelingSelectData({
  channels: ['@veritasium']
});

// Start modeling
const { job_id } = await api.modelingRun({
  channels: ['@veritasium'],
  algorithm: 'lda',
  params: {
    num_topics: preview.recommended_topics,
    language: 'auto',
  },
});

// Poll until complete
const checkStatus = async () => {
  const status = await api.modelingStatus(job_id);
  if (status.status === 'completed') {
    const results = await api.modelingResults(job_id);
    return results;
  }
};
```

### 3. Browse Data

```typescript
// List all channels
const stats = await api.getFilesStats();

// Get specific channel
const detail = await api.getFileDetail('@veritasium');

// Access videos and comments
detail.videos.forEach(video => {
  console.log(video.title, video.comments.length);
});
```

## Request/Response Types

### Extraction

```typescript
// Request
interface ScrapeCommentsRequest {
  channel: string;        // Comma-separated
  limit?: number;
  skip_existing?: boolean;
  workers?: number;
}

// Response
interface ExtractionStatusResponse {
  active: boolean;
  videos_completed: number;
  videos_total: number;
  comments_extracted: number;
  queue: QueueItem[];
}
```

### Modeling

```typescript
// Request
interface ModelingRunRequest {
  channels: string[];
  algorithm: 'lda' | 'nmf';
  params: {
    num_topics?: number;
    n_gram_range?: [number, number];
    max_iter?: number;
    language?: string;
  };
}

// Response
interface ModelingResult {
  topics: Topic[];
  diversity: number;
  model_info: ModelInfo;
  preprocessing_stats: PreprocessingStats;
}

interface Topic {
  id: number;
  label: string;
  words: [string, number][];
  document_count: number;
  representative_comments: string[];
}
```

## Error Handling

```typescript
try {
  const result = await api.getChannelInfo('@channel');
} catch (error) {
  if (error instanceof Error) {
    console.error('Error:', error.message);
  }
}
```

## Configuration

```env
# .env file
VITE_API_URL=http://localhost:4242
```

## Files

- `src/lib/api.ts` - Main API client
- `src/lib/api-examples.ts` - Usage examples
- `src/types/index.ts` - TypeScript types (337 lines)
- `src/lib/API-README.md` - Full documentation

## Backend

Backend runs on `http://localhost:4242` (Flask)

```bash
python app.py --port 4242
```
