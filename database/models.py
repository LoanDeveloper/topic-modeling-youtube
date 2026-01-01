"""
SQLAlchemy ORM Models for Topic Modeling YouTube Database

This module defines the database models that map to the PostgreSQL schema,
providing a Pythonic interface for database operations.
"""

from sqlalchemy import (
    Column, String, Integer, Float, Text, ARRAY, Boolean, DateTime,
    ForeignKey, CheckConstraint, UniqueConstraint, Index
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship, declarative_base
from sqlalchemy.sql import func
from datetime import datetime
from typing import List, Dict, Any, Optional
import uuid

Base = declarative_base()


class ModelingJob(Base):
    """
    Represents a topic modeling job with all its configuration and status.
    """
    __tablename__ = 'modeling_jobs'

    # Primary identifiers
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id = Column(String(8), unique=True, nullable=False, index=True)

    # Job configuration
    channels = Column(ARRAY(Text), nullable=False)
    algorithm = Column(String(10), nullable=False)

    # Job status tracking
    status = Column(String(20), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), default=func.now(), index=True)
    started_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    error_message = Column(Text)

    # Modeling parameters
    num_topics = Column(Integer, nullable=False)
    n_gram_range = Column(ARRAY(Integer), nullable=False)
    max_iter = Column(Integer, nullable=False)
    language = Column(String(10))
    alpha = Column(Float)  # LDA only
    beta = Column(Float)   # LDA only

    # Results summary
    total_comments = Column(Integer)
    valid_comments = Column(Integer)
    diversity = Column(Float)

    # Relationships
    topics = relationship('Topic', back_populates='job', cascade='all, delete-orphan')
    preprocessing_stats = relationship('PreprocessingStats', back_populates='job', uselist=False, cascade='all, delete-orphan')
    model_metadata = relationship('ModelMetadata', back_populates='job', uselist=False, cascade='all, delete-orphan')
    document_topics = relationship('DocumentTopic', back_populates='job', cascade='all, delete-orphan')
    topic_evolution = relationship('TopicEvolution', back_populates='job', cascade='all, delete-orphan')
    inter_topic_distance = relationship('InterTopicDistance', back_populates='job', cascade='all, delete-orphan')

    # Constraints
    __table_args__ = (
        CheckConstraint('algorithm IN (\'lda\', \'nmf\')', name='check_algorithm'),
        CheckConstraint('status IN (\'queued\', \'running\', \'completed\', \'error\')', name='check_status'),
        CheckConstraint('num_topics > 0', name='check_num_topics'),
        CheckConstraint('max_iter > 0', name='check_max_iter'),
        CheckConstraint('alpha IS NULL OR alpha > 0', name='check_alpha'),
        CheckConstraint('beta IS NULL OR beta > 0', name='check_beta'),
        CheckConstraint('total_comments IS NULL OR total_comments >= 0', name='check_total_comments'),
        CheckConstraint('valid_comments IS NULL OR valid_comments >= 0', name='check_valid_comments'),
        CheckConstraint('valid_comments IS NULL OR total_comments IS NULL OR valid_comments <= total_comments', name='check_valid_le_total'),
        CheckConstraint('diversity IS NULL OR (diversity >= 0 AND diversity <= 1)', name='check_diversity'),
        Index('idx_jobs_status_created', 'status', 'created_at'),
    )

    def to_dict(self) -> Dict[str, Any]:
        """Convert model to dictionary for JSON serialization."""
        return {
            'job_id': self.job_id,
            'channels': self.channels,
            'algorithm': self.algorithm,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'error_message': self.error_message,
            'num_topics': self.num_topics,
            'n_gram_range': self.n_gram_range,
            'max_iter': self.max_iter,
            'language': self.language,
            'alpha': self.alpha,
            'beta': self.beta,
            'total_comments': self.total_comments,
            'valid_comments': self.valid_comments,
            'diversity': self.diversity,
        }


class Topic(Base):
    """
    Represents an individual topic discovered in a modeling job.
    """
    __tablename__ = 'topics'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id = Column(String(8), ForeignKey('modeling_jobs.job_id', ondelete='CASCADE'), nullable=False, index=True)
    topic_number = Column(Integer, nullable=False)
    label = Column(String(100), nullable=False)
    document_count = Column(Integer, nullable=False)

    # Coherence metrics
    coherence_score = Column(Float)  # C_v
    umass_score = Column(Float)      # C_umass

    # Relationships
    job = relationship('ModelingJob', back_populates='topics')
    words = relationship('TopicWord', back_populates='topic', cascade='all, delete-orphan')
    representative_comments = relationship('RepresentativeComment', back_populates='topic', cascade='all, delete-orphan')
    sentiment = relationship('TopicSentiment', back_populates='topic', uselist=False, cascade='all, delete-orphan')

    # Constraints
    __table_args__ = (
        UniqueConstraint('job_id', 'topic_number', name='uq_job_topic'),
        CheckConstraint('topic_number >= 0', name='check_topic_number'),
        CheckConstraint('document_count >= 0', name='check_document_count'),
    )

    def to_dict(self, include_words: bool = True, include_comments: bool = True) -> Dict[str, Any]:
        """Convert topic to dictionary for JSON serialization."""
        result = {
            'id': self.topic_number,
            'label': self.label,
            'document_count': self.document_count,
            'coherence_score': self.coherence_score,
            'umass_score': self.umass_score,
        }

        if include_words and self.words:
            # Sort by rank and convert to [[word, weight], ...] format
            result['words'] = [[w.word, w.weight] for w in sorted(self.words, key=lambda x: x.rank)]

        if include_comments and self.representative_comments:
            # Sort by rank and convert to list of strings
            result['representative_comments'] = [
                c.comment_text for c in sorted(self.representative_comments, key=lambda x: x.rank)
            ]

        return result


class TopicWord(Base):
    """
    Stores top words for a topic with their importance weights.
    """
    __tablename__ = 'topic_words'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    topic_id = Column(UUID(as_uuid=True), ForeignKey('topics.id', ondelete='CASCADE'), nullable=False, index=True)
    word = Column(String(100), nullable=False)
    weight = Column(Float, nullable=False)
    rank = Column(Integer, nullable=False)

    # Relationships
    topic = relationship('Topic', back_populates='words')

    # Constraints
    __table_args__ = (
        UniqueConstraint('topic_id', 'rank', name='uq_topic_word_rank'),
        CheckConstraint('weight >= 0', name='check_weight'),
        CheckConstraint('rank > 0 AND rank <= 20', name='check_rank'),
    )


class RepresentativeComment(Base):
    """
    Stores representative comments for a topic.
    """
    __tablename__ = 'representative_comments'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    topic_id = Column(UUID(as_uuid=True), ForeignKey('topics.id', ondelete='CASCADE'), nullable=False, index=True)
    comment_text = Column(Text, nullable=False)
    rank = Column(Integer, nullable=False)

    # Comment metadata
    channel = Column(String(255))
    video_id = Column(String(20))
    video_title = Column(Text)
    author = Column(String(255))
    likes = Column(Integer)
    timestamp = Column(Integer)  # Unix timestamp

    # Relationships
    topic = relationship('Topic', back_populates='representative_comments')

    # Constraints
    __table_args__ = (
        UniqueConstraint('topic_id', 'rank', name='uq_topic_comment_rank'),
        CheckConstraint('rank > 0 AND rank <= 5', name='check_comment_rank'),
        CheckConstraint('likes IS NULL OR likes >= 0', name='check_likes'),
    )


class DocumentTopic(Base):
    """
    Sparse storage of document-topic probabilities (only prob > 0.01).
    """
    __tablename__ = 'document_topics'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id = Column(String(8), ForeignKey('modeling_jobs.job_id', ondelete='CASCADE'), nullable=False, index=True)
    document_index = Column(Integer, nullable=False)
    topic_number = Column(Integer, nullable=False)
    probability = Column(Float, nullable=False)

    # Metadata
    channel = Column(String(255))
    video_id = Column(String(20))

    # Relationships
    job = relationship('ModelingJob', back_populates='document_topics')

    # Constraints
    __table_args__ = (
        CheckConstraint('document_index >= 0', name='check_doc_index'),
        CheckConstraint('topic_number >= 0', name='check_topic_num'),
        CheckConstraint('probability > 0.01 AND probability <= 1', name='check_probability'),
        Index('idx_doc_topics_doc', 'job_id', 'document_index'),
        Index('idx_doc_topics_topic', 'job_id', 'topic_number'),
    )


class TopicSentiment(Base):
    """
    Sentiment analysis results for a topic.
    """
    __tablename__ = 'topic_sentiment'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    topic_id = Column(UUID(as_uuid=True), ForeignKey('topics.id', ondelete='CASCADE'), nullable=False, unique=True, index=True)

    # Sentiment statistics
    avg_sentiment = Column(Float, nullable=False)
    sentiment_std = Column(Float, nullable=False)

    # Sentiment distribution
    positive_count = Column(Integer, nullable=False)
    neutral_count = Column(Integer, nullable=False)
    negative_count = Column(Integer, nullable=False)

    # Relationships
    topic = relationship('Topic', back_populates='sentiment')

    # Constraints
    __table_args__ = (
        CheckConstraint('avg_sentiment >= -1 AND avg_sentiment <= 1', name='check_avg_sentiment'),
        CheckConstraint('sentiment_std >= 0', name='check_sentiment_std'),
        CheckConstraint('positive_count >= 0', name='check_positive_count'),
        CheckConstraint('neutral_count >= 0', name='check_neutral_count'),
        CheckConstraint('negative_count >= 0', name='check_negative_count'),
    )


class PreprocessingStats(Base):
    """
    Preprocessing statistics for a modeling job.
    """
    __tablename__ = 'preprocessing_stats'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id = Column(String(8), ForeignKey('modeling_jobs.job_id', ondelete='CASCADE'), nullable=False, unique=True, index=True)

    # Document statistics
    original_comments = Column(Integer, nullable=False)
    valid_comments = Column(Integer, nullable=False)
    filtered_comments = Column(Integer, nullable=False)

    # Token statistics
    avg_length_original = Column(Float, nullable=False)
    avg_length_processed = Column(Float, nullable=False)
    total_vocabulary = Column(Integer, nullable=False)

    # Language distribution (JSONB)
    language_distribution = Column(JSONB, nullable=False, default={})

    # Most common words (JSONB array of [word, count])
    most_common_words = Column(JSONB)

    # Relationships
    job = relationship('ModelingJob', back_populates='preprocessing_stats')

    # Constraints
    __table_args__ = (
        CheckConstraint('original_comments >= 0', name='check_original_comments'),
        CheckConstraint('valid_comments >= 0', name='check_valid_comments'),
        CheckConstraint('filtered_comments >= 0', name='check_filtered_comments'),
        CheckConstraint('avg_length_original >= 0', name='check_avg_original'),
        CheckConstraint('avg_length_processed >= 0', name='check_avg_processed'),
        CheckConstraint('total_vocabulary >= 0', name='check_vocabulary'),
    )


class TopicEvolution(Base):
    """
    Topic distribution over time for timeline visualization.
    """
    __tablename__ = 'topic_evolution'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id = Column(String(8), ForeignKey('modeling_jobs.job_id', ondelete='CASCADE'), nullable=False, index=True)
    topic_number = Column(Integer, nullable=False)

    # Time bucket
    time_bucket = Column(DateTime(timezone=True), nullable=False)

    # Topic statistics
    document_count = Column(Integer, nullable=False)
    avg_probability = Column(Float, nullable=False)

    # Relationships
    job = relationship('ModelingJob', back_populates='topic_evolution')

    # Constraints
    __table_args__ = (
        CheckConstraint('topic_number >= 0', name='check_topic_number'),
        CheckConstraint('document_count >= 0', name='check_document_count'),
        CheckConstraint('avg_probability >= 0 AND avg_probability <= 1', name='check_avg_prob'),
        Index('idx_evolution_job_topic', 'job_id', 'topic_number'),
        Index('idx_evolution_time', 'job_id', 'time_bucket'),
    )


class InterTopicDistance(Base):
    """
    2D coordinates for inter-topic distance visualization.
    """
    __tablename__ = 'inter_topic_distance'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id = Column(String(8), ForeignKey('modeling_jobs.job_id', ondelete='CASCADE'), nullable=False, index=True)
    topic_number = Column(Integer, nullable=False)

    # 2D coordinates
    x_coordinate = Column(Float, nullable=False)
    y_coordinate = Column(Float, nullable=False)

    # Reduction method
    reduction_method = Column(String(20), nullable=False)

    # Relationships
    job = relationship('ModelingJob', back_populates='inter_topic_distance')

    # Constraints
    __table_args__ = (
        UniqueConstraint('job_id', 'topic_number', 'reduction_method', name='uq_job_topic_method'),
        CheckConstraint('topic_number >= 0', name='check_topic_number'),
        CheckConstraint('reduction_method IN (\'umap\', \'tsne\', \'pca\')', name='check_method'),
        Index('idx_distance_method', 'job_id', 'reduction_method'),
    )


class ModelMetadata(Base):
    """
    Additional model information and metrics.
    """
    __tablename__ = 'model_metadata'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id = Column(String(8), ForeignKey('modeling_jobs.job_id', ondelete='CASCADE'), nullable=False, unique=True, index=True)

    # Model information
    vocabulary_size = Column(Integer)
    max_iter = Column(Integer)  # Actual iterations (may differ from requested)

    # Model metrics
    perplexity = Column(Float)  # LDA only
    reconstruction_error = Column(Float)  # NMF only
    training_time_seconds = Column(Float)

    # Model file references
    model_file_path = Column(Text)
    vectorizer_file_path = Column(Text)

    # Relationships
    job = relationship('ModelingJob', back_populates='model_metadata')

    # Constraints
    __table_args__ = (
        CheckConstraint('vocabulary_size IS NULL OR vocabulary_size > 0', name='check_vocabulary_size'),
        CheckConstraint('training_time_seconds IS NULL OR training_time_seconds >= 0', name='check_training_time'),
    )


# Helper function to create all tables
def create_all_tables(engine):
    """Create all database tables."""
    Base.metadata.create_all(engine)


# Helper function to drop all tables (for testing/reset)
def drop_all_tables(engine):
    """Drop all database tables."""
    Base.metadata.drop_all(engine)
