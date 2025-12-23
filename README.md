# YouTube Topic Modeling

> **Work in Progress** - This project is under active development. Some features may be incomplete or subject to change.

A Flask application to extract YouTube comments and perform topic modeling analysis.

## Features

### 1. Comment Extraction
- Search YouTube channels by handle (`@channelname`) or ID
- **Multi-channel support**: Extract multiple channels at once (comma-separated)
- **Parallel extraction** with configurable worker count (1 to 2x CPU cores)
- **Queue system**: Add multiple channels to a queue, processed sequentially
- **Real-time progress bar** with live updates
- **Stop button** to cancel extraction mid-process
- **Skip already downloaded videos** to resume interrupted extractions
- Progressive saving: each video saved individually (no data loss on interruption)

### 2. Data Structure
Each channel is saved in its own folder:
```
data/
  @ChannelName/
    info.json              # Channel metadata (subscribers, description, etc.)
    videos/
      <video_id>.json      # One file per video with comments
      <video_id>.json
      ...
```

### 3. Data Insights
- View all extracted channels
- Channel statistics (subscribers, videos, comments)
- Comments per video chart
- Comments timeline visualization
- Video list sorted by engagement

### 4. Topic Modeling
Complete pipeline for analyzing YouTube comments:
1. **Data Selection** - Multi-channel selection with preview (total comments, languages detected, recommended topics)
2. **Preprocessing** - Intelligent text cleaning:
   - Auto language detection (French/English)
   - spaCy lemmatization
   - Custom stopwords (including YouTube-specific terms)
   - Emoji and URL removal
3. **Algorithms** - Choose from:
   - **LDA** (Latent Dirichlet Allocation) - Fast, probabilistic, good for <5k comments
   - **NMF** (Non-negative Matrix Factorization) - Balanced, deterministic, good for 1-10k comments
4. **Configurable Parameters**:
   - Number of topics (2-20, with auto-recommendation)
   - N-gram range (unigrams, bigrams, or both)
   - Language processing mode (auto, French, English, mixed)
5. **Results Visualization**:
   - Topic keywords with weights
   - Representative comments per topic
   - Topic distribution chart (Plotly)
   - Diversity score
6. **Real-time Progress** - Live tracking of preprocessing, training, and finalization stages

## Installation

> Want to contribute? Fork the repository first, then follow the steps below.

```bash
# Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Download spaCy language models (required for topic modeling)
python -m spacy download fr_core_news_sm  # French
python -m spacy download en_core_web_sm   # English
```

**Quick setup** (Linux/Mac):
```bash
source .venv/bin/activate
./setup_modeling.sh  # Automated installation script
```

## Usage

```bash
python app.py
```

Open http://localhost:4242

To use a different port:
```bash
python app.py --port 8080
```

### Multi-Channel Extraction

Enter multiple channels separated by commas:
```
@MrBeast, @Fireship, @TechWithTim
```

All channels will be added to the queue and processed one after another.

### Configurable Workers

Use the slider to adjust the number of parallel workers (1 to 2x your CPU cores).
More workers = faster extraction, but may hit YouTube rate limits.

### Topic Modeling Workflow

1. **Extract Comments** - Use the Extraction tab to download comments from YouTube channels
2. **Navigate to Modeling Tab** - Click on "Modeling" in the sidebar
3. **Select Data**:
   - Choose one or more channels from the dropdown
   - Click "Preview Data" to see statistics (total comments, languages, recommended topics)
4. **Configure Algorithm**:
   - Choose LDA (fast, <5k comments) or NMF (balanced, 1-10k comments)
   - Adjust number of topics (auto-recommended based on comment count)
   - Select n-gram range (unigrams, bigrams, or both)
   - Choose language processing mode (auto-detect, French, English, or mixed)
5. **Start Modeling** - Click "Start Modeling" and watch real-time progress
6. **Analyze Results**:
   - View discovered topics with keywords and weights
   - Read representative comments for each topic
   - Explore topic distribution chart
   - Check diversity score (higher = more distinct topics)

**Example**: Analyzing @defendintelligence (11k comments):
- Select channel → Preview Data → Choose LDA → 5 topics → Start Modeling
- Wait ~30-60 seconds
- Results: Topics about "machine learning", "intelligence artificielle", "code python", etc.

## Project Structure

```
topic-modeling-youtube/
├── app.py                    # Flask application with extraction & modeling routes
├── requirements.txt          # Python dependencies
├── README.md                 # Documentation
├── IMPLEMENTATION.md         # Topic modeling implementation guide
├── setup_modeling.sh         # Automated setup script
├── nlp/                      # NLP preprocessing modules
│   ├── language_detector.py # Auto language detection (FR/EN)
│   ├── preprocessing.py     # Text cleaning, lemmatization, stopwords
│   └── stopwords.py         # Custom stopwords lists
├── modeling/                 # Topic modeling algorithms
│   ├── base_model.py        # Abstract base class
│   ├── lda_model.py         # LDA implementation
│   └── nmf_model.py         # NMF implementation
├── export/                   # Export utilities (planned)
│   └── (JSON/HTML exporters)
├── templates/
│   └── index.html           # Web interface (3 tabs: Extraction, Data, Modeling)
└── data/                    # Extracted data (per channel)
    └── @ChannelName/
        ├── info.json        # Channel metadata
        └── videos/
            └── *.json       # Individual video comments
```

## Extracted Data Format

### info.json (Channel Metadata)
```json
{
  "channel_name": "ChannelName",
  "channel_id": "UCxxxxxx",
  "channel_url": "https://www.youtube.com/channel/UCxxxxxx",
  "description": "Channel description...",
  "subscriber_count": 1500000,
  "total_videos": 150,
  "videos_extracted": 150,
  "total_comments": 25000,
  "last_updated": "2025-12-22T15:30:00"
}
```

### videos/<video_id>.json
```json
{
  "video_id": "abc123",
  "title": "Video Title",
  "url": "https://www.youtube.com/watch?v=abc123",
  "comment_count": 500,
  "comments": [
    {
      "author": "User1",
      "author_id": "UC...",
      "text": "Great video!",
      "likes": 42,
      "timestamp": 1703257800,
      "parent": "root",
      "is_reply": false
    }
  ]
}
```

## API Endpoints

### Comment Extraction
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Web interface |
| `/api/channel-info` | POST | Get channel info |
| `/api/scrape-comments` | POST | Queue channel(s) extraction |
| `/api/extraction-status` | GET | Get real-time extraction progress |
| `/api/stop-extraction` | POST | Stop current extraction |
| `/api/clear-queue` | POST | Clear completed queue items |
| `/api/system-info` | GET | Get CPU/worker info |
| `/api/files-stats` | GET | List channels with statistics |
| `/api/file-detail/<folder>` | GET | Get channel details |

### Topic Modeling
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/modeling/select-data` | POST | Preview data selection (comments count, languages) |
| `/api/modeling/run` | POST | Start topic modeling job |
| `/api/modeling/status/<job_id>` | GET | Get job progress and status |
| `/api/modeling/results/<job_id>` | GET | Get completed job results |
| `/api/modeling/jobs` | GET | List all modeling jobs |
| `/api/modeling/jobs/<job_id>` | DELETE | Delete a modeling job |

## Tech Stack

- **Backend**: Flask, yt-dlp, ThreadPoolExecutor
- **Frontend**: HTML/CSS/JavaScript, Plotly.js
- **Topic Modeling**: scikit-learn (LDA, NMF), Gensim
- **NLP**: spaCy (lemmatization), langdetect (language detection)
- **Data Processing**: NumPy, Pandas
- **Visualization**: Plotly.js (interactive charts)
- **Future**: BERTopic, sentence-transformers, UMAP, t-SNE

## Roadmap

### ✅ Completed
- [x] YouTube comment extraction
- [x] Parallel extraction (configurable workers)
- [x] Multi-channel queue system
- [x] Real-time progress bar
- [x] Stop/cancel extraction
- [x] Skip already downloaded videos
- [x] Per-video JSON storage
- [x] Channel metadata (subscribers, description)
- [x] Web interface with tabs
- [x] Data insights dashboard
- [x] NLP preprocessing pipeline (auto language detection FR/EN, spaCy lemmatization, custom stopwords)
- [x] LDA/NMF implementation (scikit-learn, configurable parameters)
- [x] Topic modeling UI (4-step workflow: data selection, configuration, progress, results)
- [x] Real-time topic modeling progress tracking
- [x] Basic visualization (topic distribution chart with Plotly)
- [x] Topic analysis (keywords, representative comments, diversity score)

### 🔜 Optional Enhancements
- [ ] **Export functionality**
  - [ ] JSON export with full results
  - [ ] HTML report generation with embedded visualizations
  - [ ] CSV export for topic assignments
- [ ] **Advanced visualizations**
  - [ ] Word clouds per topic
  - [ ] Document-topic heatmap
  - [ ] Topic timeline/trends over time
  - [ ] Inter-topic distance map (2D projection)
- [ ] **BERTopic integration**
  - [ ] Sentence transformer embeddings
  - [ ] Multilingual model support
  - [ ] Dynamic topic modeling
  - [ ] Hierarchical topic structure
- [ ] **Advanced features**
  - [ ] Topic labeling with GPT/LLM API
  - [ ] Sentiment analysis per topic
  - [ ] Comment search by topic
  - [ ] Topic evolution tracking
  - [ ] Compare topics across channels
- [ ] **Performance improvements**
  - [ ] Results caching and persistence
  - [ ] Incremental topic modeling
  - [ ] GPU acceleration for large datasets
- [ ] **UI enhancements**
  - [ ] Topic renaming/merging
  - [ ] Interactive topic exploration
  - [ ] Filter comments by topic
  - [ ] Topic comparison view

## License

MIT
