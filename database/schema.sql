-- ============================================================================
-- Topic Modeling YouTube - PostgreSQL Database Schema
-- ============================================================================
-- This schema stores all topic modeling results, enabling persistent storage
-- across server restarts, historical job tracking, and advanced analytics.
-- ============================================================================

-- Enable UUID extension for primary keys
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLE: modeling_jobs
-- Stores metadata about each modeling job including parameters and status
-- ============================================================================
CREATE TABLE IF NOT EXISTS modeling_jobs (
    -- Primary identifiers
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id VARCHAR(8) UNIQUE NOT NULL,  -- Short ID for user-facing reference

    -- Job configuration
    channels TEXT[] NOT NULL,  -- Array of channel names (e.g., ['@channel1', '@channel2'])
    algorithm VARCHAR(10) NOT NULL CHECK (algorithm IN ('lda', 'nmf')),

    -- Job status tracking
    status VARCHAR(20) NOT NULL CHECK (status IN ('queued', 'running', 'completed', 'error')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,

    -- Modeling parameters
    num_topics INTEGER NOT NULL CHECK (num_topics > 0),
    n_gram_range INTEGER[] NOT NULL CHECK (array_length(n_gram_range, 1) = 2),  -- [min, max]
    max_iter INTEGER NOT NULL CHECK (max_iter > 0),
    language VARCHAR(10),  -- 'auto', 'en', 'fr', etc.
    alpha FLOAT CHECK (alpha > 0),  -- LDA only: document-topic prior
    beta FLOAT CHECK (beta > 0),   -- LDA only: topic-word prior

    -- Results summary
    total_comments INTEGER CHECK (total_comments >= 0),
    valid_comments INTEGER CHECK (valid_comments >= 0),
    diversity FLOAT CHECK (diversity >= 0 AND diversity <= 1)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_modeling_jobs_job_id ON modeling_jobs(job_id);
CREATE INDEX IF NOT EXISTS idx_modeling_jobs_created_at ON modeling_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_modeling_jobs_status ON modeling_jobs(status);
CREATE INDEX IF NOT EXISTS idx_modeling_jobs_algorithm ON modeling_jobs(algorithm);
CREATE INDEX IF NOT EXISTS idx_modeling_jobs_status_created ON modeling_jobs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_modeling_jobs_channels ON modeling_jobs USING GIN(channels);  -- For array search

-- ============================================================================
-- TABLE: topics
-- Stores individual topics for each job
-- ============================================================================
CREATE TABLE IF NOT EXISTS topics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id VARCHAR(8) NOT NULL REFERENCES modeling_jobs(job_id) ON DELETE CASCADE,
    topic_number INTEGER NOT NULL CHECK (topic_number >= 0),
    label VARCHAR(100) NOT NULL,  -- e.g., "Topic 0", "Topic 1"
    document_count INTEGER NOT NULL CHECK (document_count >= 0),

    -- Coherence metrics (calculated post-modeling)
    coherence_score FLOAT,  -- C_v coherence score
    umass_score FLOAT,      -- C_umass coherence score

    -- Constraints
    UNIQUE(job_id, topic_number)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_topics_job_id ON topics(job_id);
CREATE INDEX IF NOT EXISTS idx_topics_coherence ON topics(coherence_score DESC NULLS LAST);

-- ============================================================================
-- TABLE: topic_words
-- Stores top words for each topic with their weights
-- ============================================================================
CREATE TABLE IF NOT EXISTS topic_words (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    word VARCHAR(100) NOT NULL,
    weight FLOAT NOT NULL CHECK (weight >= 0),
    rank INTEGER NOT NULL CHECK (rank > 0 AND rank <= 20),  -- Top 20 words per topic

    -- Constraints
    UNIQUE(topic_id, rank)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_topic_words_topic_id ON topic_words(topic_id);
CREATE INDEX IF NOT EXISTS idx_topic_words_rank ON topic_words(topic_id, rank);

-- ============================================================================
-- TABLE: representative_comments
-- Stores representative comments for each topic (up to 5 per topic)
-- ============================================================================
CREATE TABLE IF NOT EXISTS representative_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    comment_text TEXT NOT NULL,
    rank INTEGER NOT NULL CHECK (rank > 0 AND rank <= 5),  -- Top 5 representative comments

    -- Comment metadata (for display and context)
    channel VARCHAR(255),
    video_id VARCHAR(20),
    video_title TEXT,
    author VARCHAR(255),
    likes INTEGER CHECK (likes >= 0),
    timestamp BIGINT,  -- Unix timestamp

    -- Constraints
    UNIQUE(topic_id, rank)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rep_comments_topic_id ON representative_comments(topic_id);
CREATE INDEX IF NOT EXISTS idx_rep_comments_rank ON representative_comments(topic_id, rank);

-- ============================================================================
-- TABLE: document_topics
-- Stores document-topic probability matrix (sparse storage)
-- Only probabilities > 0.01 are stored to optimize storage
-- ============================================================================
CREATE TABLE IF NOT EXISTS document_topics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id VARCHAR(8) NOT NULL REFERENCES modeling_jobs(job_id) ON DELETE CASCADE,
    document_index INTEGER NOT NULL CHECK (document_index >= 0),
    topic_number INTEGER NOT NULL CHECK (topic_number >= 0),
    probability FLOAT NOT NULL CHECK (probability > 0.01 AND probability <= 1),  -- Sparse: only > 0.01

    -- Metadata for linking back to original comments
    channel VARCHAR(255),
    video_id VARCHAR(20)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_doc_topics_job_id ON document_topics(job_id);
CREATE INDEX IF NOT EXISTS idx_doc_topics_doc_idx ON document_topics(job_id, document_index);
CREATE INDEX IF NOT EXISTS idx_doc_topics_topic ON document_topics(job_id, topic_number);
-- Partial index for dominant topics (probability > 0.1)
CREATE INDEX IF NOT EXISTS idx_doc_topics_dominant ON document_topics(job_id, document_index) WHERE probability > 0.1;

-- ============================================================================
-- TABLE: topic_sentiment
-- Stores sentiment analysis results per topic
-- ============================================================================
CREATE TABLE IF NOT EXISTS topic_sentiment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE UNIQUE,

    -- Sentiment statistics
    avg_sentiment FLOAT NOT NULL CHECK (avg_sentiment >= -1 AND avg_sentiment <= 1),  -- -1 (negative) to 1 (positive)
    sentiment_std FLOAT NOT NULL CHECK (sentiment_std >= 0),  -- Standard deviation

    -- Sentiment distribution
    positive_count INTEGER NOT NULL CHECK (positive_count >= 0),
    neutral_count INTEGER NOT NULL CHECK (neutral_count >= 0),
    negative_count INTEGER NOT NULL CHECK (negative_count >= 0)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sentiment_topic_id ON topic_sentiment(topic_id);

-- ============================================================================
-- TABLE: preprocessing_stats
-- Stores preprocessing statistics for each job
-- ============================================================================
CREATE TABLE IF NOT EXISTS preprocessing_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id VARCHAR(8) NOT NULL REFERENCES modeling_jobs(job_id) ON DELETE CASCADE UNIQUE,

    -- Document statistics
    original_comments INTEGER NOT NULL CHECK (original_comments >= 0),
    valid_comments INTEGER NOT NULL CHECK (valid_comments >= 0),
    filtered_comments INTEGER NOT NULL CHECK (filtered_comments >= 0),

    -- Token statistics
    avg_length_original FLOAT NOT NULL CHECK (avg_length_original >= 0),
    avg_length_processed FLOAT NOT NULL CHECK (avg_length_processed >= 0),
    total_vocabulary INTEGER NOT NULL CHECK (total_vocabulary >= 0),

    -- Language distribution stored as JSONB for flexibility
    -- Example: {"en": 500, "fr": 300, "unknown": 50}
    language_distribution JSONB NOT NULL DEFAULT '{}',

    -- Most common words before stopword removal (stored as JSONB array)
    -- Example: [["the", 1000], ["video", 500], ["good", 300]]
    most_common_words JSONB
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_prep_stats_job_id ON preprocessing_stats(job_id);

-- ============================================================================
-- TABLE: topic_evolution
-- Stores topic distribution over time for timeline visualization
-- ============================================================================
CREATE TABLE IF NOT EXISTS topic_evolution (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id VARCHAR(8) NOT NULL REFERENCES modeling_jobs(job_id) ON DELETE CASCADE,
    topic_number INTEGER NOT NULL CHECK (topic_number >= 0),

    -- Time bucket (aggregated by day/week/month depending on granularity)
    time_bucket TIMESTAMP WITH TIME ZONE NOT NULL,

    -- Topic statistics for this time period
    document_count INTEGER NOT NULL CHECK (document_count >= 0),
    avg_probability FLOAT NOT NULL CHECK (avg_probability >= 0 AND avg_probability <= 1)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_topic_evolution_job_topic ON topic_evolution(job_id, topic_number);
CREATE INDEX IF NOT EXISTS idx_topic_evolution_time ON topic_evolution(job_id, time_bucket);

-- ============================================================================
-- TABLE: inter_topic_distance
-- Stores 2D coordinates for inter-topic distance visualization
-- ============================================================================
CREATE TABLE IF NOT EXISTS inter_topic_distance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id VARCHAR(8) NOT NULL REFERENCES modeling_jobs(job_id) ON DELETE CASCADE,
    topic_number INTEGER NOT NULL CHECK (topic_number >= 0),

    -- 2D coordinates
    x_coordinate FLOAT NOT NULL,
    y_coordinate FLOAT NOT NULL,

    -- Dimensionality reduction method used
    reduction_method VARCHAR(20) NOT NULL CHECK (reduction_method IN ('umap', 'tsne', 'pca')),

    -- Constraints: one coordinate set per topic per method
    UNIQUE(job_id, topic_number, reduction_method)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_distance_job_id ON inter_topic_distance(job_id);
CREATE INDEX IF NOT EXISTS idx_distance_method ON inter_topic_distance(job_id, reduction_method);

-- ============================================================================
-- TABLE: model_metadata
-- Stores additional model information and metrics
-- ============================================================================
CREATE TABLE IF NOT EXISTS model_metadata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id VARCHAR(8) NOT NULL REFERENCES modeling_jobs(job_id) ON DELETE CASCADE UNIQUE,

    -- Model information
    vocabulary_size INTEGER CHECK (vocabulary_size > 0),
    max_iter INTEGER,  -- Actual iterations used (may differ from requested)

    -- Model metrics
    perplexity FLOAT,  -- LDA only: lower is better
    reconstruction_error FLOAT,  -- NMF only: lower is better
    training_time_seconds FLOAT CHECK (training_time_seconds >= 0),

    -- Model file references (if saved to disk)
    model_file_path TEXT,
    vectorizer_file_path TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_metadata_job_id ON model_metadata(job_id);

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- View: job_results_summary
-- Complete summary of job results for listing and history pages
CREATE OR REPLACE VIEW job_results_summary AS
SELECT
    j.id,
    j.job_id,
    j.channels,
    j.algorithm,
    j.status,
    j.created_at,
    j.started_at,
    j.completed_at,
    j.num_topics,
    j.n_gram_range,
    j.max_iter,
    j.language,
    j.alpha,
    j.beta,
    j.total_comments,
    j.valid_comments,
    j.diversity,
    j.error_message,
    COUNT(DISTINCT t.id) as topics_count,
    m.perplexity,
    m.reconstruction_error,
    m.training_time_seconds,
    m.vocabulary_size
FROM modeling_jobs j
LEFT JOIN topics t ON j.job_id = t.job_id
LEFT JOIN model_metadata m ON j.job_id = m.job_id
GROUP BY j.id, j.job_id, j.channels, j.algorithm, j.status, j.created_at, j.started_at,
         j.completed_at, j.num_topics, j.n_gram_range, j.max_iter, j.language, j.alpha,
         j.beta, j.total_comments, j.valid_comments, j.diversity, j.error_message,
         m.perplexity, m.reconstruction_error, m.training_time_seconds, m.vocabulary_size;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get the dominant topic for a document
CREATE OR REPLACE FUNCTION get_dominant_topic(p_job_id VARCHAR(8), p_document_index INTEGER)
RETURNS INTEGER AS $$
    SELECT topic_number
    FROM document_topics
    WHERE job_id = p_job_id AND document_index = p_document_index
    ORDER BY probability DESC
    LIMIT 1;
$$ LANGUAGE SQL STABLE;

-- Function to calculate topic diversity (if not already computed)
CREATE OR REPLACE FUNCTION calculate_topic_diversity(p_job_id VARCHAR(8))
RETURNS FLOAT AS $$
DECLARE
    diversity_score FLOAT;
BEGIN
    -- Calculate diversity as normalized entropy of topic-word distributions
    -- Higher diversity = topics are more distinct from each other
    SELECT AVG(topic_entropy) INTO diversity_score
    FROM (
        SELECT
            topic_id,
            -SUM(weight * LOG(weight + 1e-10)) as topic_entropy
        FROM topic_words
        WHERE topic_id IN (SELECT id FROM topics WHERE job_id = p_job_id)
        GROUP BY topic_id
    ) sub;

    -- Normalize to 0-1 range (assuming max entropy ~5 for typical topics)
    RETURN LEAST(diversity_score / 5.0, 1.0);
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- SAMPLE DATA VALIDATION CONSTRAINTS
-- ============================================================================

-- Check that valid_comments <= total_comments
ALTER TABLE modeling_jobs
    ADD CONSTRAINT check_valid_comments CHECK (valid_comments <= total_comments);

-- Check that preprocessing filtered_comments makes sense
ALTER TABLE preprocessing_stats
    ADD CONSTRAINT check_filtered_comments CHECK (filtered_comments = original_comments - valid_comments);

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE modeling_jobs IS 'Main table storing metadata for each topic modeling job';
COMMENT ON TABLE topics IS 'Individual topics discovered in each modeling job';
COMMENT ON TABLE topic_words IS 'Top words per topic with their weights/importance scores';
COMMENT ON TABLE representative_comments IS 'Sample comments that best represent each topic';
COMMENT ON TABLE document_topics IS 'Sparse document-topic probability matrix (only prob > 0.01 stored)';
COMMENT ON TABLE topic_sentiment IS 'Sentiment analysis results aggregated per topic';
COMMENT ON TABLE preprocessing_stats IS 'Statistics about text preprocessing and data cleaning';
COMMENT ON TABLE topic_evolution IS 'Topic prevalence over time for timeline visualization';
COMMENT ON TABLE inter_topic_distance IS '2D coordinates for visualizing topic relationships';
COMMENT ON TABLE model_metadata IS 'Additional model information and performance metrics';

COMMENT ON COLUMN modeling_jobs.job_id IS 'Short 8-character ID for user-facing references';
COMMENT ON COLUMN modeling_jobs.channels IS 'Array of YouTube channel identifiers (e.g., @handle)';
COMMENT ON COLUMN modeling_jobs.n_gram_range IS 'Array [min, max] defining n-gram range (e.g., [1,2] for unigrams+bigrams)';
COMMENT ON COLUMN modeling_jobs.diversity IS 'Topic diversity score 0-1 (higher = more distinct topics)';
COMMENT ON COLUMN document_topics.probability IS 'Only probabilities > 0.01 are stored (sparse matrix optimization)';
COMMENT ON COLUMN preprocessing_stats.language_distribution IS 'JSONB object mapping language codes to document counts';
COMMENT ON COLUMN topic_evolution.time_bucket IS 'Aggregated time period (day/week/month depending on granularity)';

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
