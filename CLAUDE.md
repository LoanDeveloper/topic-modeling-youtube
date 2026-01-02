# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start

### Docker Deployment (Recommended)

```bash
# 1. Create environment file
cp .env.example .env
# Edit .env and set POSTGRES_PASSWORD

# 2. Start all services (frontend, backend, database)
docker compose up -d

# 3. Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:4242
# Database: localhost:5432
```

### Local Development

```bash
# Setup Python environment
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Download spaCy models (required for topic modeling)
python -m spacy download fr_core_news_sm  # French
python -m spacy download en_core_web_sm   # English

# Start PostgreSQL (keep Docker for DB)
docker compose up -d postgres

# Run Flask backend
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/topic_modeling"
python app.py

# In another terminal, run frontend
cd frontend
npm install
npm run dev
```

---

## Architecture Overview

This is a **full-stack Flask + React application** for YouTube comment extraction and topic modeling analysis with PostgreSQL persistence.

### Tech Stack

**Backend**
- Flask (REST API)
- PostgreSQL + SQLAlchemy (data persistence)
- yt-dlp (YouTube comment extraction)
- scikit-learn (LDA, NMF topic modeling)
- spaCy (NLP preprocessing, lemmatization)
- Gensim (topic coherence)
- TextBlob (sentiment analysis)
- UMAP/t-SNE (dimensionality reduction)

**Frontend**
- React 18 + TypeScript
- Vite (build tool)
- Tailwind CSS + shadcn/ui
- Recharts (visualizations)
- TanStack Query (API state management)

**Infrastructure**
- Docker + Docker Compose
- Nginx (reverse proxy)
- Multi-stage builds for optimization

---

## Project Structure

```
topic-modeling-youtube/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── extraction/     # YouTube extraction UI
│   │   │   ├── modeling/       # Topic modeling UI
│   │   │   │   └── visualizations/  # 7 visualization components
│   │   │   └── layout/         # Layout components
│   │   ├── lib/
│   │   │   └── api-client.ts   # API client with TanStack Query
│   │   └── App.tsx
│   ├── Dockerfile              # Frontend container
│   └── nginx.conf              # Nginx configuration
├── database/
│   ├── schema.sql              # Database schema (10 tables)
│   ├── init.sql                # Initialization script
│   └── db_manager.py           # Database operations
├── nlp/
│   ├── language_detector.py    # Auto language detection (FR/EN)
│   ├── preprocessing.py        # Text cleaning, lemmatization, stopwords
│   └── stopwords.py            # Custom stopwords lists
├── modeling/
│   ├── base_model.py           # Abstract base class
│   ├── lda_model.py            # LDA implementation
│   └── nmf_model.py            # NMF implementation
├── analysis/
│   ├── sentiment.py            # Sentiment analysis per topic
│   ├── coherence.py            # Topic coherence scoring
│   └── dimensionality_reduction.py  # UMAP, t-SNE, PCA
├── export/
│   └── exporters.py            # JSON, CSV, Excel exporters
├── data/                       # Extracted YouTube data
│   └── @ChannelName/
│       ├── info.json           # Channel metadata
│       └── videos/
│           └── <video_id>.json # Individual video comments
├── app.py                      # Flask backend (main application)
├── Dockerfile                  # Backend container
├── docker-compose.yml          # Service orchestration
├── .env.example                # Environment template
├── requirements.txt            # Python dependencies
├── CLAUDE.md                   # This file
└── README.md                   # User documentation
```

---

## Core Features

### 1. YouTube Comment Extraction

**Capabilities**
- Search channels by `@handle` or channel ID
- Multi-channel support (comma-separated)
- Parallel extraction with configurable workers (1 to 2x CPU cores)
- Queue system for batch processing
- Real-time progress tracking
- Skip already downloaded videos (resume interrupted extractions)
- Progressive saving (each video saved individually)

**Data Structure**
```
data/@ChannelName/
  info.json       # { channel_name, subscriber_count, total_videos, total_comments, ... }
  videos/
    <video_id>.json  # { video_id, title, comment_count, comments: [...] }
```

**Implementation Details**
- Uses `yt-dlp` for YouTube API
- `ThreadPoolExecutor` for parallel video extraction
- Thread-safe state management with `threading.Lock`
- Rate limit handling (403 errors trigger graceful shutdown)
- Cookies file support (`cookies.txt`) to avoid bot detection

### 2. Topic Modeling Pipeline

**Workflow**
1. **Data Selection** - Choose one or more channels
2. **Preprocessing** - Auto language detection (FR/EN), spaCy lemmatization, stopwords removal
3. **Algorithm Selection** - LDA or NMF with configurable parameters
4. **Training** - Run topic modeling with real-time progress
5. **Analysis** - Enhanced analysis (sentiment, coherence, distances)
6. **Visualization** - 7 interactive charts (word clouds, heatmaps, timelines, etc.)
7. **Export** - Download results as JSON, CSV, or Excel

**Supported Algorithms**
- **LDA** (Latent Dirichlet Allocation) - Fast, probabilistic, good for <5k comments
- **NMF** (Non-negative Matrix Factorization) - Balanced, deterministic, good for 1-10k comments

**Configurable Parameters**
- Number of topics (2-20, with auto-recommendation)
- N-gram range (unigrams, bigrams, or both)
- Language processing mode (auto-detect, French, English, mixed)

**Enhanced Analysis (Week 2)**
- **Sentiment Analysis** - TextBlob per topic (avg sentiment, distribution)
- **Coherence Scores** - Gensim c_v metric for topic quality
- **Inter-topic Distances** - UMAP/t-SNE/PCA for 2D visualization

### 3. Database Persistence

**Schema (PostgreSQL)**
- `modeling_jobs` - Job metadata (algorithm, params, status, timestamps)
- `topics` - Topic keywords and weights
- `documents` - Original comments with preprocessing info
- `document_topics` - Sparse document-topic probabilities (> 0.01)
- `representative_comments` - Top comments per topic
- `sentiment_analysis` - Sentiment scores per topic
- `coherence_scores` - Overall and per-topic coherence
- `inter_topic_distances` - 2D coordinates for visualization
- `preprocessing_stats` - Document counts, lengths, languages
- `topic_evolution` - Timeline data (if available)

**Features**
- Sparse storage optimization (only probabilities > 0.01)
- Cascade deletes for data integrity
- Connection pooling for performance
- Graceful fallback to in-memory mode if DB unavailable

---

## API Endpoints

### Comment Extraction

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/channel-info` | POST | Preview channel metadata and video count |
| `/api/scrape-comments` | POST | Queue channel(s) for extraction |
| `/api/extraction-status` | GET | Real-time extraction progress |
| `/api/stop-extraction` | POST | Stop current extraction gracefully |
| `/api/clear-queue` | POST | Remove completed queue items |
| `/api/system-info` | GET | CPU count and worker limits |
| `/api/files-stats` | GET | List all extracted channels with stats |
| `/api/file-detail/<folder>` | GET | Get channel details and all videos |

### Topic Modeling

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/modeling/select-data` | POST | Preview data selection (comments count, languages) |
| `/api/modeling/run` | POST | Start topic modeling job |
| `/api/modeling/status/<job_id>` | GET | Get job progress and status |
| `/api/modeling/results/<job_id>` | GET | Get completed job results |
| `/api/modeling/jobs/<job_id>/enhanced` | GET | Get enhanced analysis (sentiment, coherence, distances) |
| `/api/modeling/jobs/<job_id>/export` | POST | Export results (JSON, CSV, Excel) |
| `/api/modeling/jobs` | GET | List all modeling jobs |
| `/api/modeling/jobs/<job_id>` | DELETE | Delete a modeling job |

### Health Check

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | API and database health status |

---

## Docker Architecture

### Services

**postgres** (Database)
- Image: `postgres:16-alpine`
- Port: `5432`
- Volume: `postgres_data` (persistent)
- Health check: `pg_isready`

**backend** (Flask API)
- Build: `Dockerfile` (at root)
- Port: `4242`
- Depends on: `postgres` (healthy)
- Volumes:
  - `./data:/app/data` (YouTube data persistence)
  - `./cookies.txt:/app/cookies.txt:ro` (optional)
- Health check: `curl -f http://localhost:4242/api/health`

**frontend** (React + Nginx)
- Build: `frontend/Dockerfile` (multi-stage)
- Port: `3000` (maps to Nginx :80)
- Depends on: `backend`
- Reverse proxy: `/api/*` → `backend:4242`
- Health check: `wget http://localhost/`

### Environment Variables (.env)

```bash
# Database
POSTGRES_DB=topic_modeling
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password_here
POSTGRES_PORT=5432

# Backend
BACKEND_PORT=4242
FLASK_ENV=production
FLASK_DEBUG=0

# Frontend
FRONTEND_PORT=3000
```

### Docker Commands

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f [service]

# Restart services
docker compose restart

# Stop services
docker compose stop

# Remove everything (including volumes)
docker compose down -v

# Rebuild after code changes
docker compose build [service]
docker compose up -d [service]
```

---

## Frontend Components

### Extraction Tab
- Multi-channel input (comma-separated)
- Worker count slider (1 to 2x CPU cores)
- Real-time progress bar
- Queue status display
- Stop button

### Data Tab
- List all extracted channels
- Channel statistics (subscribers, videos, comments)
- Comments per video chart (Plotly)
- Comments timeline visualization
- Video list sorted by engagement

### Modeling Tab

#### View Modes (NEW)
The Modeling page now features three distinct view modes:

1. **New Analysis** - Create and run new topic modeling jobs
2. **Job History** - Browse and manage past modeling jobs
3. **Compare Jobs** - Side-by-side comparison of multiple jobs

#### Analysis Workflow
- **Step 1**: Data Selection (multi-channel dropdown, preview button)
- **Step 2**: Algorithm Configuration (LDA/NMF, params)
- **Step 3**: Real-time Progress (preprocessing → training → finalizing)
- **Step 4**: Results Display (4-tab interface with all visualizations)

#### Results View (NEW)
Four-tab layout for comprehensive analysis:

**Topics Tab**
- Topic distribution chart
- Topics list with keywords
- Word clouds for each topic
- Representative comments

**Preprocessing Tab**
- Document count statistics
- Language distribution
- Text length analysis
- Vocabulary size metrics

**Analysis Tab**
- Coherence scores (overall + per-topic)
- Sentiment analysis per topic
- Topic quality indicators

**Visualizations Tab**
- Topic-document heatmap
- Inter-topic distance (2D projection)
- Topic evolution timeline

#### Job Management (NEW)
- **View Results** - Load and view any completed job
- **Rerun Job** - Restart analysis with same configuration
- **Delete Job** - Remove job and all associated data
- **Export Results** - Download as JSON, CSV, or Excel
- **Add to Comparison** - Compare multiple jobs side-by-side

### Visualization Components (7 components + Management)

Located in `frontend/src/components/modeling/visualizations/`:

1. **PreprocessingStats.tsx** - Document counts, lengths, languages
2. **WordCloudVisualization.tsx** - Tabbed word clouds per topic
3. **TopicHeatmap.tsx** - Document-topic probability heatmap
4. **CoherenceScores.tsx** - Overall and per-topic coherence
5. **TopicEvolutionTimeline.tsx** - Topic trends over time
6. **InterTopicDistance.tsx** - 2D scatter plot of topic similarity
7. **SentimentAnalysis.tsx** - Sentiment distribution per topic

**Management Components** (NEW in `frontend/src/components/modeling/`):
8. **JobHistory.tsx** - Table view of all modeling jobs with actions
9. **JobComparison.tsx** - Multi-job comparison with metrics table
10. **ExportButton.tsx** - Dropdown menu for format selection

**Utility Components** (NEW in `frontend/src/components/ui/`):
11. **ErrorBoundary.tsx** - Graceful error recovery
12. **VisualizationLoader.tsx** - Skeleton loaders for visualizations

All components feature:
- Loading states with skeleton loaders
- Empty states with helpful messages
- Error handling with ErrorBoundary
- Lazy loading for performance
- Responsive design
- Full TypeScript type safety
- Accessibility support

---

## Development Guidelines

### Adding New API Endpoints

1. Define route in `app.py`
2. Add endpoint to API client (`frontend/src/lib/api-client.ts`)
3. Create React Query hook if needed
4. Update this documentation

### Adding New Visualizations

1. Create component in `frontend/src/components/modeling/visualizations/`
2. Export from `index.ts`
3. Import in `ModelingPage` or results view
4. Add TypeScript interfaces in component file

### Database Schema Changes

1. Update `database/schema.sql`
2. Modify `database/db_manager.py` operations
3. Update API endpoints that use the tables
4. Test with `docker compose down -v && docker compose up -d`

### Testing

**Backend**
```bash
# Activate venv
source .venv/bin/activate

# Test imports
python -c "from analysis.sentiment import SentimentAnalyzer; print('✓')"
python -c "from analysis.coherence import CoherenceCalculator; print('✓')"
python -c "from export.exporters import JobExporter; print('✓')"

# Run app
python app.py
```

**Frontend**
```bash
cd frontend

# Type check
npm run type-check

# Build
npm run build

# Dev server
npm run dev
```

**Integration**
```bash
# Start all services
docker compose up -d

# Check health
curl http://localhost:4242/api/health

# View logs
docker compose logs -f
```

---

## Common Issues

### YouTube Rate Limiting
- Reduce worker count (default: 2)
- Use cookies file (`cookies.txt`) in root directory
- Enable "Skip already downloaded" option
- Wait before retrying (403 errors trigger auto-shutdown)

### spaCy Model Not Found
```bash
python -m spacy download fr_core_news_sm
python -m spacy download en_core_web_sm
```

### Database Connection Failed
```bash
# Check if postgres is healthy
docker compose ps postgres

# Restart database
docker compose restart postgres

# View logs
docker compose logs postgres
```

### Port Conflicts
- Edit `.env` and change `FRONTEND_PORT`, `BACKEND_PORT`, or `POSTGRES_PORT`
- Restart services: `docker compose up -d`

### Out of Memory (Docker)
- Increase Docker memory limit (Docker Desktop → Settings → Resources)
- Recommended: 8GB minimum

---

## Performance Notes

**Topic Modeling**
- 1k comments: ~10-30s (LDA/NMF)
- 10k comments: ~1-2min (LDA/NMF)
- Preprocessing: ~30% of time
- Training: ~60% of time
- First run slower (spaCy model loading)

**Comment Extraction**
- Parallel workers speed up extraction
- More workers = higher risk of rate limits
- Skip-existing flag recommended for resume

**Database**
- Sparse storage (only probabilities > 0.01)
- Connection pooling enabled
- Cascade deletes for cleanup

---

## File Naming Conventions

**Channels**
- `@handle` input → folder named `@handle`
- Channel ID input → folder named after channel name (sanitized)
- Sanitization: keeps alphanumeric, spaces, hyphens, underscores, `@`

**Videos**
- Format: `<video_id>.json`
- Example: `abc123.json`

---

## Dependencies

**Backend (requirements.txt)**
- flask, flask-cors
- sqlalchemy, psycopg2-binary
- yt-dlp
- scikit-learn, gensim
- spacy, langdetect
- numpy, pandas, scipy
- textblob, umap-learn
- openpyxl (Excel export)

**Frontend (package.json)**
- react, react-dom (v18+)
- vite, typescript
- tailwindcss, shadcn/ui
- @tanstack/react-query (API state management)
- recharts (charts and visualizations)
- react-wordcloud (word cloud visualization)
- file-saver (export functionality)
- lucide-react (icons)

**System Requirements**
- Python 3.11+
- Node.js 20+
- Docker & Docker Compose
- 8GB+ RAM (recommended)

---

## Security Notes

- Never commit `.env` file (use `.env.example` as template)
- Change default `POSTGRES_PASSWORD` in production
- Cookies file (`cookies.txt`) is optional and `.gitignore`d
- API endpoints have CORS enabled (configure for production)

---

## Future Enhancements

Potential improvements (not yet implemented):
- BERTopic integration with sentence-transformers
- Multilingual model support
- GPU acceleration for large datasets
- Topic labeling with LLM API
- Comment search by topic
- Topic evolution tracking
- Compare topics across channels
- Real-time streaming analysis

---

## License

MIT

## Implementation Status

### ✅ Week 2.5 — Docker Unification & Cleanup (COMPLETED)
- ✅ Unified docker-compose.yml with all services
- ✅ Organized Dockerfiles for backend and frontend
- ✅ Tested service orchestration and health checks
- ✅ Cleaned up redundant markdown files

### ✅ Week 3 — Integration & UI Components (COMPLETED)

#### Visualization Integration
All 7 visualization components successfully integrated into ModelingPage:
1. ✅ PreprocessingStats - Document counts, lengths, languages
2. ✅ WordCloudVisualization - Tabbed word clouds per topic
3. ✅ TopicHeatmap - Document-topic probability heatmap
4. ✅ CoherenceScores - Overall and per-topic coherence
5. ✅ TopicEvolutionTimeline - Topic trends over time
6. ✅ InterTopicDistance - 2D scatter plot of topic similarity
7. ✅ SentimentAnalysis - Sentiment distribution per topic

#### New Components
- ✅ **JobHistory** - Browse all past modeling jobs with actions (view, rerun, delete)
- ✅ **JobComparison** - Side-by-side comparison of multiple jobs
- ✅ **ExportButton** - Export results in JSON, CSV, or Excel format

#### New Features
- ✅ **Enhanced Analysis Integration** - Automatic fetching of sentiment, coherence, and distance data
- ✅ **Job Management** - Rerun jobs with same settings, delete old jobs
- ✅ **View Modes** - Tabbed interface for "New Analysis", "Job History", and "Compare Jobs"
- ✅ **Results Organization** - Four-tab layout: Topics, Preprocessing, Analysis, Visualizations

### ✅ Week 4 — Polish & Optimization (COMPLETED)

#### Performance Optimizations
- ✅ **Lazy Loading** - All visualization components lazy-loaded to reduce initial bundle size
- ✅ **Code Splitting** - Separate chunks for visualizations (main bundle reduced from 5.9MB to 462KB)
- ✅ **Memoization** - Data transformations cached with useMemo to prevent unnecessary recalculations
- ✅ **Suspense Boundaries** - Smooth loading experience with fallback loaders

#### Error Handling
- ✅ **ErrorBoundary Component** - Graceful error recovery with reset and reload options
- ✅ **API Error Handling** - Consistent error messages across all API calls
- ✅ **Validation** - Input validation for all forms and user actions

#### Loading States
- ✅ **VisualizationLoader** - Skeleton loaders for all visualizations
- ✅ **Progressive Loading** - Components load independently without blocking UI
- ✅ **Loading Indicators** - Clear feedback for all async operations

#### Code Quality
- ✅ **TypeScript Strict Mode** - Full type safety across all new components
- ✅ **Data Adapters** - Clean transformation layer between API and visualizations
- ✅ **Consistent Patterns** - Reusable hooks and component structure
