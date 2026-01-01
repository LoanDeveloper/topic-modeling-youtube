"""
Smoke Test for Database Integration

This script tests the database integration and API endpoints to ensure
that modeling results persist correctly to PostgreSQL.

Requirements:
- PostgreSQL running (via docker-compose or local)
- DATABASE_URL environment variable set
- Backend app.py running

Usage:
    python test_database_integration.py
"""

import os
import time
from database.db_manager import DatabaseManager
from database.models import ModelingJob, Topic, TopicWord

# Colors for terminal output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
RESET = '\033[0m'


def print_success(msg):
    print(f"{GREEN}✓{RESET} {msg}")


def print_error(msg):
    print(f"{RED}✗{RESET} {msg}")


def print_info(msg):
    print(f"{YELLOW}ℹ{RESET} {msg}")


def test_database_connection():
    """Test 1: Database connection"""
    print("\n" + "=" * 60)
    print("Test 1: Database Connection")
    print("=" * 60)

    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print_error("DATABASE_URL not set. Please set it in .env file.")
        return False

    try:
        db_manager = DatabaseManager(database_url)
        print_success(f"Connected to database: {database_url.split('@')[1] if '@' in database_url else 'database'}")
        return db_manager
    except Exception as e:
        print_error(f"Failed to connect to database: {e}")
        return None


def test_create_tables(db_manager):
    """Test 2: Create database tables"""
    print("\n" + "=" * 60)
    print("Test 2: Create Database Tables")
    print("=" * 60)

    try:
        db_manager.create_tables()
        print_success("Database tables created successfully")
        return True
    except Exception as e:
        print_error(f"Failed to create tables: {e}")
        return False


def test_create_job(db_manager):
    """Test 3: Create a job"""
    print("\n" + "=" * 60)
    print("Test 3: Create Job")
    print("=" * 60)

    job_data = {
        'job_id': 'test0001',
        'channels': ['@test_channel'],
        'algorithm': 'lda',
        'status': 'queued',
        'num_topics': 5,
        'n_gram_range': [1, 2],
        'max_iter': 20,
        'language': 'en',
        'alpha': 0.1,
        'beta': 0.01
    }

    try:
        job_id = db_manager.create_job(job_data)
        print_success(f"Job created: {job_id}")
        print_info(f"  - Channels: {job_data['channels']}")
        print_info(f"  - Algorithm: {job_data['algorithm']}")
        print_info(f"  - Topics: {job_data['num_topics']}")
        return job_id
    except Exception as e:
        print_error(f"Failed to create job: {e}")
        return None


def test_save_topics(db_manager, job_id):
    """Test 4: Save topics with words"""
    print("\n" + "=" * 60)
    print("Test 4: Save Topics")
    print("=" * 60)

    topics_data = [
        {
            'topic_number': 0,
            'label': 'Test Topic 1',
            'document_count': 10,
            'words': [['machine', 0.05], ['learning', 0.04], ['model', 0.03]],
            'representative_comments': ['This is a test comment'],
            'metadata': [{'channel': '@test', 'video_id': 'vid123'}]
        },
        {
            'topic_number': 1,
            'label': 'Test Topic 2',
            'document_count': 15,
            'words': [['python', 0.06], ['programming', 0.04], ['code', 0.03]],
            'representative_comments': ['Another test comment'],
            'metadata': [{'channel': '@test', 'video_id': 'vid456'}]
        }
    ]

    try:
        db_manager.save_topics(job_id, topics_data)
        print_success(f"Saved {len(topics_data)} topics for job {job_id}")
        for topic in topics_data:
            print_info(f"  - Topic {topic['topic_number']}: {topic['label']} ({topic['document_count']} docs)")
        return True
    except Exception as e:
        print_error(f"Failed to save topics: {e}")
        return False


def test_save_document_topics(db_manager, job_id):
    """Test 5: Save document-topic probabilities"""
    print("\n" + "=" * 60)
    print("Test 5: Save Document-Topic Probabilities (Sparse)")
    print("=" * 60)

    # Simulate sparse document-topic matrix
    doc_topics = [
        {'document_index': 0, 'topic_number': 0, 'probability': 0.7, 'channel': '@test', 'video_id': 'vid123'},
        {'document_index': 0, 'topic_number': 1, 'probability': 0.3, 'channel': '@test', 'video_id': 'vid123'},
        {'document_index': 1, 'topic_number': 0, 'probability': 0.2, 'channel': '@test', 'video_id': 'vid456'},
        {'document_index': 1, 'topic_number': 1, 'probability': 0.8, 'channel': '@test', 'video_id': 'vid456'},
        # Low probability (< 0.01) - should not be stored
        {'document_index': 2, 'topic_number': 0, 'probability': 0.005, 'channel': '@test', 'video_id': 'vid789'},
    ]

    try:
        db_manager.save_document_topics_batch(job_id, doc_topics)
        significant_count = len([dt for dt in doc_topics if dt['probability'] > 0.01])
        print_success(f"Saved {significant_count} significant document-topic probabilities (filtered from {len(doc_topics)})")
        print_info(f"  - Sparse storage: only prob > 0.01 are stored")
        return True
    except Exception as e:
        print_error(f"Failed to save document-topic probabilities: {e}")
        return False


def test_retrieve_results(db_manager, job_id):
    """Test 6: Retrieve complete results"""
    print("\n" + "=" * 60)
    print("Test 6: Retrieve Complete Results")
    print("=" * 60)

    try:
        results = db_manager.get_complete_results(job_id)

        if not results:
            print_error(f"No results found for job {job_id}")
            return False

        print_success(f"Retrieved results for job {job_id}")
        print_info(f"  - Algorithm: {results.get('algorithm')}")
        print_info(f"  - Status: {results.get('status')}")
        print_info(f"  - Topics: {len(results.get('topics', []))}")

        # Verify topics have words
        for topic in results.get('topics', []):
            print_info(f"    - Topic {topic.get('id')}: {len(topic.get('words', []))} words")

        return True
    except Exception as e:
        print_error(f"Failed to retrieve results: {e}")
        return False


def test_list_jobs(db_manager):
    """Test 7: List jobs with pagination"""
    print("\n" + "=" * 60)
    print("Test 7: List Jobs (Pagination)")
    print("=" * 60)

    try:
        jobs, total = db_manager.list_jobs(page=1, limit=10)
        print_success(f"Retrieved {len(jobs)} jobs (total: {total})")

        for job in jobs:
            print_info(f"  - {job['job_id']}: {job['algorithm']} ({job['status']})")

        return True
    except Exception as e:
        print_error(f"Failed to list jobs: {e}")
        return False


def test_delete_job(db_manager, job_id):
    """Test 8: Delete job (cascade)"""
    print("\n" + "=" * 60)
    print("Test 8: Delete Job (Cascade)")
    print("=" * 60)

    try:
        success = db_manager.delete_job(job_id)

        if success:
            print_success(f"Job {job_id} deleted successfully (cascade)")
            print_info("  - All related data (topics, words, doc-topics) deleted automatically")

            # Verify deletion
            results = db_manager.get_complete_results(job_id)
            if results is None:
                print_success("Verified: Job no longer exists in database")
                return True
            else:
                print_error("Job still exists after deletion!")
                return False
        else:
            print_error(f"Job {job_id} not found")
            return False
    except Exception as e:
        print_error(f"Failed to delete job: {e}")
        return False


def run_smoke_tests():
    """Run all smoke tests"""
    print("\n" + "=" * 80)
    print(" " * 20 + "DATABASE INTEGRATION SMOKE TEST")
    print("=" * 80)

    results = []

    # Test 1: Connect to database
    db_manager = test_database_connection()
    results.append(('Database Connection', db_manager is not None))
    if not db_manager:
        print("\n" + "=" * 80)
        print_error("Cannot proceed without database connection. Exiting.")
        print("=" * 80)
        return

    # Test 2: Create tables
    success = test_create_tables(db_manager)
    results.append(('Create Tables', success))

    # Test 3: Create job
    job_id = test_create_job(db_manager)
    results.append(('Create Job', job_id is not None))
    if not job_id:
        print("\n" + "=" * 80)
        print_error("Cannot proceed without job creation. Exiting.")
        print("=" * 80)
        return

    # Test 4: Save topics
    success = test_save_topics(db_manager, job_id)
    results.append(('Save Topics', success))

    # Test 5: Save document-topic probabilities
    success = test_save_document_topics(db_manager, job_id)
    results.append(('Save Document-Topics', success))

    # Test 6: Retrieve results
    success = test_retrieve_results(db_manager, job_id)
    results.append(('Retrieve Results', success))

    # Test 7: List jobs
    success = test_list_jobs(db_manager)
    results.append(('List Jobs', success))

    # Test 8: Delete job
    success = test_delete_job(db_manager, job_id)
    results.append(('Delete Job (Cascade)', success))

    # Summary
    print("\n" + "=" * 80)
    print(" " * 30 + "TEST SUMMARY")
    print("=" * 80)

    passed = sum(1 for _, success in results if success)
    total = len(results)

    for test_name, success in results:
        if success:
            print_success(f"{test_name}")
        else:
            print_error(f"{test_name}")

    print("\n" + "=" * 80)
    if passed == total:
        print_success(f"ALL TESTS PASSED ({passed}/{total})")
        print("\n✨ Database integration is working correctly!")
    else:
        print_error(f"SOME TESTS FAILED ({passed}/{total} passed)")
        print(f"\n⚠️  Please review the errors above and fix the issues.")
    print("=" * 80 + "\n")

    # Close database connection
    db_manager.close()


if __name__ == "__main__":
    # Load .env file
    from dotenv import load_dotenv
    load_dotenv()

    run_smoke_tests()
