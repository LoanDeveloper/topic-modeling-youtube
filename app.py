import argparse
import json
import os
import threading
import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from queue import Queue

import yt_dlp
from flask import Flask, jsonify, render_template, request, send_file
from flask_cors import CORS
from dotenv import load_dotenv

from modeling.lda_model import LDAModel
from modeling.nmf_model import NMFModel

# Topic modeling imports
from nlp.language_detector import LanguageDetector
from nlp.preprocessing import TextPreprocessor

# Database imports
from database.db_manager import DatabaseManager

# Number of parallel workers for comment extraction (default to 2 for rate limit safety)
DEFAULT_WORKERS = 2
MAX_WORKERS = (os.cpu_count() or 4) * 2  # Allow up to 2x CPU count

# Cookies file for YouTube authentication (to avoid bot detection)
COOKIES_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "cookies.txt")

app = Flask(__name__)
CORS(app)  # Enable CORS for React frontend
app.config["OUTPUT_DIR"] = "data"

# Créer le dossier data s'il n'existe pas
os.makedirs(app.config["OUTPUT_DIR"], exist_ok=True)

# Load environment variables
load_dotenv()

# Initialize database manager
DATABASE_URL = os.getenv("DATABASE_URL")
db_manager = None

if DATABASE_URL:
    try:
        db_manager = DatabaseManager(DATABASE_URL)
        db_manager.create_tables()  # Ensure tables exist
        print(f"[DATABASE] Connected successfully to {DATABASE_URL.split('@')[1] if '@' in DATABASE_URL else 'database'}")
    except Exception as e:
        print(f"[DATABASE] Warning: Could not connect to database: {e}")
        print(f"[DATABASE] Running in memory-only mode. Results will not persist across restarts.")
else:
    print("[DATABASE] No DATABASE_URL found. Running in memory-only mode.")

# Global state for extraction tracking
extraction_state = {
    "active": False,
    "stop_requested": False,
    "current_channel": None,
    "current_video": None,
    "videos_total": 0,
    "videos_completed": 0,
    "comments_extracted": 0,
    "filename": None,
}
extraction_lock = threading.Lock()

# Queue for multi-channel extraction
extraction_queue = Queue()
queue_list = []  # For display purposes
queue_lock = threading.Lock()

# Global state for topic modeling
modeling_state = {
    "active": False,
    "current_job_id": None,
    "stage": "idle",  # idle, preprocessing, training, visualizing
    "progress": 0,
    "total_comments": 0,
    "processed_comments": 0,
    "message": "",
    "channels": [],
}
modeling_lock = threading.Lock()

# Queue for topic modeling jobs
modeling_queue = Queue()
modeling_jobs = {}  # job_id -> job metadata and results
modeling_jobs_lock = threading.Lock()


def get_already_downloaded_video_ids(channel_folder=None):
    """Get all video IDs that have already been downloaded.

    If channel_folder is provided, only check that channel's videos folder.
    Otherwise, check all channels.
    """
    downloaded_ids = set()
    output_dir = app.config["OUTPUT_DIR"]

    if channel_folder:
        # Check specific channel's videos folder
        videos_dir = os.path.join(output_dir, channel_folder, "videos")
        if os.path.exists(videos_dir):
            for filename in os.listdir(videos_dir):
                if filename.endswith(".json"):
                    video_id = filename.replace(".json", "")
                    downloaded_ids.add(video_id)
    else:
        # Check all channels
        if os.path.exists(output_dir):
            for channel_name in os.listdir(output_dir):
                videos_dir = os.path.join(output_dir, channel_name, "videos")
                if os.path.isdir(videos_dir):
                    for filename in os.listdir(videos_dir):
                        if filename.endswith(".json"):
                            video_id = filename.replace(".json", "")
                            downloaded_ids.add(video_id)

    return downloaded_ids


def get_channel_videos(channel_url):
    """Récupère la liste de toutes les vidéos d'une chaîne avec métadonnées."""
    ydl_opts = {
        "quiet": True,
        "no_warnings": True,
        "extract_flat": True,
        "force_generic_extractor": False,
    }
    # Add cookies if file exists
    if os.path.exists(COOKIES_FILE):
        ydl_opts["cookiefile"] = COOKIES_FILE

    # Construire l'URL de la chaîne si ce n'est pas déjà une URL complète
    original_input = channel_url
    if not channel_url.startswith("http"):
        if channel_url.startswith("@"):
            channel_url = f"https://www.youtube.com/{channel_url}/videos"
        else:
            channel_url = f"https://www.youtube.com/channel/{channel_url}/videos"
    elif "/videos" not in channel_url:
        channel_url = channel_url.rstrip("/") + "/videos"

    videos = []
    channel_info = {}

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        result = ydl.extract_info(channel_url, download=False)

        if result:
            # Extract channel metadata
            channel_info = {
                "channel_name": result.get(
                    "channel", result.get("uploader", "Unknown")
                ),
                "channel_id": result.get("channel_id", result.get("uploader_id", "")),
                "channel_url": result.get(
                    "channel_url", result.get("uploader_url", "")
                ),
                "description": result.get("description", ""),
                "subscriber_count": result.get("channel_follower_count"),
                "original_input": original_input,
            }

            if "entries" in result:
                for entry in result["entries"]:
                    if entry:
                        videos.append(
                            {
                                "id": entry.get("id"),
                                "title": entry.get("title"),
                                "url": f"https://www.youtube.com/watch?v={entry.get('id')}",
                            }
                        )

    return videos, channel_info


def get_video_comments(video_url):
    """Fetch all comments from a video."""
    ydl_opts = {
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
        "getcomments": True,
        "extract_flat": False,
        "extractor_args": {
            "youtube": {"comment_sort": ["top"], "skip": ["dash", "hls"]}
        },
        "ignore_no_formats_error": True,
        "check_formats": False,  # Don't check format availability
    }
    # Add cookies if file exists
    if os.path.exists(COOKIES_FILE):
        ydl_opts["cookiefile"] = COOKIES_FILE

    comments = []
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        result = ydl.extract_info(video_url, download=False)

        if result and "comments" in result:
            for comment in result["comments"]:
                comments.append(
                    {
                        "author": comment.get("author"),
                        "author_id": comment.get("author_id"),
                        "text": comment.get("text"),
                        "likes": comment.get("like_count", 0),
                        "timestamp": comment.get("timestamp"),
                        "parent": comment.get("parent", "root"),
                        "is_reply": comment.get("parent") != "root",
                    }
                )

    return comments


def scrape_video_comments(video):
    """Helper function to scrape comments from a single video (for parallel execution)."""
    try:
        comments = get_video_comments(video["url"])
        return {
            "video_id": video["id"],
            "title": video["title"],
            "url": video["url"],
            "comment_count": len(comments),
            "comments": comments,
            "error": None,
        }
    except Exception as e:
        return {
            "video_id": video["id"],
            "title": video["title"],
            "url": video["url"],
            "comment_count": 0,
            "comments": [],
            "error": str(e),
        }


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/system-info")
def system_info():
    """Get system info for UI configuration."""
    return jsonify(
        {
            "cpu_count": os.cpu_count() or 4,
            "default_workers": DEFAULT_WORKERS,
            "max_workers": MAX_WORKERS,
        }
    )


@app.route("/api/channel-info", methods=["POST"])
def get_channel_info():
    """Endpoint pour récupérer les infos de la chaîne."""
    data = request.json
    channel_input = data.get("channel", "")

    if not channel_input:
        return jsonify({"error": "Veuillez fournir un nom ou ID de chaîne"}), 400

    try:
        videos, channel_info = get_channel_videos(channel_input)
        return jsonify(
            {
                "channel_name": channel_info.get("channel_name", "Unknown"),
                "channel_id": channel_info.get("channel_id", ""),
                "description": channel_info.get("description", ""),
                "subscriber_count": channel_info.get("subscriber_count"),
                "video_count": len(videos),
                "videos": videos,
            }
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500


def save_progress(filepath, data, lock):
    """Save current progress to JSON file (thread-safe)."""
    with lock:
        # Update stats before saving
        data["total_comments"] = sum(v.get("comment_count", 0) for v in data["videos"])
        data["total_videos"] = len(data["videos"])
        data["videos_completed"] = len(data["videos"])
        data["last_updated"] = datetime.now().isoformat()
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)


def update_extraction_state(**kwargs):
    """Update global extraction state."""
    with extraction_lock:
        extraction_state.update(kwargs)


def reset_extraction_state():
    """Reset extraction state."""
    with extraction_lock:
        extraction_state.update(
            {
                "active": False,
                "stop_requested": False,
                "current_channel": None,
                "current_video": None,
                "videos_total": 0,
                "videos_completed": 0,
                "comments_extracted": 0,
                "filename": None,
            }
        )


def save_video_json(videos_dir, video_data, lock):
    """Save a single video's data to its own JSON file."""
    video_id = video_data.get("video_id")
    if not video_id:
        return
    filepath = os.path.join(videos_dir, f"{video_id}.json")
    with lock:
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(video_data, f, ensure_ascii=False, indent=2)


def save_channel_info(channel_dir, channel_info, videos_stats, lock):
    """Save/update channel info.json with current stats."""
    filepath = os.path.join(channel_dir, "info.json")
    with lock:
        info = channel_info.copy()
        info["last_updated"] = datetime.now().isoformat()
        info["total_videos"] = videos_stats.get("total_videos", 0)
        info["videos_extracted"] = videos_stats.get("videos_extracted", 0)
        info["total_comments"] = videos_stats.get("total_comments", 0)
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(info, f, ensure_ascii=False, indent=2)


def do_extraction(channel_input, limit=None, skip_existing=False, workers=None):
    """Worker function for extraction (runs in background thread).

    New folder structure:
    data/
      @ChannelName/
        info.json              <- Channel metadata
        videos/
          <video_id>.json      <- One file per video
    """
    try:
        update_extraction_state(active=True, stop_requested=False)

        videos, channel_info = get_channel_videos(channel_input)
        channel_name = channel_info.get("channel_name", "Unknown")
        total_available = len(videos)

        update_extraction_state(current_channel=channel_name)

        # Create safe folder name from channel input or name
        if channel_input.startswith("@"):
            folder_name = channel_input  # Use @handle as folder name
        else:
            folder_name = "".join(
                c for c in channel_name if c.isalnum() or c in (" ", "-", "_", "@")
            ).strip()

        # Create folder structure
        channel_dir = os.path.join(app.config["OUTPUT_DIR"], folder_name)
        videos_dir = os.path.join(channel_dir, "videos")
        os.makedirs(videos_dir, exist_ok=True)

        update_extraction_state(filename=folder_name)

        # Get already downloaded video IDs for this channel
        already_downloaded = get_already_downloaded_video_ids(folder_name)
        existing_count = len(already_downloaded)

        # Filter out already downloaded videos if skip_existing is enabled
        if skip_existing:
            original_count = len(videos)
            videos = [v for v in videos if v["id"] not in already_downloaded]
            skipped_count = original_count - len(videos)
            if skipped_count > 0:
                print(f"Skipping {skipped_count} already downloaded videos")

        # Apply limit if specified
        if limit and limit > 0:
            videos = videos[:limit]

        if len(videos) == 0:
            print("All videos already extracted, nothing new to do")
            reset_extraction_state()
            return {
                "success": True,
                "channel_name": channel_name,
                "folder": folder_name,
                "total_videos": existing_count,
                "message": "All videos already extracted",
            }

        # Lock for thread-safe file writing
        file_lock = threading.Lock()

        # Calculate existing comments count
        existing_comments = 0
        for vid_file in os.listdir(videos_dir) if os.path.exists(videos_dir) else []:
            if vid_file.endswith(".json"):
                try:
                    with open(os.path.join(videos_dir, vid_file), "r") as f:
                        vid_data = json.load(f)
                        existing_comments += vid_data.get("comment_count", 0)
                except Exception:
                    pass

        update_extraction_state(
            videos_total=len(videos),
            videos_completed=0,
            comments_extracted=existing_comments,
        )

        # Save initial channel info
        videos_stats = {
            "total_videos": total_available,
            "videos_extracted": existing_count,
            "total_comments": existing_comments,
        }
        save_channel_info(channel_dir, channel_info, videos_stats, file_lock)

        num_workers = min(workers or DEFAULT_WORKERS, MAX_WORKERS)
        print(
            f"Starting parallel extraction for {len(videos)} NEW videos with {num_workers} workers..."
        )
        print(f"Saving to: {channel_dir}/videos/")

        total_comments = existing_comments
        completed = 0

        # Parallel extraction using ThreadPoolExecutor
        with ThreadPoolExecutor(max_workers=num_workers) as executor:
            future_to_video = {
                executor.submit(scrape_video_comments, video): video for video in videos
            }

            rate_limit_hit = False
            successful_videos = 0

            for future in as_completed(future_to_video):
                # Check if stop was requested
                if extraction_state["stop_requested"]:
                    print("Stop requested, cancelling remaining tasks...")
                    executor.shutdown(wait=False, cancel_futures=True)
                    break

                completed += 1
                result = future.result()
                video_title = result["title"][:50] if result["title"] else "Unknown"

                if result.get("error"):
                    error_msg = result["error"]
                    print(
                        f"[{completed}/{len(videos)}] Error: {video_title} - {error_msg}"
                    )

                    # Check for rate limiting (403 Forbidden)
                    if "403" in error_msg or "Forbidden" in error_msg:
                        print("\n⚠️  RATE LIMIT DETECTED (403 Forbidden)")
                        print("YouTube is blocking requests. Stopping extraction...")
                        rate_limit_hit = True
                        executor.shutdown(wait=False, cancel_futures=True)
                        break

                    # Don't save videos with errors
                    continue

                print(
                    f"[{completed}/{len(videos)}] Done: {video_title} ({result['comment_count']} comments)"
                )

                # Save individual video file (only successful ones)
                save_video_json(videos_dir, result, file_lock)
                successful_videos += 1

                # Update stats
                total_comments += result.get("comment_count", 0)
                videos_stats = {
                    "total_videos": total_available,
                    "videos_extracted": existing_count + successful_videos,
                    "total_comments": total_comments,
                }
                save_channel_info(channel_dir, channel_info, videos_stats, file_lock)

                # Update global state
                update_extraction_state(
                    videos_completed=completed,
                    current_video=video_title,
                    comments_extracted=total_comments,
                )

        # Final stats
        was_stopped = extraction_state["stop_requested"]
        final_video_count = existing_count + successful_videos

        if rate_limit_hit:
            print(f"\n⚠️  Extraction stopped due to rate limiting!")
            print(
                f"Successfully extracted {successful_videos} videos before hitting the limit."
            )
            print(f"Re-run with 'Skip already downloaded' to continue later.")
        elif was_stopped:
            print(
                f"Extraction stopped! {total_comments} comments saved to {folder_name}/"
            )
        else:
            print(
                f"Extraction complete! {total_comments} comments in {final_video_count} videos saved to {folder_name}/"
            )

        reset_extraction_state()

        return {
            "success": not rate_limit_hit,
            "channel_name": channel_name,
            "folder": folder_name,
            "total_videos": final_video_count,
            "total_comments": total_comments,
            "stopped": was_stopped,
            "rate_limited": rate_limit_hit,
            "message": "Rate limit hit (403). Try again later with fewer workers."
            if rate_limit_hit
            else None,
        }
    except Exception as e:
        print(f"Extraction error: {e}")
        reset_extraction_state()
        return {"error": str(e)}


def queue_worker():
    """Background worker to process extraction queue."""
    while True:
        job = extraction_queue.get()
        if job is None:
            break

        job_id, channel_input, limit, skip_existing, workers = job

        # Update queue status
        with queue_lock:
            for item in queue_list:
                if item["id"] == job_id:
                    item["status"] = "running"
                    break

        # Do the extraction
        result = do_extraction(channel_input, limit, skip_existing, workers)

        # Update queue status
        with queue_lock:
            for item in queue_list:
                if item["id"] == job_id:
                    item["status"] = "completed" if result.get("success") else "error"
                    item["result"] = result
                    break

        extraction_queue.task_done()


# Start the queue worker thread
queue_thread = threading.Thread(target=queue_worker, daemon=True)
queue_thread.start()


def modeling_worker():
    """Background worker to process topic modeling queue."""
    while True:
        job = modeling_queue.get()
        if job is None:
            break

        job_id, channels, algorithm, params = job

        # Update job status
        with modeling_jobs_lock:
            if job_id in modeling_jobs:
                modeling_jobs[job_id]["status"] = "running"

        # Do the topic modeling
        result = do_topic_modeling(job_id, channels, algorithm, params)

        modeling_queue.task_done()


# Start the modeling worker thread
modeling_thread = threading.Thread(target=modeling_worker, daemon=True)
modeling_thread.start()


@app.route("/api/scrape-comments", methods=["POST"])
def scrape_comments():
    """Endpoint to queue channel extraction(s). Supports multiple channels separated by commas."""
    data = request.json
    channel_input = data.get("channel", "")
    limit = data.get("limit")
    skip_existing = data.get("skip_existing", False)
    workers = data.get("workers", DEFAULT_WORKERS)

    if not channel_input:
        return jsonify({"error": "Please provide a channel name or ID"}), 400

    # Parse multiple channels (comma-separated)
    channels = [ch.strip() for ch in channel_input.split(",") if ch.strip()]

    if not channels:
        return jsonify({"error": "Please provide at least one valid channel"}), 400

    job_ids = []
    for channel in channels:
        # Create job for each channel
        job_id = str(uuid.uuid4())[:8]
        job = (job_id, channel, limit, skip_existing, workers)

        # Add to queue
        with queue_lock:
            queue_list.append(
                {"id": job_id, "channel": channel, "status": "queued", "result": None}
            )

        extraction_queue.put(job)
        job_ids.append(job_id)

    return jsonify(
        {
            "success": True,
            "job_ids": job_ids,
            "channels_queued": len(channels),
            "message": f"{len(channels)} channel(s) queued for extraction",
            "queue_size": extraction_queue.qsize(),
        }
    )


@app.route("/api/extraction-status")
def get_extraction_status():
    """Get current extraction status for real-time progress."""
    with extraction_lock:
        status = extraction_state.copy()

    with queue_lock:
        status["queue"] = queue_list.copy()

    return jsonify(status)


@app.route("/api/stop-extraction", methods=["POST"])
def stop_extraction():
    """Stop the current extraction."""
    with extraction_lock:
        if extraction_state["active"]:
            extraction_state["stop_requested"] = True
            return jsonify({"success": True, "message": "Stop requested"})
        else:
            return jsonify({"success": False, "message": "No extraction in progress"})


@app.route("/api/clear-queue", methods=["POST"])
def clear_queue():
    """Clear completed/errored items from queue."""
    with queue_lock:
        queue_list[:] = [
            item for item in queue_list if item["status"] in ("queued", "running")
        ]
    return jsonify({"success": True})


@app.route("/api/download/<filename>")
def download_file(filename):
    """Télécharger le fichier JSON généré."""
    filepath = os.path.join(app.config["OUTPUT_DIR"], filename)
    if os.path.exists(filepath):
        return send_file(filepath, as_attachment=True)
    return jsonify({"error": "Fichier non trouvé"}), 404


@app.route("/api/files")
def list_files():
    """Lister tous les fichiers JSON disponibles."""
    files = []
    output_dir = app.config["OUTPUT_DIR"]

    if os.path.exists(output_dir):
        for filename in os.listdir(output_dir):
            if filename.endswith(".json"):
                filepath = os.path.join(output_dir, filename)
                size = os.path.getsize(filepath)
                # Formater la taille
                if size < 1024:
                    size_str = f"{size} B"
                elif size < 1024 * 1024:
                    size_str = f"{size / 1024:.1f} KB"
                else:
                    size_str = f"{size / (1024 * 1024):.1f} MB"

                files.append({"name": filename, "size": size_str, "path": filepath})

    # Trier par date de modification (plus récent en premier)
    files.sort(key=lambda x: os.path.getmtime(x["path"]), reverse=True)

    return jsonify({"files": files})


@app.route("/api/files-stats")
def list_files_with_stats():
    """List all channels with their statistics (new folder structure)."""
    channels_list = []
    output_dir = app.config["OUTPUT_DIR"]
    total_videos = 0
    total_comments = 0

    if os.path.exists(output_dir):
        for folder_name in os.listdir(output_dir):
            channel_dir = os.path.join(output_dir, folder_name)
            info_path = os.path.join(channel_dir, "info.json")

            # Skip if not a directory or no info.json
            if not os.path.isdir(channel_dir):
                continue

            channel_info = {
                "folder": folder_name,
                "channel_name": folder_name,
                "video_count": 0,
                "comment_count": 0,
                "subscriber_count": None,
                "last_updated": "",
                "size": "0 B",
            }

            # Read info.json if exists
            if os.path.exists(info_path):
                try:
                    with open(info_path, "r", encoding="utf-8") as f:
                        data = json.load(f)
                        channel_info["channel_name"] = data.get(
                            "channel_name", folder_name
                        )
                        channel_info["channel_id"] = data.get("channel_id", "")
                        channel_info["description"] = data.get("description", "")
                        channel_info["subscriber_count"] = data.get("subscriber_count")
                        channel_info["video_count"] = data.get("videos_extracted", 0)
                        channel_info["total_videos_available"] = data.get(
                            "total_videos", 0
                        )
                        channel_info["comment_count"] = data.get("total_comments", 0)
                        channel_info["last_updated"] = data.get("last_updated", "")
                except Exception:
                    pass

            # Calculate folder size
            videos_dir = os.path.join(channel_dir, "videos")
            folder_size = 0
            if os.path.exists(videos_dir):
                for f in os.listdir(videos_dir):
                    fp = os.path.join(videos_dir, f)
                    if os.path.isfile(fp):
                        folder_size += os.path.getsize(fp)
            if os.path.exists(info_path):
                folder_size += os.path.getsize(info_path)

            if folder_size < 1024:
                channel_info["size"] = f"{folder_size} B"
            elif folder_size < 1024 * 1024:
                channel_info["size"] = f"{folder_size / 1024:.1f} KB"
            else:
                channel_info["size"] = f"{folder_size / (1024 * 1024):.1f} MB"

            # Accumulate global stats
            total_videos += channel_info["video_count"]
            total_comments += channel_info["comment_count"]

            channels_list.append(channel_info)

    # Sort by last updated (most recent first)
    channels_list.sort(key=lambda x: x.get("last_updated", ""), reverse=True)

    return jsonify(
        {
            "files": channels_list,  # Keep 'files' key for frontend compatibility
            "total_channels": len(channels_list),
            "total_videos": total_videos,
            "total_comments": total_comments,
        }
    )


@app.route("/api/file-detail/<folder>")
def get_file_detail(folder):
    """Get detailed content for a channel folder (new structure)."""
    channel_dir = os.path.join(app.config["OUTPUT_DIR"], folder)
    info_path = os.path.join(channel_dir, "info.json")
    videos_dir = os.path.join(channel_dir, "videos")

    if not os.path.exists(channel_dir):
        return jsonify({"error": "Channel folder not found"}), 404

    try:
        # Load channel info
        channel_info = {}
        if os.path.exists(info_path):
            with open(info_path, "r", encoding="utf-8") as f:
                channel_info = json.load(f)

        # Load all videos
        videos = []
        total_comments = 0
        if os.path.exists(videos_dir):
            for video_file in os.listdir(videos_dir):
                if video_file.endswith(".json"):
                    video_path = os.path.join(videos_dir, video_file)
                    try:
                        with open(video_path, "r", encoding="utf-8") as f:
                            video_data = json.load(f)
                            videos.append(video_data)
                            total_comments += video_data.get("comment_count", 0)
                    except Exception:
                        pass

        # Build response matching old format for frontend compatibility
        result = {
            "channel_name": channel_info.get("channel_name", folder),
            "channel_id": channel_info.get("channel_id", ""),
            "description": channel_info.get("description", ""),
            "subscriber_count": channel_info.get("subscriber_count"),
            "last_updated": channel_info.get("last_updated", ""),
            "total_videos": len(videos),
            "total_comments": total_comments,
            "videos": videos,
        }

        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


def load_comments_from_channels(channels: list) -> tuple:
    """Load comments from specified channels."""
    all_comments = []
    all_metadata = []
    output_dir = app.config["OUTPUT_DIR"]

    for channel in channels:
        channel_dir = os.path.join(output_dir, channel)
        videos_dir = os.path.join(channel_dir, "videos")

        if not os.path.exists(videos_dir):
            print(f"[WARNING] Channel '{channel}' has no videos/ folder - skipping")
            continue

        # Load all video files
        for video_file in os.listdir(videos_dir):
            if video_file.endswith(".json"):
                video_path = os.path.join(videos_dir, video_file)
                try:
                    with open(video_path, "r", encoding="utf-8") as f:
                        video_data = json.load(f)

                        # Extract comments
                        for comment in video_data.get("comments", []):
                            all_comments.append(comment["text"])
                            all_metadata.append(
                                {
                                    "channel": channel,
                                    "video_id": video_data.get("video_id"),
                                    "video_title": video_data.get("title"),
                                    "author": comment.get("author"),
                                    "likes": comment.get("likes", 0),
                                    "timestamp": comment.get("timestamp"),
                                }
                            )
                except Exception as e:
                    print(f"Error loading {video_file}: {e}")

    return all_comments, all_metadata


def do_topic_modeling(job_id: str, channels: list, algorithm: str, params: dict):
    """
    Perform topic modeling on comments from specified channels.

    Args:
        job_id: Unique job identifier
        channels: List of channel names/folders
        algorithm: Algorithm to use ('lda' or 'nmf')
        params: Algorithm parameters
    """
    print(f"[MODELING] Starting job {job_id} for channels: {channels}")
    print(f"[MODELING] Algorithm: {algorithm}, Params: {params}")

    try:
        # Update state
        with modeling_lock:
            modeling_state.update(
                {
                    "active": True,
                    "current_job_id": job_id,
                    "stage": "loading",
                    "progress": 0,
                    "message": "Loading comments...",
                    "channels": channels,
                }
            )

        print(f"[MODELING] State updated, progress=0")

        # Load comments
        print(f"[MODELING] Loading comments from channels...")
        comments, metadata = load_comments_from_channels(channels)
        print(f"[MODELING] Loaded {len(comments)} comments")

        if not comments:
            print(f"[MODELING] ERROR: No comments found!")
            raise ValueError(
                f"No comments found in specified channels: {channels}. Make sure these channels have extracted videos with comments."
            )

        with modeling_lock:
            modeling_state.update(
                {
                    "total_comments": len(comments),
                    "progress": 10,
                    "message": f"Loaded {len(comments)} comments",
                }
            )

        print(f"[MODELING] Progress updated to 10%")

        # Progress callback
        def progress_callback(progress, message):
            with modeling_lock:
                modeling_state.update(
                    {
                        "progress": int(20 + (progress * 0.5)),  # 20-70%
                        "message": message,
                    }
                )

        # Preprocess comments
        with modeling_lock:
            modeling_state.update(
                {
                    "stage": "preprocessing",
                    "progress": 20,
                    "message": "Preprocessing comments...",
                }
            )

        language = params.get("language", "auto")
        print(f"[MODELING] Creating TextPreprocessor with language={language}")

        try:
            preprocessor = TextPreprocessor(
                language=language,
                use_lemmatization=True,
                progress_callback=progress_callback,
            )
            print(f"[MODELING] TextPreprocessor created successfully")
        except Exception as e:
            print(f"[MODELING] ERROR creating TextPreprocessor: {e}")
            raise

        print(f"[MODELING] Starting batch processing of {len(comments)} comments...")
        try:
            processed_comments = preprocessor.process_batch(
                comments, detect_language=(language == "auto")
            )
            print(
                f"[MODELING] Batch processing complete: {len(processed_comments)} processed"
            )
        except Exception as e:
            print(f"[MODELING] ERROR during batch processing: {e}")
            raise

        # Filter empty documents
        print(f"[MODELING] Filtering empty documents...")
        valid_indices = [i for i, doc in enumerate(processed_comments) if doc.strip()]
        processed_comments = [processed_comments[i] for i in valid_indices]
        comments = [
            comments[i] for i in valid_indices
        ]  # Keep comments aligned with processed_comments
        metadata = [metadata[i] for i in valid_indices]
        print(f"[MODELING] After filtering: {len(processed_comments)} valid documents")

        if len(processed_comments) < params.get("num_topics", 5):
            print(f"[MODELING] ERROR: Too few valid documents!")
            raise ValueError(
                f"Too few valid documents ({len(processed_comments)}) for {params.get('num_topics', 5)} topics"
            )

        # Train model
        print(f"[MODELING] Starting model training with {algorithm.upper()}...")
        with modeling_lock:
            modeling_state.update(
                {
                    "stage": "training",
                    "progress": 70,
                    "message": f"Training {algorithm.upper()} model...",
                }
            )

        if algorithm == "lda":
            model = LDAModel(
                num_topics=params.get("num_topics", 5),
                n_gram_range=tuple(params.get("n_gram_range", [1, 2])),
                max_iter=params.get("max_iter", 20),
            )
        elif algorithm == "nmf":
            model = NMFModel(
                num_topics=params.get("num_topics", 5),
                n_gram_range=tuple(params.get("n_gram_range", [1, 2])),
                max_iter=params.get("max_iter", 200),
            )
        else:
            raise ValueError(f"Unknown algorithm: {algorithm}")

        model.fit(processed_comments, progress_callback=progress_callback)

        # Get representative documents for each topic
        print("[MODELING] Step A: Updating state to finalizing...")
        with modeling_lock:
            modeling_state.update(
                {
                    "stage": "finalizing",
                    "progress": 90,
                    "message": "Finalizing results...",
                }
            )

        print("[MODELING] Step B: Getting representative documents...")
        for topic in model.topics:
            topic["representative_comments"] = model.get_representative_documents(
                comments, int(topic["id"]), n=5
            )
        print("[MODELING] Step C: Representative documents done")

        # Prepare results
        print("[MODELING] Step D: Preparing results dict...")
        print("[MODELING] Step D1: document_topics.tolist()...")
        doc_topics_list = model.document_topics.tolist()
        print("[MODELING] Step D2: get_topic_diversity()...")
        diversity = model.get_topic_diversity()
        print("[MODELING] Step D3: get_model_info()...")
        model_info = model.get_model_info()
        print("[MODELING] Step D4: get_statistics()...")
        preprocessing_stats = preprocessor.get_statistics(comments, processed_comments)
        print("[MODELING] Step D5: Building results dict...")

        results = {
            "success": True,
            "job_id": job_id,
            "algorithm": algorithm,
            "num_topics": params.get("num_topics", 5),
            "total_comments": len(comments),
            "valid_comments": len(processed_comments),
            "channels": channels,
            "topics": model.topics,
            "document_topics": doc_topics_list,
            "metadata": metadata,
            "diversity": diversity,
            "model_info": model_info,
            "preprocessing_stats": preprocessing_stats,
        }
        print("[MODELING] Step E: Results dict created")

        # Store results in memory (backward compatibility)
        with modeling_jobs_lock:
            modeling_jobs[job_id]["result"] = results
            modeling_jobs[job_id]["status"] = "completed"

        # Persist to database if available
        if db_manager:
            try:
                print(f"[DATABASE] Persisting results for job {job_id} to PostgreSQL...")

                # 1. Update job with results summary
                db_manager.update_job_status(job_id, "completed")
                db_manager.update_job_results(
                    job_id=job_id,
                    total_comments=len(comments),
                    valid_comments=len(processed_comments),
                    diversity=diversity
                )

                # 2. Save topics with words and representative comments
                topics_data = []
                for topic in model.topics:
                    topic_data = {
                        'topic_number': int(topic['id']),
                        'label': topic.get('label', f"Topic {topic['id']}"),
                        'document_count': topic.get('document_count', 0),
                        'words': topic.get('words', []),
                        'representative_comments': topic.get('representative_comments', []),
                        'metadata': [metadata[i] for i, _ in enumerate(topic.get('representative_comments', [])[:5])] if len(metadata) > 0 else []
                    }
                    topics_data.append(topic_data)
                db_manager.save_topics(job_id, topics_data)

                # 3. Save document-topic probabilities (sparse, only prob > 0.01)
                doc_topics_sparse = []
                for doc_idx, doc_probs in enumerate(model.document_topics):
                    for topic_num, prob in enumerate(doc_probs):
                        if prob > 0.01:  # Only store significant probabilities
                            doc_topics_sparse.append({
                                'document_index': doc_idx,
                                'topic_number': topic_num,
                                'probability': float(prob),
                                'channel': metadata[doc_idx].get('channel') if doc_idx < len(metadata) else None,
                                'video_id': metadata[doc_idx].get('video_id') if doc_idx < len(metadata) else None
                            })
                db_manager.save_document_topics_batch(job_id, doc_topics_sparse)

                # 4. Save preprocessing stats
                db_manager.save_preprocessing_stats(job_id, {
                    'original_comments': preprocessing_stats.get('original_documents', len(comments)),
                    'valid_comments': preprocessing_stats.get('processed_documents', len(processed_comments)),
                    'filtered_comments': preprocessing_stats.get('empty_documents', 0),
                    'avg_length_original': preprocessing_stats.get('avg_length_original', 0),
                    'avg_length_processed': preprocessing_stats.get('avg_tokens_per_doc', 0),
                    'total_vocabulary': model_info.get('num_features', 0),
                    'language_distribution': {},  # To be enhanced with actual language detection
                    'most_common_words': None
                })

                # 5. Save model metadata
                db_manager.save_model_metadata(job_id, {
                    'vocabulary_size': model_info.get('num_features', 0),
                    'max_iter': model_info.get('max_iter', params.get('max_iter', 20)),
                    'perplexity': model_info.get('perplexity'),
                    'reconstruction_error': model_info.get('reconstruction_error'),
                    'training_time_seconds': None  # To be added with timing
                })

                print(f"[DATABASE] Successfully persisted job {job_id} to PostgreSQL")
            except Exception as e:
                print(f"[DATABASE] Error persisting to database: {e}")
                # Don't fail the job if database save fails - results are still in memory

        with modeling_lock:
            modeling_state.update(
                {"active": False, "progress": 100, "message": "Modeling completed"}
            )

        return results

    except Exception as e:
        error_msg = str(e)
        print(f"Topic modeling error: {error_msg}")

        with modeling_jobs_lock:
            modeling_jobs[job_id]["status"] = "error"
            modeling_jobs[job_id]["result"] = {"success": False, "error": error_msg}

        with modeling_lock:
            modeling_state.update({"active": False, "message": f"Error: {error_msg}"})

        return {"success": False, "error": error_msg}


# Topic Modeling API Endpoints


@app.route("/api/modeling/select-data", methods=["POST"])
def modeling_select_data():
    """Preview data selection for topic modeling."""
    data = request.json
    channels = data.get("channels", [])

    if not channels:
        return jsonify({"error": "No channels selected"}), 400

    try:
        comments, metadata = load_comments_from_channels(channels)

        # Detect languages
        detector = LanguageDetector()
        lang_dist = detector.get_language_distribution(comments[:1000])  # Sample

        # Get date range
        timestamps = [m["timestamp"] for m in metadata if m.get("timestamp")]
        date_range = {
            "start": min(timestamps) if timestamps else None,
            "end": max(timestamps) if timestamps else None,
        }

        return jsonify(
            {
                "success": True,
                "channels": channels,
                "total_comments": len(comments),
                "language_distribution": lang_dist,
                "date_range": date_range,
                "recommended_topics": min(20, max(2, len(comments) // 1000)),
            }
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/modeling/run", methods=["POST"])
def modeling_run():
    """Start a topic modeling job."""
    data = request.json
    channels = data.get("channels", [])
    algorithm = data.get("algorithm", "lda")
    params = data.get("params", {})

    if not channels:
        return jsonify({"error": "No channels selected"}), 400

    if algorithm not in ("lda", "nmf"):
        return jsonify({"error": f"Unknown algorithm: {algorithm}"}), 400

    # Create job
    job_id = str(uuid.uuid4())[:8]

    # Store in memory (backward compatibility)
    with modeling_jobs_lock:
        modeling_jobs[job_id] = {
            "id": job_id,
            "channels": channels,
            "algorithm": algorithm,
            "params": params,
            "status": "queued",
            "result": None,
            "created_at": datetime.now().isoformat(),
        }

    # Create job in database if available
    if db_manager:
        try:
            db_manager.create_job({
                'job_id': job_id,
                'channels': channels,
                'algorithm': algorithm,
                'status': 'queued',
                'num_topics': params.get('num_topics', 5),
                'n_gram_range': params.get('n_gram_range', [1, 2]),
                'max_iter': params.get('max_iter', 20 if algorithm == 'lda' else 200),
                'language': params.get('language', 'auto'),
                'alpha': params.get('alpha') if algorithm == 'lda' else None,
                'beta': params.get('beta') if algorithm == 'lda' else None
            })
            print(f"[DATABASE] Created job {job_id} in PostgreSQL")
        except Exception as e:
            print(f"[DATABASE] Error creating job in database: {e}")

    # Queue job
    modeling_queue.put((job_id, channels, algorithm, params))

    return jsonify({"success": True, "job_id": job_id, "status": "queued"})


@app.route("/api/modeling/status/<job_id>")
def modeling_status(job_id):
    """Get status of a modeling job."""
    with modeling_jobs_lock:
        if job_id not in modeling_jobs:
            return jsonify({"error": "Job not found"}), 404

        job = modeling_jobs[job_id]

    with modeling_lock:
        state = modeling_state.copy()

    # If this is the active job, include real-time progress
    if state.get("current_job_id") == job_id:
        return jsonify(
            {
                "job_id": job_id,
                "status": "running",
                "progress": state.get("progress", 0),
                "stage": state.get("stage", "idle"),
                "message": state.get("message", ""),
                "channels": state.get("channels", []),
            }
        )

    # Otherwise return stored job status
    return jsonify(
        {
            "job_id": job_id,
            "status": job["status"],
            "progress": 100 if job["status"] == "completed" else 0,
            "channels": job["channels"],
            "result": job.get("result") if job["status"] == "completed" else None,
        }
    )


@app.route("/api/modeling/results/<job_id>")
def modeling_results(job_id):
    """Get results of a completed modeling job."""
    with modeling_jobs_lock:
        if job_id not in modeling_jobs:
            return jsonify({"error": "Job not found"}), 404

        job = modeling_jobs[job_id]

        if job["status"] != "completed":
            return jsonify({"error": "Job not completed"}), 400

        return jsonify(job["result"])


@app.route("/api/modeling/jobs")
def modeling_list_jobs():
    """List all modeling jobs."""
    with modeling_jobs_lock:
        jobs_list = []
        for job_id, job in modeling_jobs.items():
            jobs_list.append(
                {
                    "id": job_id,
                    "channels": job["channels"],
                    "algorithm": job["algorithm"],
                    "status": job["status"],
                    "created_at": job["created_at"],
                }
            )

    # Sort by creation time (newest first)
    jobs_list.sort(key=lambda x: x["created_at"], reverse=True)

    return jsonify({"jobs": jobs_list})


@app.route("/api/modeling/jobs/<job_id>", methods=["DELETE"])
def modeling_delete_job(job_id):
    """Delete a modeling job."""
    with modeling_jobs_lock:
        if job_id not in modeling_jobs:
            return jsonify({"error": "Job not found"}), 404

        del modeling_jobs[job_id]

    # Also delete from database if available
    if db_manager:
        try:
            db_manager.delete_job(job_id)
            print(f"[DATABASE] Deleted job {job_id} from PostgreSQL")
        except Exception as e:
            print(f"[DATABASE] Error deleting job from database: {e}")

    return jsonify({"success": True})


# ============================================================================
# DATABASE-BACKED API ENDPOINTS (Priority for Option B)
# ============================================================================

@app.route("/api/runs", methods=["POST"])
def create_run():
    """
    Create a new modeling run (alias for /api/modeling/run).
    This endpoint uses the database manager to persist the job.
    """
    data = request.json
    channels = data.get("channels", [])
    algorithm = data.get("algorithm", "lda")
    params = data.get("params", {})

    if not channels:
        return jsonify({"error": "No channels selected"}), 400

    if algorithm not in ("lda", "nmf"):
        return jsonify({"error": f"Unknown algorithm: {algorithm}"}), 400

    # Create job
    job_id = str(uuid.uuid4())[:8]

    # Store in memory (backward compatibility)
    with modeling_jobs_lock:
        modeling_jobs[job_id] = {
            "id": job_id,
            "channels": channels,
            "algorithm": algorithm,
            "params": params,
            "status": "queued",
            "result": None,
            "created_at": datetime.now().isoformat(),
        }

    # Create job in database if available
    if db_manager:
        try:
            db_manager.create_job({
                'job_id': job_id,
                'channels': channels,
                'algorithm': algorithm,
                'status': 'queued',
                'num_topics': params.get('num_topics', 5),
                'n_gram_range': params.get('n_gram_range', [1, 2]),
                'max_iter': params.get('max_iter', 20 if algorithm == 'lda' else 200),
                'language': params.get('language', 'auto'),
                'alpha': params.get('alpha') if algorithm == 'lda' else None,
                'beta': params.get('beta') if algorithm == 'lda' else None
            })
            print(f"[DATABASE] Created job {job_id} in PostgreSQL")
        except Exception as e:
            print(f"[DATABASE] Error creating job in database: {e}")
            return jsonify({"error": f"Database error: {str(e)}"}), 500

    # Queue job
    modeling_queue.put((job_id, channels, algorithm, params))

    return jsonify({"success": True, "run_id": job_id, "job_id": job_id, "status": "queued"})


@app.route("/api/runs", methods=["GET"])
def list_runs():
    """
    List all modeling runs with pagination.
    Uses database if available, falls back to in-memory storage.
    """
    # Get query parameters
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 50, type=int)
    status = request.args.get('status', None, type=str)
    algorithm = request.args.get('algorithm', None, type=str)

    if db_manager:
        try:
            # Query from database
            jobs_list, total = db_manager.list_jobs(
                page=page,
                limit=limit,
                status=status,
                algorithm=algorithm
            )

            return jsonify({
                "runs": jobs_list,
                "total": total,
                "page": page,
                "limit": limit,
                "total_pages": (total + limit - 1) // limit
            })
        except Exception as e:
            print(f"[DATABASE] Error listing jobs from database: {e}")
            return jsonify({"error": f"Database error: {str(e)}"}), 500
    else:
        # Fallback to in-memory storage
        with modeling_jobs_lock:
            jobs_list = []
            for job_id, job in modeling_jobs.items():
                # Apply filters
                if status and job["status"] != status:
                    continue
                if algorithm and job["algorithm"] != algorithm:
                    continue

                jobs_list.append({
                    "id": job_id,
                    "job_id": job_id,
                    "channels": job["channels"],
                    "algorithm": job["algorithm"],
                    "status": job["status"],
                    "created_at": job["created_at"],
                })

        # Sort by creation time (newest first)
        jobs_list.sort(key=lambda x: x["created_at"], reverse=True)

        # Apply pagination
        start = (page - 1) * limit
        end = start + limit
        paginated = jobs_list[start:end]

        return jsonify({
            "runs": paginated,
            "total": len(jobs_list),
            "page": page,
            "limit": limit,
            "total_pages": (len(jobs_list) + limit - 1) // limit
        })


@app.route("/api/runs/<run_id>", methods=["GET"])
def get_run(run_id):
    """
    Get complete results for a specific run.
    Uses database if available, falls back to in-memory storage.
    """
    if db_manager:
        try:
            # Query from database
            results = db_manager.get_complete_results(run_id)

            if not results:
                return jsonify({"error": "Run not found"}), 404

            return jsonify(results)
        except Exception as e:
            print(f"[DATABASE] Error getting run from database: {e}")
            return jsonify({"error": f"Database error: {str(e)}"}), 500
    else:
        # Fallback to in-memory storage
        with modeling_jobs_lock:
            if run_id not in modeling_jobs:
                return jsonify({"error": "Run not found"}), 404

            job = modeling_jobs[run_id]

            if job["status"] != "completed":
                return jsonify({
                    "job_id": run_id,
                    "status": job["status"],
                    "message": "Run not completed yet"
                }), 200

            return jsonify(job["result"])


@app.route("/api/runs/<run_id>", methods=["DELETE"])
def delete_run(run_id):
    """
    Delete a modeling run (and all associated data with cascade).
    Uses database if available.
    """
    if db_manager:
        try:
            # Delete from database (cascade will remove all related data)
            success = db_manager.delete_job(run_id)

            if not success:
                return jsonify({"error": "Run not found"}), 404

            # Also delete from memory if present
            with modeling_jobs_lock:
                if run_id in modeling_jobs:
                    del modeling_jobs[run_id]

            return jsonify({"success": True, "message": f"Run {run_id} deleted successfully"})
        except Exception as e:
            print(f"[DATABASE] Error deleting run from database: {e}")
            return jsonify({"error": f"Database error: {str(e)}"}), 500
    else:
        # Fallback to in-memory storage
        with modeling_jobs_lock:
            if run_id not in modeling_jobs:
                return jsonify({"error": "Run not found"}), 404

            del modeling_jobs[run_id]

        return jsonify({"success": True})


@app.route("/api/health")
def health_check():
    """
    Health check endpoint to verify API and database connectivity.
    """
    health_status = {
        "status": "healthy",
        "database": "connected" if db_manager else "not configured",
        "timestamp": datetime.now().isoformat()
    }

    if db_manager:
        try:
            # Test database connection by querying job count
            with db_manager.get_session() as session:
                from database.models import ModelingJob
                count = session.query(ModelingJob).count()
            health_status["database_jobs_count"] = count
        except Exception as e:
            health_status["status"] = "degraded"
            health_status["database"] = f"error: {str(e)}"

    status_code = 200 if health_status["status"] == "healthy" else 503
    return jsonify(health_status), status_code


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="YouTube Comments Scraper")
    parser.add_argument(
        "--port",
        type=int,
        default=4242,
        help="Port to run the server on (default: 4242)",
    )
    parser.add_argument(
        "--host",
        type=str,
        default="127.0.0.1",
        help="Host to run the server on (default: 127.0.0.1)",
    )
    args = parser.parse_args()

    app.run(debug=True, host=args.host, port=args.port)
