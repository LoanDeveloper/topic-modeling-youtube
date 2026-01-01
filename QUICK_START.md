# Quick Start Guide

Get the Topic Modeling YouTube application running in 5 minutes.

---

## Prerequisites

- ✅ Docker installed ([Get Docker](https://docs.docker.com/get-docker/))
- ✅ Docker Compose installed (included with Docker Desktop)
- ✅ 8GB+ RAM available
- ✅ Ports 3000, 4242, 5432 free

---

## 🚀 Launch the Application

### Option 1: Automated Deployment (Recommended)

```bash
# 1. Navigate to project directory
cd topic-modeling-youtube

# 2. Create environment file
cp .env.example .env

# 3. Edit .env and set a secure password
# IMPORTANT: Change POSTGRES_PASSWORD from 'your_secure_password_here' to something secure
nano .env  # or use any text editor

# 4. Run deployment script
bash deploy.sh

# 5. Wait for services to start (30-60 seconds)
# You'll see: "✅ Deployment complete!"
```

### Option 2: Manual Deployment

```bash
# 1. Create environment file
cp .env.example .env

# 2. Edit .env and set POSTGRES_PASSWORD
# (use your text editor of choice)

# 3. Build images
docker-compose build

# 4. Start services
docker-compose up -d

# 5. Check status
docker-compose ps
```

---

## ✅ Verify Installation

### Check Services Status

```bash
docker-compose ps
```

You should see:
```
NAME                        STATUS
topic-modeling-backend      Up (healthy)
topic-modeling-db          Up (healthy)
topic-modeling-frontend     Up (healthy)
```

### Access the Application

- **Frontend UI**: http://localhost:3000
- **Backend API**: http://localhost:4242/api/health
- **API Docs**: http://localhost:4242/

---

## 📊 First Run: Create a Topic Model

1. Open http://localhost:3000
2. Navigate to "Topic Modeling" tab
3. Enter a YouTube channel (e.g., `@3Blue1Brown`, `@Fireship`)
4. Configure parameters:
   - Algorithm: LDA (recommended for first run)
   - Number of Topics: 5
   - N-gram Range: (1, 2)
   - Language: Auto
5. Click "Start Modeling"
6. Wait for completion (2-10 minutes depending on channel size)
7. View results with all 7 visualizations:
   - Preprocessing Stats
   - Word Clouds
   - Topic Heatmap
   - Coherence Scores
   - Topic Evolution Timeline
   - Inter-Topic Distance Map
   - Sentiment Analysis

---

## 🛠️ Useful Commands

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

### Restart Services

```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart backend
```

### Stop Services

```bash
# Stop (can resume later)
docker-compose stop

# Stop and remove containers (data persists)
docker-compose down

# Stop and remove everything including data (⚠️ CAUTION)
docker-compose down -v
```

### Database Access

```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U postgres -d topic_modeling

# Useful SQL queries:
# \dt                           - List all tables
# \d modeling_jobs              - Describe modeling_jobs table
# SELECT * FROM modeling_jobs;  - View all jobs
# \q                            - Quit
```

### Rebuild After Code Changes

```bash
# Rebuild specific service
docker-compose build backend
docker-compose up -d backend

# Rebuild everything
docker-compose build
docker-compose up -d
```

---

## 🐛 Troubleshooting

### Port Already in Use

```bash
# Find process using port 3000 (Windows)
netstat -ano | findstr :3000

# Find process using port 3000 (Mac/Linux)
lsof -i :3000

# Change port in .env file:
FRONTEND_PORT=3001
BACKEND_PORT=4243
```

### Database Connection Issues

```bash
# Check if database is healthy
docker-compose ps postgres

# View database logs
docker-compose logs postgres

# Restart database
docker-compose restart postgres

# Reset database (⚠️ deletes all data)
docker-compose down -v
docker-compose up -d
```

### Backend Not Starting

```bash
# Check logs
docker-compose logs backend

# Common issues:
# 1. Database not ready -> Wait 30 seconds and restart
# 2. Dependencies missing -> Rebuild: docker-compose build backend
# 3. Port conflict -> Change BACKEND_PORT in .env
```

### Frontend Not Loading

```bash
# Check logs
docker-compose logs frontend

# Common issues:
# 1. Build failed -> Check for Node.js errors in logs
# 2. API connection -> Verify backend is healthy
# 3. Port conflict -> Change FRONTEND_PORT in .env

# Rebuild frontend
docker-compose build frontend
docker-compose up -d frontend
```

### Out of Memory

```bash
# Increase Docker memory limit (Docker Desktop -> Settings -> Resources)
# Recommended: 8GB minimum

# Or reduce workers in .env:
# (Not applicable yet - will be added in future)
```

---

## 📁 Project Structure

```
topic-modeling-youtube/
├── frontend/                  # React frontend
│   ├── src/
│   │   └── components/
│   │       └── modeling/
│   │           └── visualizations/  # 7 new visualization components
│   ├── Dockerfile            # Frontend container
│   └── nginx.conf            # Nginx configuration
├── backend/
│   ├── analysis/             # NEW: Enhanced analysis modules
│   │   ├── sentiment.py
│   │   ├── coherence.py
│   │   └── dimensionality_reduction.py
│   ├── export/               # NEW: Export functionality
│   │   └── exporters.py
│   └── app.py                # Flask backend (enhanced)
├── database/
│   ├── schema.sql            # Database schema
│   ├── init.sql              # Initialization script
│   └── db_manager.py         # Database operations
├── docker-compose.yml        # Service orchestration
├── Dockerfile.backend        # Backend container
├── .env.example              # Environment template
└── deploy.sh                 # Deployment script
```

---

## 🔧 Development Mode

### Run Backend Locally (without Docker)

```bash
# 1. Create virtual environment
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Start PostgreSQL (keep Docker for DB)
docker-compose up -d postgres

# 4. Set environment variables
export DATABASE_URL="postgresql://postgres:your_password@localhost:5432/topic_modeling"

# 5. Run Flask
python app.py

# Access at http://localhost:4242
```

### Run Frontend Locally (without Docker)

```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Start dev server
npm run dev

# Access at http://localhost:5173
# (Vite default port, proxies to backend at 4242)
```

---

## 📚 Next Steps

1. **Explore Visualizations**: Check `frontend/src/components/modeling/visualizations/README.md`
2. **API Documentation**: See enhanced endpoints in `app.py` lines 1691-1797
3. **Export Data**: Test JSON, CSV, Excel export via API or UI
4. **Customize**: Modify colors, layouts, parameters as needed
5. **Scale**: Add more workers, optimize for larger datasets

---

## 🆘 Getting Help

### Documentation
- **Week 2 Summary**: `WEEK_2_COMPLETION_SUMMARY.md`
- **Visualization Components**: `frontend/src/components/modeling/visualizations/`
  - `README.md` - Component docs
  - `INTEGRATION_CHECKLIST.md` - Integration guide
  - `COMPONENT_PREVIEW.md` - Visual previews
  - `SampleUsage.tsx` - Code examples

### Logs
Always check logs first:
```bash
docker-compose logs -f
```

### Database
Verify database health:
```bash
docker-compose exec postgres psql -U postgres -d topic_modeling -c "SELECT COUNT(*) FROM modeling_jobs;"
```

---

## 🎉 Success Indicators

You'll know everything is working when:

1. ✅ All 3 services show "healthy" in `docker-compose ps`
2. ✅ Frontend loads at http://localhost:3000
3. ✅ Backend health check returns OK at http://localhost:4242/api/health
4. ✅ You can create a topic modeling job
5. ✅ All 7 visualizations render with data
6. ✅ Export functionality works

---

## 🚀 You're All Set!

The application is production-ready with:
- ✅ Complete backend analysis pipeline
- ✅ 7 professional visualization components
- ✅ Sentiment analysis
- ✅ Topic coherence scoring
- ✅ Inter-topic distance maps
- ✅ Export to JSON, CSV, Excel
- ✅ Full Docker deployment

**Happy topic modeling!** 🎊
