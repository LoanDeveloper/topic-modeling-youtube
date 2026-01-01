"""
Coherence Calculation Module

Calculates coherence scores for topic models to evaluate topic quality.
Higher coherence scores indicate more interpretable and semantically coherent topics.

Metrics:
    - C_v: Based on normalized pointwise mutual information and cosine similarity
    - U_mass: Based on document co-occurrence counts
    - C_uci: Based on pointwise mutual information
    - C_npmi: Normalized pointwise mutual information

Usage:
    calculator = CoherenceCalculator(texts, dictionary, coherence_type='c_v')
    scores = calculator.calculate_topic_coherence(topics)
"""

import logging
from typing import List, Dict, Any, Optional
import numpy as np

logger = logging.getLogger(__name__)

# Try to import gensim for coherence calculation
try:
    from gensim.models import CoherenceModel
    from gensim.corpora import Dictionary
    GENSIM_AVAILABLE = True
except ImportError:
    GENSIM_AVAILABLE = False
    logger.warning("Gensim not available. Install with: pip install gensim")


class CoherenceCalculator:
    """
    Calculates coherence scores for topic models.

    Coherence measures how well the words in a topic relate to each other.
    Higher scores indicate better topic quality.
    """

    def __init__(
        self,
        texts: List[List[str]],
        dictionary: Optional['Dictionary'] = None,
        coherence_type: str = 'c_v'
    ):
        """
        Initialize coherence calculator.

        Args:
            texts: List of tokenized documents (list of list of words)
            dictionary: Gensim Dictionary object (created if not provided)
            coherence_type: Type of coherence metric:
                - 'c_v': Recommended, based on NPMI + cosine (range varies, higher is better)
                - 'u_mass': Based on co-occurrence (range: -14 to 14, higher is better)
                - 'c_uci': Based on PMI (range varies, higher is better)
                - 'c_npmi': Normalized PMI (range: -1 to 1, higher is better)
        """
        if not GENSIM_AVAILABLE:
            raise ImportError("Gensim not installed. Run: pip install gensim")

        self.texts = texts
        self.coherence_type = coherence_type

        # Create dictionary if not provided
        if dictionary is None:
            logger.info("Creating dictionary from texts...")
            self.dictionary = Dictionary(texts)
            logger.info(f"Dictionary created with {len(self.dictionary)} unique tokens")
        else:
            self.dictionary = dictionary

        logger.info(f"Coherence calculator initialized with {coherence_type} metric")

    def calculate_topic_coherence(
        self,
        topics: List[List[str]],
        topn: int = 10
    ) -> Dict[str, Any]:
        """
        Calculate coherence score for a list of topics.

        Args:
            topics: List of topics, where each topic is a list of top words
                    e.g., [['word1', 'word2', 'word3'], ['word4', 'word5'], ...]
            topn: Number of top words to use per topic (default: 10)

        Returns:
            Dict with coherence statistics:
            {
                'coherence_score': float,  # Overall coherence score
                'per_topic_coherence': List[float],  # Score per topic
                'coherence_type': str,  # Metric used
                'num_topics': int,
                'topn': int
            }
        """
        if not topics:
            logger.warning("No topics provided for coherence calculation")
            return {
                'coherence_score': 0.0,
                'per_topic_coherence': [],
                'coherence_type': self.coherence_type,
                'num_topics': 0,
                'topn': topn
            }

        # Truncate topics to topn words
        topics_truncated = [topic[:topn] for topic in topics]

        logger.info(
            f"Calculating {self.coherence_type} coherence for {len(topics)} topics "
            f"(top {topn} words per topic)..."
        )

        try:
            # Calculate overall coherence
            cm = CoherenceModel(
                topics=topics_truncated,
                texts=self.texts,
                dictionary=self.dictionary,
                coherence=self.coherence_type
            )

            coherence_score = cm.get_coherence()

            # Calculate per-topic coherence
            per_topic_coherence = cm.get_coherence_per_topic()

            logger.info(f"Overall coherence ({self.coherence_type}): {coherence_score:.4f}")
            logger.info(f"Per-topic coherence range: [{min(per_topic_coherence):.4f}, {max(per_topic_coherence):.4f}]")

            return {
                'coherence_score': float(coherence_score),
                'per_topic_coherence': [float(score) for score in per_topic_coherence],
                'coherence_type': self.coherence_type,
                'num_topics': len(topics),
                'topn': topn
            }

        except Exception as e:
            logger.error(f"Coherence calculation failed: {e}")
            return {
                'coherence_score': 0.0,
                'per_topic_coherence': [0.0] * len(topics),
                'coherence_type': self.coherence_type,
                'num_topics': len(topics),
                'topn': topn,
                'error': str(e)
            }

    def calculate_multiple_metrics(
        self,
        topics: List[List[str]],
        topn: int = 10,
        metrics: Optional[List[str]] = None
    ) -> Dict[str, Dict[str, Any]]:
        """
        Calculate multiple coherence metrics for comparison.

        Args:
            topics: List of topics (list of list of top words)
            topn: Number of top words per topic
            metrics: List of coherence metrics to calculate (default: ['c_v', 'u_mass', 'c_npmi'])

        Returns:
            Dict mapping metric name to coherence results
        """
        if metrics is None:
            metrics = ['c_v', 'u_mass', 'c_npmi']

        results = {}

        for metric in metrics:
            logger.info(f"Calculating {metric} coherence...")

            # Create temporary calculator for this metric
            calc = CoherenceCalculator(
                texts=self.texts,
                dictionary=self.dictionary,
                coherence_type=metric
            )

            results[metric] = calc.calculate_topic_coherence(topics, topn)

        return results

    @staticmethod
    def interpret_coherence(score: float, coherence_type: str) -> str:
        """
        Interpret coherence score into quality category.

        Args:
            score: Coherence score
            coherence_type: Type of coherence metric

        Returns:
            Quality category: 'excellent', 'good', 'fair', or 'poor'
        """
        if coherence_type == 'c_v':
            # C_v typically ranges from 0.3 to 0.7 for good models
            if score >= 0.6:
                return 'excellent'
            elif score >= 0.5:
                return 'good'
            elif score >= 0.4:
                return 'fair'
            else:
                return 'poor'

        elif coherence_type == 'u_mass':
            # U_mass ranges from -14 to 14, higher is better
            if score >= 0:
                return 'excellent'
            elif score >= -3:
                return 'good'
            elif score >= -6:
                return 'fair'
            else:
                return 'poor'

        elif coherence_type == 'c_npmi':
            # C_npmi ranges from -1 to 1, higher is better
            if score >= 0.1:
                return 'excellent'
            elif score >= 0.0:
                return 'good'
            elif score >= -0.1:
                return 'fair'
            else:
                return 'poor'

        else:
            # Generic interpretation
            if score >= 0.5:
                return 'good'
            elif score >= 0.3:
                return 'fair'
            else:
                return 'poor'


def calculate_coherence_for_job(
    topics: List[List[str]],
    tokenized_texts: List[List[str]],
    dictionary: Optional['Dictionary'] = None,
    coherence_type: str = 'c_v',
    topn: int = 10
) -> Dict[str, Any]:
    """
    Convenience function to calculate coherence for a modeling job.

    Args:
        topics: List of topics (each topic is a list of top words)
        tokenized_texts: List of tokenized documents
        dictionary: Gensim Dictionary (created if not provided)
        coherence_type: Coherence metric to use ('c_v', 'u_mass', 'c_npmi', 'c_uci')
        topn: Number of top words per topic

    Returns:
        Dict with coherence statistics
    """
    calculator = CoherenceCalculator(
        texts=tokenized_texts,
        dictionary=dictionary,
        coherence_type=coherence_type
    )

    return calculator.calculate_topic_coherence(topics, topn)


def calculate_all_coherence_metrics(
    topics: List[List[str]],
    tokenized_texts: List[List[str]],
    dictionary: Optional['Dictionary'] = None,
    topn: int = 10
) -> Dict[str, Dict[str, Any]]:
    """
    Calculate all common coherence metrics for comprehensive evaluation.

    Args:
        topics: List of topics (each topic is a list of top words)
        tokenized_texts: List of tokenized documents
        dictionary: Gensim Dictionary (created if not provided)
        topn: Number of top words per topic

    Returns:
        Dict mapping metric name to coherence results
    """
    calculator = CoherenceCalculator(
        texts=tokenized_texts,
        dictionary=dictionary,
        coherence_type='c_v'  # Initial type, will be changed
    )

    return calculator.calculate_multiple_metrics(
        topics=topics,
        topn=topn,
        metrics=['c_v', 'u_mass', 'c_npmi']
    )
