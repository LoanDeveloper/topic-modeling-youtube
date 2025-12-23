# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the Application

```bash
# Setup
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Run the Flask application
python app.py

# Custom port
python app.py --port 8080

# Access at http://localhost:4242
```

## Architecture Overview

This is a Flask-based YouTube comment extraction and analysis application with a planned topic modeling pipeline. The architecture follows a concurrent extraction pattern with queue-based job management.

### Core Components

**Flask Application (`app.py`)**
- Single-file monolith containing all backend logic
- RESTful API endpoints for channel info, comment extraction, and data retrieval
- Queue-based extraction system with configurable worker threads
- Real-time progress tracking via global state management

**Data Storage Structure**
```
data/
  @ChannelName/
    info.json              # Channel metadata (subscribers, description, stats)
    videos/
      <video_id>.json      # Individual video with comments array
```

**Concurrent Extraction Model**
- Uses `ThreadPoolExecutor` with configurable workers (1 to 2x CPU cores)
- Global extraction state protected by `threading.Lock`
- Queue system (`extraction_queue`) processes multiple channels sequentially
- Each video extraction happens in parallel within a channel
- Progressive saving: videos saved individually to prevent data loss

**Key Design Patterns**
- **Thread-safe state management**: All shared state (extraction_state, queue_list) protected by locks
- **Progressive persistence**: Each video JSON saved immediately after extraction, not batched
- **Skip-existing optimization**: Tracks downloaded video IDs to resume interrupted extractions
- **Rate limit handling**: Detects 403 errors and gracefully stops extraction

### Data Flow

1. User requests channel extraction via `/api/scrape-comments`
2. Job(s) added to `extraction_queue` and `queue_list`
3. Background `queue_worker` thread picks up jobs
4. `do_extraction()` spawns parallel workers for video comment extraction
5. Each video's data saved to `data/@channel/videos/<video_id>.json`
6. Channel `info.json` updated after each video with running stats
7. Real-time status available via `/api/extraction-status`

### Critical Implementation Details

**YouTube Extraction (`yt-dlp`)**
- Cookies file (`cookies.txt`) optional but recommended to avoid bot detection
- Channel URL construction: handles `@handle`, channel IDs, and full URLs
- Two-phase extraction: metadata first (flat), then per-video comments
- Comment sort order: 'top' (most liked first)

**Rate Limiting**
- Default 2 workers to avoid YouTube rate limits
- 403 Forbidden errors trigger immediate extraction shutdown
- Recommendation: use fewer workers and skip-existing flag to resume

**State Management**
- `extraction_state`: Current channel, video, progress counters
- `extraction_lock`: Protects extraction_state from race conditions
- `queue_list`: Display-friendly queue status (separate from Queue object)
- `queue_lock`: Protects queue_list mutations

**Frontend**
- Single HTML template (`templates/index.html`) with tabs
- Real-time progress via polling `/api/extraction-status`
- Plotly.js loaded via CDN for visualization
- Multi-channel input: comma-separated values

### API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `POST /api/channel-info` | Preview channel metadata and video count |
| `POST /api/scrape-comments` | Queue channel(s) for extraction |
| `GET /api/extraction-status` | Real-time progress and queue status |
| `POST /api/stop-extraction` | Request graceful extraction stop |
| `POST /api/clear-queue` | Remove completed/errored jobs from queue |
| `GET /api/system-info` | CPU count and worker limits |
| `GET /api/files-stats` | List all extracted channels with stats |
| `GET /api/file-detail/<folder>` | Get channel details and all videos |

### Folder Naming Convention

- Channels with `@handle` input: folder named `@handle`
- Channels with ID input: folder named after channel name (sanitized)
- Sanitization: keeps alphanumeric, spaces, hyphens, underscores, `@`

### Topic Modeling (Planned)

The codebase is structured to eventually support:
- LDA/NMF topic modeling
- BERTopic integration
- Dimensionality reduction (UMAP, t-SNE, PCA)
- NLP preprocessing pipeline (spaCy, NLTK)

Dependencies are commented out in `requirements.txt` and should be uncommented when implementing these features.
