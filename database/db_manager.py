"""
Database Manager for Topic Modeling YouTube

This module provides a thread-safe interface for all database operations,
managing connections, sessions, and CRUD operations for modeling results.
"""

from sqlalchemy import create_engine, or_, func
from sqlalchemy.orm import sessionmaker, scoped_session
from sqlalchemy.pool import QueuePool
from contextlib import contextmanager
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
import threading
import logging

from database.models import (
    Base, ModelingJob, Topic, TopicWord, RepresentativeComment,
    DocumentTopic, TopicSentiment, PreprocessingStats, TopicEvolution,
    InterTopicDistance, ModelMetadata
)

logger = logging.getLogger(__name__)


class DatabaseManager:
    """
    Thread-safe database manager for topic modeling results.

    Provides:
    - Connection pooling via SQLAlchemy
    - Thread-safe session management
    - CRUD operations for all models
    - Batch operations for performance
    - Transaction management
    """

    def __init__(self, database_url: str, pool_size: int = 10, max_overflow: int = 20):
        """
        Initialize database manager with connection pool.

        Args:
            database_url: PostgreSQL connection string
                         Format: postgresql://user:password@host:port/database
            pool_size: Number of permanent connections in pool
            max_overflow: Maximum overflow connections beyond pool_size
        """
        self.database_url = database_url
        self.engine = create_engine(
            database_url,
            poolclass=QueuePool,
            pool_size=pool_size,
            max_overflow=max_overflow,
            pool_pre_ping=True,  # Verify connections before using
            echo=False  # Set to True for SQL query logging
        )

        # Create scoped session factory for thread safety
        session_factory = sessionmaker(bind=self.engine)
        self.Session = scoped_session(session_factory)

        # Lock for thread-safe operations
        self.lock = threading.Lock()

        logger.info(f"Database manager initialized with pool_size={pool_size}, max_overflow={max_overflow}")

    @contextmanager
    def get_session(self):
        """
        Context manager for database sessions with automatic commit/rollback.

        Usage:
            with db_manager.get_session() as session:
                job = session.query(ModelingJob).first()
        """
        session = self.Session()
        try:
            yield session
            session.commit()
        except Exception as e:
            session.rollback()
            logger.error(f"Session error: {str(e)}")
            raise
        finally:
            session.close()

    def create_tables(self):
        """Create all database tables."""
        Base.metadata.create_all(self.engine)
        logger.info("Database tables created successfully")

    def drop_tables(self):
        """Drop all database tables (use with caution!)."""
        Base.metadata.drop_all(self.engine)
        logger.info("Database tables dropped")

    # ========================================================================
    # MODELING JOB OPERATIONS
    # ========================================================================

    def create_job(self, job_data: Dict[str, Any]) -> str:
        """
        Create a new modeling job.

        Args:
            job_data: Dictionary with job configuration
                     Required: job_id, channels, algorithm, num_topics,
                              n_gram_range, max_iter, language
                     Optional: alpha, beta, status

        Returns:
            job_id of created job
        """
        with self.get_session() as session:
            job = ModelingJob(**job_data)
            session.add(job)
            session.flush()  # Get job_id before commit
            logger.info(f"Created job {job.job_id}")
            return job.job_id

    def get_job(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Get job by job_id."""
        with self.get_session() as session:
            job = session.query(ModelingJob).filter(ModelingJob.job_id == job_id).first()
            return job.to_dict() if job else None

    def update_job_status(self, job_id: str, status: str, error_message: Optional[str] = None):
        """Update job status and timestamps."""
        with self.get_session() as session:
            job = session.query(ModelingJob).filter(ModelingJob.job_id == job_id).first()
            if job:
                job.status = status
                if status == 'running' and not job.started_at:
                    job.started_at = datetime.now()
                elif status in ('completed', 'error'):
                    job.completed_at = datetime.now()
                if error_message:
                    job.error_message = error_message
                logger.info(f"Updated job {job_id} status to {status}")

    def update_job_results(self, job_id: str, total_comments: int, valid_comments: int, diversity: float):
        """Update job with result summary."""
        with self.get_session() as session:
            job = session.query(ModelingJob).filter(ModelingJob.job_id == job_id).first()
            if job:
                job.total_comments = total_comments
                job.valid_comments = valid_comments
                job.diversity = diversity
                logger.info(f"Updated job {job_id} results")

    def delete_job(self, job_id: str) -> bool:
        """
        Delete a job and all related data (cascade).

        Returns:
            True if job was deleted, False if not found
        """
        with self.get_session() as session:
            job = session.query(ModelingJob).filter(ModelingJob.job_id == job_id).first()
            if job:
                session.delete(job)
                logger.info(f"Deleted job {job_id}")
                return True
            return False

    def list_jobs(self, page: int = 1, limit: int = 50, status: Optional[str] = None,
                  algorithm: Optional[str] = None, channels: Optional[List[str]] = None) -> Tuple[List[Dict], int]:
        """
        List jobs with pagination and filtering.

        Args:
            page: Page number (1-indexed)
            limit: Results per page
            status: Filter by status
            algorithm: Filter by algorithm
            channels: Filter by channels (any overlap)

        Returns:
            Tuple of (jobs_list, total_count)
        """
        with self.get_session() as session:
            query = session.query(ModelingJob)

            # Apply filters
            if status:
                query = query.filter(ModelingJob.status == status)
            if algorithm:
                query = query.filter(ModelingJob.algorithm == algorithm)
            if channels:
                # Filter jobs that contain any of the specified channels
                query = query.filter(ModelingJob.channels.overlap(channels))

            # Get total count
            total = query.count()

            # Apply pagination and ordering
            jobs = query.order_by(ModelingJob.created_at.desc()) \
                       .offset((page - 1) * limit) \
                       .limit(limit) \
                       .all()

            return ([job.to_dict() for job in jobs], total)

    # ========================================================================
    # TOPIC OPERATIONS
    # ========================================================================

    def save_topics(self, job_id: str, topics_data: List[Dict[str, Any]]):
        """
        Save topics with words and representative comments.

        Args:
            job_id: Job identifier
            topics_data: List of dicts with topic info including:
                        - topic_number, label, document_count
                        - words: [[word, weight], ...]
                        - representative_comments: [str, ...]
                        - metadata: [{channel, video_id, ...}, ...]
        """
        with self.get_session() as session:
            for topic_data in topics_data:
                # Create topic
                topic = Topic(
                    job_id=job_id,
                    topic_number=topic_data['topic_number'],
                    label=topic_data.get('label', f"Topic {topic_data['topic_number']}"),
                    document_count=topic_data.get('document_count', 0)
                )
                session.add(topic)
                session.flush()  # Get topic.id

                # Add words
                if 'words' in topic_data:
                    for rank, (word, weight) in enumerate(topic_data['words'][:20], start=1):
                        topic_word = TopicWord(
                            topic_id=topic.id,
                            word=word,
                            weight=float(weight),
                            rank=rank
                        )
                        session.add(topic_word)

                # Add representative comments
                if 'representative_comments' in topic_data:
                    comments = topic_data['representative_comments'][:5]
                    metadata_list = topic_data.get('metadata', [{}] * len(comments))

                    for rank, (comment, metadata) in enumerate(zip(comments, metadata_list), start=1):
                        rep_comment = RepresentativeComment(
                            topic_id=topic.id,
                            comment_text=comment,
                            rank=rank,
                            channel=metadata.get('channel'),
                            video_id=metadata.get('video_id'),
                            video_title=metadata.get('video_title'),
                            author=metadata.get('author'),
                            likes=metadata.get('likes'),
                            timestamp=metadata.get('timestamp')
                        )
                        session.add(rep_comment)

            logger.info(f"Saved {len(topics_data)} topics for job {job_id}")

    def get_topics(self, job_id: str) -> List[Dict[str, Any]]:
        """Get all topics for a job with words and comments."""
        with self.get_session() as session:
            topics = session.query(Topic).filter(Topic.job_id == job_id).all()
            return [topic.to_dict() for topic in topics]

    def update_topic_coherence(self, job_id: str, topic_number: int, c_v: float, c_umass: float):
        """Update coherence scores for a topic."""
        with self.get_session() as session:
            topic = session.query(Topic).filter(
                Topic.job_id == job_id,
                Topic.topic_number == topic_number
            ).first()
            if topic:
                topic.coherence_score = c_v
                topic.umass_score = c_umass

    # ========================================================================
    # DOCUMENT-TOPIC OPERATIONS
    # ========================================================================

    def save_document_topics_batch(self, job_id: str, doc_topics: List[Dict[str, Any]], batch_size: int = 1000):
        """
        Save document-topic probabilities in batches (only prob > 0.01).

        Args:
            job_id: Job identifier
            doc_topics: List of dicts with: document_index, topic_number, probability, channel, video_id
            batch_size: Number of rows to insert per batch
        """
        with self.get_session() as session:
            # Filter to only significant probabilities
            significant = [dt for dt in doc_topics if dt['probability'] > 0.01]

            for i in range(0, len(significant), batch_size):
                batch = significant[i:i + batch_size]
                objects = [
                    DocumentTopic(
                        job_id=job_id,
                        document_index=dt['document_index'],
                        topic_number=dt['topic_number'],
                        probability=dt['probability'],
                        channel=dt.get('channel'),
                        video_id=dt.get('video_id')
                    )
                    for dt in batch
                ]
                session.bulk_save_objects(objects)
                session.flush()

            logger.info(f"Saved {len(significant)} document-topic probabilities for job {job_id}")

    def get_document_topics(self, job_id: str, sample_size: Optional[int] = None) -> List[Dict[str, Any]]:
        """
        Get document-topic probabilities.

        Args:
            job_id: Job identifier
            sample_size: If specified, return random sample of this size

        Returns:
            List of document-topic probability dicts
        """
        with self.get_session() as session:
            query = session.query(DocumentTopic).filter(DocumentTopic.job_id == job_id)

            if sample_size:
                # Random sampling for large datasets
                query = query.order_by(func.random()).limit(sample_size)

            doc_topics = query.all()
            return [{
                'document_index': dt.document_index,
                'topic_number': dt.topic_number,
                'probability': dt.probability,
                'channel': dt.channel,
                'video_id': dt.video_id
            } for dt in doc_topics]

    # ========================================================================
    # SENTIMENT OPERATIONS
    # ========================================================================

    def save_topic_sentiments(self, job_id: str, sentiments: List[Dict[str, Any]]):
        """
        Save sentiment analysis results for topics.

        Args:
            sentiments: List of dicts with topic_number and sentiment stats
        """
        with self.get_session() as session:
            for sentiment_data in sentiments:
                # Get topic
                topic = session.query(Topic).filter(
                    Topic.job_id == job_id,
                    Topic.topic_number == sentiment_data['topic_number']
                ).first()

                if topic:
                    sentiment = TopicSentiment(
                        topic_id=topic.id,
                        avg_sentiment=sentiment_data['avg_sentiment'],
                        sentiment_std=sentiment_data['sentiment_std'],
                        positive_count=sentiment_data['positive_count'],
                        neutral_count=sentiment_data['neutral_count'],
                        negative_count=sentiment_data['negative_count']
                    )
                    session.add(sentiment)

            logger.info(f"Saved sentiments for {len(sentiments)} topics in job {job_id}")

    # ========================================================================
    # PREPROCESSING STATS OPERATIONS
    # ========================================================================

    def save_preprocessing_stats(self, job_id: str, stats: Dict[str, Any]):
        """Save preprocessing statistics."""
        with self.get_session() as session:
            prep_stats = PreprocessingStats(
                job_id=job_id,
                original_comments=stats['original_comments'],
                valid_comments=stats['valid_comments'],
                filtered_comments=stats['filtered_comments'],
                avg_length_original=stats['avg_length_original'],
                avg_length_processed=stats['avg_length_processed'],
                total_vocabulary=stats['total_vocabulary'],
                language_distribution=stats.get('language_distribution', {}),
                most_common_words=stats.get('most_common_words')
            )
            session.add(prep_stats)
            logger.info(f"Saved preprocessing stats for job {job_id}")

    def get_preprocessing_stats(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Get preprocessing statistics for a job."""
        with self.get_session() as session:
            stats = session.query(PreprocessingStats).filter(
                PreprocessingStats.job_id == job_id
            ).first()

            if stats:
                return {
                    'original_comments': stats.original_comments,
                    'valid_comments': stats.valid_comments,
                    'filtered_comments': stats.filtered_comments,
                    'avg_length_original': stats.avg_length_original,
                    'avg_length_processed': stats.avg_length_processed,
                    'total_vocabulary': stats.total_vocabulary,
                    'language_distribution': stats.language_distribution,
                    'most_common_words': stats.most_common_words
                }
            return None

    # ========================================================================
    # MODEL METADATA OPERATIONS
    # ========================================================================

    def save_model_metadata(self, job_id: str, metadata: Dict[str, Any]):
        """Save model metadata."""
        with self.get_session() as session:
            model_meta = ModelMetadata(
                job_id=job_id,
                vocabulary_size=metadata.get('vocabulary_size'),
                max_iter=metadata.get('max_iter'),
                perplexity=metadata.get('perplexity'),
                reconstruction_error=metadata.get('reconstruction_error'),
                training_time_seconds=metadata.get('training_time_seconds'),
                model_file_path=metadata.get('model_file_path'),
                vectorizer_file_path=metadata.get('vectorizer_file_path')
            )
            session.add(model_meta)
            logger.info(f"Saved model metadata for job {job_id}")

    # ========================================================================
    # TOPIC EVOLUTION OPERATIONS
    # ========================================================================

    def save_topic_evolution(self, job_id: str, evolution_data: List[Dict[str, Any]]):
        """Save topic evolution over time."""
        with self.get_session() as session:
            objects = [
                TopicEvolution(
                    job_id=job_id,
                    topic_number=item['topic_number'],
                    time_bucket=item['time_bucket'],
                    document_count=item['document_count'],
                    avg_probability=item['avg_probability']
                )
                for item in evolution_data
            ]
            session.bulk_save_objects(objects)
            logger.info(f"Saved topic evolution data for job {job_id}")

    def get_topic_evolution(self, job_id: str, granularity: str = 'week') -> List[Dict[str, Any]]:
        """Get topic evolution data."""
        with self.get_session() as session:
            evolution = session.query(TopicEvolution).filter(
                TopicEvolution.job_id == job_id
            ).order_by(TopicEvolution.time_bucket).all()

            return [{
                'topic_number': e.topic_number,
                'time_bucket': e.time_bucket.isoformat(),
                'document_count': e.document_count,
                'avg_probability': e.avg_probability
            } for e in evolution]

    # ========================================================================
    # INTER-TOPIC DISTANCE OPERATIONS
    # ========================================================================

    def save_inter_topic_distance(self, job_id: str, distances: List[Dict[str, Any]], method: str = 'umap'):
        """Save inter-topic distance coordinates."""
        with self.get_session() as session:
            objects = [
                InterTopicDistance(
                    job_id=job_id,
                    topic_number=item['topic_number'],
                    x_coordinate=item['x'],
                    y_coordinate=item['y'],
                    reduction_method=method
                )
                for item in distances
            ]
            session.bulk_save_objects(objects)
            logger.info(f"Saved inter-topic distances ({method}) for job {job_id}")

    def get_inter_topic_distance(self, job_id: str, method: str = 'umap') -> List[Dict[str, Any]]:
        """Get inter-topic distance coordinates."""
        with self.get_session() as session:
            distances = session.query(InterTopicDistance).filter(
                InterTopicDistance.job_id == job_id,
                InterTopicDistance.reduction_method == method
            ).all()

            return [{
                'topic_number': d.topic_number,
                'x': d.x_coordinate,
                'y': d.y_coordinate
            } for d in distances]

    # ========================================================================
    # COMPLETE RESULTS RETRIEVAL
    # ========================================================================

    def get_complete_results(self, job_id: str) -> Optional[Dict[str, Any]]:
        """
        Get complete modeling results including all related data.

        Returns a comprehensive dictionary with:
        - job metadata
        - topics with words and comments
        - preprocessing stats
        - model metadata
        - sentiments (if available)
        """
        with self.get_session() as session:
            job = session.query(ModelingJob).filter(ModelingJob.job_id == job_id).first()

            if not job:
                return None

            # Build complete result
            result = job.to_dict()
            result['topics'] = [topic.to_dict() for topic in job.topics]

            if job.preprocessing_stats:
                result['preprocessing_stats'] = {
                    'original_comments': job.preprocessing_stats.original_comments,
                    'valid_comments': job.preprocessing_stats.valid_comments,
                    'filtered_comments': job.preprocessing_stats.filtered_comments,
                    'avg_length_original': job.preprocessing_stats.avg_length_original,
                    'avg_length_processed': job.preprocessing_stats.avg_length_processed,
                    'total_vocabulary': job.preprocessing_stats.total_vocabulary,
                    'language_distribution': job.preprocessing_stats.language_distribution,
                    'most_common_words': job.preprocessing_stats.most_common_words
                }

            if job.model_metadata:
                result['model_info'] = {
                    'algorithm': job.algorithm,
                    'num_topics': job.num_topics,
                    'vocabulary_size': job.model_metadata.vocabulary_size,
                    'max_iter': job.model_metadata.max_iter,
                    'perplexity': job.model_metadata.perplexity,
                    'reconstruction_error': job.model_metadata.reconstruction_error,
                    'training_time_seconds': job.model_metadata.training_time_seconds,
                    'diversity': job.diversity
                }

            return result

    def close(self):
        """Close all database connections."""
        self.Session.remove()
        self.engine.dispose()
        logger.info("Database connections closed")
