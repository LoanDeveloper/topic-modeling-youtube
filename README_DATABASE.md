# Topic Modeling YouTube - Database Integration Guide (Option B)

This guide covers the **vertical slice implementation** for database persistence with PostgreSQL, backend integration, and minimal API endpoints.

## 🎯 What's Implemented (Option B)

✅ **Backend Integration**
- PostgreSQL database integration via SQLAlchemy
- Environment-based configuration (`.env` file)
- Thread-safe database operations with connection pooling
- Graceful fallback to in-memory mode if database unavailable

✅ **Database Persistence**
- Complete schema with 10 tables for modeling results
- Sparse storage optimization (only probabilities > 0.01)
- Cascade deletes for data integrity
- Automatic table creation on startup

✅ **API Endpoints**
- `POST /api/runs` - Create a new modeling run
- `GET /api/runs` - List all runs with pagination
- `GET /api/runs/<run_id>` - Get complete results for a run
- `DELETE /api/runs/<run_id>` - Delete a run (with cascade)
- `GET /api/health` - Health check for API and database

✅ **Testing & Docker**
- Smoke test script for validation
- Docker Compose for PostgreSQL (dev environment)
- `.env` configuration example

---

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- Docker & Docker Compose (for PostgreSQL)
- Git

### Step 1: Install Dependencies

```bash
# Create and activate virtual environment
python -m venv .venv

# On Windows
.venv\Scripts\activate

# On macOS/Linux
source .venv/bin/activate

# Install requirements
pip install -r requirements.txt

# Download spaCy models (required for NLP preprocessing)
python -m spacy download en_core_web_sm
python -m spacy download fr_core_news_sm
```

### Step 2: Start PostgreSQL

```bash
# Start PostgreSQL container
docker compose -f docker-compose.dev.yml up -d

# Verify database is running
docker compose -f docker-compose.dev.yml ps

# Check logs
docker compose -f docker-compose.dev.yml logs postgres
```

The database will be available at:
- **Host**: `localhost`
- **Port**: `5432`
- **Database**: `app_db`
- **User**: `app`
- **Password**: `app_pw` (configurable in `.env`)

The schema (`database/init.sql`) is automatically loaded on first startup.

### Step 3: Configure Environment

The `.env` file is already created with default values:

```env
DATABASE_URL=postgresql+psycopg2://app:app_pw@localhost:5432/app_db
DB_PASSWORD=app_pw
FLASK_ENV=development
FLASK_DEBUG=1
```

**No changes needed** for local development. The app will automatically connect to PostgreSQL.

### Step 4: Run Backend

```bash
# Start Flask backend
python app.py

# Backend will start on http://127.0.0.1:4242
# You should see:
# [DATABASE] Connected successfully to localhost:5432/app_db
# [DATABASE] Database tables created successfully
```

### Step 5: Run Smoke Test

```bash
# Test database integration
python test_database_integration.py
```

Expected output:
```
================================================================================
                    DATABASE INTEGRATION SMOKE TEST
================================================================================

============================================================
Test 1: Database Connection
============================================================
✓ Connected to database: localhost:5432/app_db

============================================================
Test 2: Create Database Tables
============================================================
✓ Database tables created successfully

... (8 tests total) ...

================================================================================
                          TEST SUMMARY
================================================================================
✓ Database Connection
✓ Create Tables
✓ Create Job
✓ Save Topics
✓ Save Document-Topics
✓ Retrieve Results
✓ List Jobs
✓ Delete Job (Cascade)

================================================================================
✓ ALL TESTS PASSED (8/8)

✨ Database integration is working correctly!
================================================================================
```

---

## 📡 API Usage Examples

### Health Check

```bash
curl http://localhost:4242/api/health
```

Response:
```json
{
  "status": "healthy",
  "database": "connected",
  "database_jobs_count": 0,
  "timestamp": "2026-01-01T12:00:00"
}
```

### Create a Modeling Run

```bash
curl -X POST http://localhost:4242/api/runs \
  -H "Content-Type: application/json" \
  -d '{
    "channels": ["@test_channel"],
    "algorithm": "lda",
    "params": {
      "num_topics": 5,
      "n_gram_range": [1, 2],
      "max_iter": 20,
      "language": "auto"
    }
  }'
```

Response:
```json
{
  "success": true,
  "run_id": "abc12345",
  "job_id": "abc12345",
  "status": "queued"
}
```

### List All Runs

```bash
# Basic list
curl http://localhost:4242/api/runs

# With pagination
curl "http://localhost:4242/api/runs?page=1&limit=10"

# With filters
curl "http://localhost:4242/api/runs?status=completed&algorithm=lda"
```

Response:
```json
{
  "runs": [
    {
      "job_id": "abc12345",
      "channels": ["@test_channel"],
      "algorithm": "lda",
      "status": "completed",
      "created_at": "2026-01-01T12:00:00",
      "num_topics": 5,
      "diversity": 0.75
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10,
  "total_pages": 1
}
```

### Get Run Results

```bash
curl http://localhost:4242/api/runs/abc12345
```

Response:
```json
{
  "job_id": "abc12345",
  "algorithm": "lda",
  "status": "completed",
  "num_topics": 5,
  "total_comments": 1000,
  "valid_comments": 950,
  "diversity": 0.75,
  "topics": [
    {
      "id": 0,
      "label": "Topic 0",
      "document_count": 200,
      "words": [["machine", 0.05], ["learning", 0.04], ...],
      "representative_comments": ["comment 1", "comment 2", ...]
    },
    ...
  ],
  "preprocessing_stats": { ... },
  "model_info": { ... }
}
```

### Delete a Run

```bash
curl -X DELETE http://localhost:4242/api/runs/abc12345
```

Response:
```json
{
  "success": true,
  "message": "Run abc12345 deleted successfully"
}
```

---

## 🗄️ Database Schema

The PostgreSQL schema includes 10 tables:

| Table | Purpose |
|-------|---------|
| `modeling_jobs` | Job metadata, parameters, status |
| `topics` | Individual topics per job |
| `topic_words` | Top 20 words per topic with weights |
| `representative_comments` | Sample comments per topic (up to 5) |
| `document_topics` | Document-topic probability matrix (sparse) |
| `topic_sentiment` | Sentiment analysis per topic |
| `preprocessing_stats` | Preprocessing metrics |
| `topic_evolution` | Topic distribution over time |
| `inter_topic_distance` | 2D coordinates for topic visualization |
| `model_metadata` | Additional model info (perplexity, training time) |

**Key Design Decisions:**
- **Sparse storage**: Only probabilities > 0.01 stored in `document_topics`
- **Cascade deletes**: Deleting a job removes all related data automatically
- **JSONB for flexibility**: `language_distribution` and `most_common_words` stored as JSON
- **Indexes**: Optimized queries on `job_id`, `created_at`, `status`, `algorithm`

---

## 🧪 Testing

### Run Smoke Test

```bash
python test_database_integration.py
```

This test:
1. Connects to PostgreSQL
2. Creates database tables
3. Creates a test job
4. Saves topics with words
5. Saves document-topic probabilities (sparse)
6. Retrieves complete results
7. Lists all jobs with pagination
8. Deletes the test job (cascade)

### Manual Testing with PostgreSQL CLI

```bash
# Connect to database
docker exec -it topic-modeling-db-dev psql -U app -d app_db

# List tables
\dt

# Count jobs
SELECT COUNT(*) FROM modeling_jobs;

# View recent jobs
SELECT job_id, algorithm, status, created_at
FROM modeling_jobs
ORDER BY created_at DESC
LIMIT 5;

# View topics for a job
SELECT t.topic_number, t.label, t.document_count, COUNT(tw.id) as words_count
FROM topics t
LEFT JOIN topic_words tw ON t.id = tw.topic_id
WHERE t.job_id = 'abc12345'
GROUP BY t.id, t.topic_number, t.label, t.document_count
ORDER BY t.topic_number;

# Exit
\q
```

---

## 🐳 Docker Commands

```bash
# Start PostgreSQL
docker compose -f docker-compose.dev.yml up -d

# Stop PostgreSQL
docker compose -f docker-compose.dev.yml down

# View logs
docker compose -f docker-compose.dev.yml logs -f postgres

# Restart PostgreSQL
docker compose -f docker-compose.dev.yml restart postgres

# Remove all data (⚠️ destroys database)
docker compose -f docker-compose.dev.yml down -v

# Check database status
docker compose -f docker-compose.dev.yml ps
```

---

## 🔧 Troubleshooting

### Backend won't connect to database

**Problem**: `[DATABASE] Warning: Could not connect to database`

**Solution**:
1. Check PostgreSQL is running:
   ```bash
   docker compose -f docker-compose.dev.yml ps
   ```

2. Verify `.env` file exists and has correct `DATABASE_URL`:
   ```env
   DATABASE_URL=postgresql+psycopg2://app:app_pw@localhost:5432/app_db
   ```

3. Check PostgreSQL logs:
   ```bash
   docker compose -f docker-compose.dev.yml logs postgres
   ```

4. Test connection manually:
   ```bash
   docker exec -it topic-modeling-db-dev psql -U app -d app_db -c "SELECT 1;"
   ```

### Smoke test fails

**Problem**: Tests fail with connection errors

**Solution**:
1. Ensure DATABASE_URL is set:
   ```bash
   # Windows PowerShell
   $env:DATABASE_URL = "postgresql+psycopg2://app:app_pw@localhost:5432/app_db"
   python test_database_integration.py

   # Or create .env file (recommended)
   ```

2. Check `.env` file is loaded:
   ```python
   from dotenv import load_dotenv
   import os
   load_dotenv()
   print(os.getenv("DATABASE_URL"))
   ```

### Port 5432 already in use

**Problem**: PostgreSQL won't start - port conflict

**Solution**:
1. Check what's using port 5432:
   ```bash
   # Windows
   netstat -ano | findstr :5432

   # Linux/macOS
   lsof -i :5432
   ```

2. Stop the conflicting service or change the port in `docker-compose.dev.yml`:
   ```yaml
   ports:
     - "5433:5432"  # Use port 5433 on host
   ```

   Then update `.env`:
   ```env
   DATABASE_URL=postgresql+psycopg2://app:app_pw@localhost:5433/app_db
   ```

### Database schema not created

**Problem**: Tables don't exist after starting PostgreSQL

**Solution**:
1. Check init.sql was mounted:
   ```bash
   docker exec -it topic-modeling-db-dev ls /docker-entrypoint-initdb.d/
   ```

2. Check PostgreSQL initialization logs:
   ```bash
   docker compose -f docker-compose.dev.yml logs postgres | grep init
   ```

3. Manually run init script:
   ```bash
   docker exec -i topic-modeling-db-dev psql -U app -d app_db < database/init.sql
   ```

---

## 📝 Next Steps

After validating Option B (vertical slice), you can proceed with:

1. **Enhanced Analytics** (Phase 2):
   - Sentiment analysis per topic
   - Coherence score calculation
   - Inter-topic distance visualization (UMAP/t-SNE)
   - Topic evolution over time

2. **Frontend Enhancements** (Phase 3):
   - Algorithm descriptions in UI
   - Advanced visualizations (heatmaps, word clouds, timelines)
   - Export functionality (JSON/CSV/Excel)
   - Job history and comparison UI

3. **Production Docker** (Phase 4):
   - Complete docker-compose with backend + frontend
   - Nginx reverse proxy
   - Production-ready configuration
   - Health checks and monitoring

---

## 🔗 Related Files

- **Database Schema**: `database/schema.sql` & `database/init.sql`
- **ORM Models**: `database/models.py`
- **Database Manager**: `database/db_manager.py`
- **Backend Integration**: `app.py` (lines 39-55, 1083-1150, 1360-1584)
- **Environment Config**: `.env` & `.env.example`
- **Docker Compose**: `docker-compose.dev.yml`
- **Smoke Test**: `test_database_integration.py`

---

## ⚠️ Important Notes

- **Data Persistence**: PostgreSQL data is stored in Docker volume `postgres_data_dev`
- **Backward Compatibility**: Backend works with or without database (falls back to in-memory)
- **Thread Safety**: All database operations are thread-safe via connection pooling
- **Sparse Storage**: Document-topic probabilities < 0.01 are not stored (optimization)
- **Cascade Deletes**: Deleting a job automatically removes all related data

---

## 📚 Additional Resources

- [SQLAlchemy Documentation](https://docs.sqlalchemy.org/)
- [PostgreSQL Docker Image](https://hub.docker.com/_/postgres)
- [Flask Environment Variables](https://flask.palletsprojects.com/en/latest/config/)

---

**Status**: ✅ Option B Implementation Complete
**Next**: Run smoke test, validate API endpoints, then proceed to Phase 2/3 enhancements
