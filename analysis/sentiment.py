"""
Sentiment Analysis Module

Analyzes sentiment of comments per topic using TextBlob (lightweight)
or transformers (more accurate but slower).

Usage:
    analyzer = SentimentAnalyzer(method='textblob')
    sentiments = analyzer.analyze_topic_sentiments(comments, document_topics)
"""

import logging
from typing import List, Dict, Any, Tuple
import numpy as np

logger = logging.getLogger(__name__)

# Try to import sentiment analysis libraries
try:
    from textblob import TextBlob
    TEXTBLOB_AVAILABLE = True
except ImportError:
    TEXTBLOB_AVAILABLE = False
    logger.warning("TextBlob not available. Install with: pip install textblob")

try:
    from transformers import pipeline
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False
    logger.warning("Transformers not available. Install with: pip install transformers torch")


class SentimentAnalyzer:
    """
    Analyzes sentiment of text using various methods.

    Methods:
        - textblob: Fast, rule-based sentiment analysis (-1 to 1)
        - transformers: Deep learning model (more accurate, slower)
    """

    def __init__(self, method: str = 'textblob'):
        """
        Initialize sentiment analyzer.

        Args:
            method: Sentiment analysis method ('textblob' or 'transformers')
        """
        self.method = method
        self.model = None

        if method == 'textblob':
            if not TEXTBLOB_AVAILABLE:
                raise ImportError("TextBlob not installed. Run: pip install textblob")
            logger.info("Using TextBlob for sentiment analysis")

        elif method == 'transformers':
            if not TRANSFORMERS_AVAILABLE:
                raise ImportError("Transformers not installed. Run: pip install transformers torch")

            logger.info("Loading sentiment analysis model (distilbert)...")
            try:
                self.model = pipeline(
                    "sentiment-analysis",
                    model="distilbert-base-uncased-finetuned-sst-2-english",
                    device=-1  # CPU
                )
                logger.info("Model loaded successfully")
            except Exception as e:
                logger.error(f"Failed to load transformers model: {e}")
                raise
        else:
            raise ValueError(f"Unknown method: {method}. Choose 'textblob' or 'transformers'")

    def analyze_text(self, text: str) -> float:
        """
        Analyze sentiment of a single text.

        Args:
            text: Text to analyze

        Returns:
            Sentiment score (-1 to 1, where -1 is negative, 0 is neutral, 1 is positive)
        """
        if not text or not text.strip():
            return 0.0

        try:
            if self.method == 'textblob':
                # TextBlob polarity is already -1 to 1
                blob = TextBlob(text)
                return blob.sentiment.polarity

            elif self.method == 'transformers':
                # Transformers returns label (POSITIVE/NEGATIVE) and score (0-1)
                result = self.model(text[:512])[0]  # Truncate to max length
                label = result['label']
                score = result['score']

                # Convert to -1 to 1 scale
                if label == 'POSITIVE':
                    return score
                else:  # NEGATIVE
                    return -score

        except Exception as e:
            logger.warning(f"Sentiment analysis failed for text: {e}")
            return 0.0

    def analyze_batch(self, texts: List[str], batch_size: int = 32) -> List[float]:
        """
        Analyze sentiment of multiple texts.

        Args:
            texts: List of texts to analyze
            batch_size: Batch size for transformers (ignored for textblob)

        Returns:
            List of sentiment scores (-1 to 1)
        """
        if self.method == 'textblob':
            # TextBlob is fast enough to process individually
            return [self.analyze_text(text) for text in texts]

        elif self.method == 'transformers':
            # Process in batches for efficiency
            sentiments = []

            for i in range(0, len(texts), batch_size):
                batch = texts[i:i + batch_size]
                batch_truncated = [text[:512] for text in batch]  # Truncate

                try:
                    results = self.model(batch_truncated)

                    for result in results:
                        label = result['label']
                        score = result['score']

                        if label == 'POSITIVE':
                            sentiments.append(score)
                        else:
                            sentiments.append(-score)

                except Exception as e:
                    logger.warning(f"Batch sentiment analysis failed: {e}")
                    sentiments.extend([0.0] * len(batch))

            return sentiments

    def analyze_topic_sentiments(
        self,
        comments: List[str],
        document_topics: np.ndarray,
        num_topics: int
    ) -> List[Dict[str, Any]]:
        """
        Analyze sentiment for each topic by averaging sentiment of assigned documents.

        Args:
            comments: List of comment texts
            document_topics: Document-topic probability matrix (n_docs, n_topics)
            num_topics: Number of topics

        Returns:
            List of dicts with topic sentiment statistics:
            [
                {
                    'topic_number': 0,
                    'avg_sentiment': 0.25,
                    'sentiment_std': 0.15,
                    'positive_count': 50,
                    'neutral_count': 30,
                    'negative_count': 20
                },
                ...
            ]
        """
        logger.info(f"Analyzing sentiment for {num_topics} topics across {len(comments)} comments...")

        # Analyze sentiment for all comments
        logger.info("Computing sentiment scores...")
        sentiments = self.analyze_batch(comments)

        # For each topic, collect sentiments of documents assigned to it
        topic_sentiments = []

        for topic_num in range(num_topics):
            # Get documents where this topic is dominant (probability > 0.1)
            topic_docs = []
            topic_sent = []

            for doc_idx in range(len(comments)):
                if document_topics[doc_idx][topic_num] > 0.1:
                    topic_docs.append(doc_idx)
                    topic_sent.append(sentiments[doc_idx])

            if not topic_sent:
                # No documents assigned to this topic
                topic_sentiments.append({
                    'topic_number': topic_num,
                    'avg_sentiment': 0.0,
                    'sentiment_std': 0.0,
                    'positive_count': 0,
                    'neutral_count': 0,
                    'negative_count': 0
                })
                continue

            # Calculate statistics
            topic_sent_array = np.array(topic_sent)
            avg_sentiment = float(np.mean(topic_sent_array))
            sentiment_std = float(np.std(topic_sent_array))

            # Classify into positive/neutral/negative
            positive_count = int(np.sum(topic_sent_array > 0.1))
            negative_count = int(np.sum(topic_sent_array < -0.1))
            neutral_count = len(topic_sent) - positive_count - negative_count

            topic_sentiments.append({
                'topic_number': topic_num,
                'avg_sentiment': avg_sentiment,
                'sentiment_std': sentiment_std,
                'positive_count': positive_count,
                'neutral_count': neutral_count,
                'negative_count': negative_count
            })

            logger.info(
                f"Topic {topic_num}: avg={avg_sentiment:.3f}, "
                f"pos={positive_count}, neu={neutral_count}, neg={negative_count}"
            )

        logger.info("Sentiment analysis completed")
        return topic_sentiments

    @staticmethod
    def classify_sentiment(score: float) -> str:
        """
        Classify sentiment score into category.

        Args:
            score: Sentiment score (-1 to 1)

        Returns:
            Category: 'positive', 'neutral', or 'negative'
        """
        if score > 0.1:
            return 'positive'
        elif score < -0.1:
            return 'negative'
        else:
            return 'neutral'


def analyze_sentiments_for_job(
    comments: List[str],
    document_topics: np.ndarray,
    num_topics: int,
    method: str = 'textblob'
) -> List[Dict[str, Any]]:
    """
    Convenience function to analyze sentiments for a modeling job.

    Args:
        comments: List of comment texts
        document_topics: Document-topic probability matrix
        num_topics: Number of topics
        method: Sentiment analysis method ('textblob' or 'transformers')

    Returns:
        List of topic sentiment statistics
    """
    analyzer = SentimentAnalyzer(method=method)
    return analyzer.analyze_topic_sentiments(comments, document_topics, num_topics)
