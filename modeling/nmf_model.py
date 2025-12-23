"""NMF (Non-negative Matrix Factorization) topic modeling implementation."""

from typing import List, Dict, Optional, Callable
import numpy as np
from sklearn.decomposition import NMF
from sklearn.feature_extraction.text import TfidfVectorizer

from .base_model import BaseTopicModel


class NMFModel(BaseTopicModel):
    """NMF topic modeling using scikit-learn."""

    def __init__(self, num_topics: int = 5, alpha: float = 0.0, l1_ratio: float = 0.5,
                 max_iter: int = 200, n_gram_range: tuple = (1, 2),
                 max_df: float = 0.95, min_df: int = 2, max_features: int = 1000):
        """
        Initialize NMF model.

        Args:
            num_topics: Number of topics to extract
            alpha: Regularization parameter (higher = more regularization)
            l1_ratio: L1 vs L2 regularization mix (0 = L2, 1 = L1)
            max_iter: Maximum number of iterations
            n_gram_range: N-gram range for vectorization
            max_df: Maximum document frequency for terms
            min_df: Minimum document frequency for terms
            max_features: Maximum number of features to extract
        """
        super().__init__(num_topics)
        self.alpha = alpha
        self.l1_ratio = l1_ratio
        self.max_iter = max_iter
        self.n_gram_range = n_gram_range
        self.max_df = max_df
        self.min_df = min_df
        self.max_features = max_features

    def fit(self, documents: List[str], progress_callback: Optional[Callable] = None):
        """
        Train NMF model on documents.

        Args:
            documents: List of preprocessed text documents
            progress_callback: Optional callback for progress updates (progress, message)

        Returns:
            self
        """
        if progress_callback:
            progress_callback(10, "Vectorizing documents with TF-IDF...")

        # Create TF-IDF matrix
        self.vectorizer = TfidfVectorizer(
            max_df=self.max_df,
            min_df=self.min_df,
            ngram_range=self.n_gram_range,
            max_features=self.max_features,
            token_pattern=r'\b\w+\b'
        )

        try:
            tfidf = self.vectorizer.fit_transform(documents)
            self.feature_names = self.vectorizer.get_feature_names_out()
        except ValueError as e:
            raise ValueError(f"Vectorization failed: {e}. Check if documents contain valid tokens.")

        if progress_callback:
            progress_callback(40, f"Training NMF model with {self.num_topics} topics...")

        # Train NMF model
        self.model = NMF(
            n_components=self.num_topics,
            alpha_W=self.alpha,
            alpha_H=self.alpha,
            l1_ratio=self.l1_ratio,
            max_iter=self.max_iter,
            random_state=42,
            init='nndsvd'  # Better initialization for NMF
        )

        # Fit the model and get document-topic matrix
        self.document_topics = self.model.fit_transform(tfidf)

        if progress_callback:
            progress_callback(70, "Extracting topics...")

        # Extract topics
        self.topics = self.get_topics()

        # Count documents per topic
        self._count_documents_per_topic(documents)

        if progress_callback:
            progress_callback(100, "NMF training completed")

        return self

    def get_topics(self, top_n_words: int = 10) -> List[Dict]:
        """
        Extract topics with top words and weights.

        Args:
            top_n_words: Number of top words to extract per topic

        Returns:
            List of topic dictionaries
        """
        if self.model is None:
            return []

        topics_list = []

        for topic_idx, topic in enumerate(self.model.components_):
            # Get top word indices
            top_indices = topic.argsort()[-top_n_words:][::-1]

            # Get words and weights
            top_words = []
            for idx in top_indices:
                word = self.feature_names[idx]
                weight = topic[idx]
                top_words.append((word, float(weight)))

            topics_list.append({
                'id': topic_idx,
                'label': f"Topic {topic_idx + 1}",
                'words': top_words,
                'document_count': 0  # Will be filled later
            })

        return topics_list

    def get_document_topics(self, documents: List[str]) -> np.ndarray:
        """
        Get topic distribution for documents.

        Args:
            documents: List of documents

        Returns:
            Array of shape (n_documents, n_topics) with topic probabilities
        """
        if self.model is None or self.vectorizer is None:
            return np.array([])

        # Transform documents to TF-IDF
        tfidf = self.vectorizer.transform(documents)

        # Get topic distributions
        return self.model.transform(tfidf)

    def _count_documents_per_topic(self, documents: List[str]):
        """
        Count number of documents assigned to each topic.

        Args:
            documents: Original documents
        """
        if self.document_topics is None:
            return

        # Assign each document to its dominant topic
        dominant_topics = np.argmax(self.document_topics, axis=1)

        # Count documents per topic
        for topic in self.topics:
            topic['document_count'] = int(np.sum(dominant_topics == topic['id']))

    def get_reconstruction_error(self) -> float:
        """
        Get model reconstruction error (lower is better).

        Returns:
            Reconstruction error
        """
        if self.model is None:
            return float('inf')

        return self.model.reconstruction_err_

    def get_topic_summary(self, top_n_words: int = 5) -> Dict:
        """
        Get a summary of all topics.

        Args:
            top_n_words: Number of top words per topic

        Returns:
            Summary dictionary
        """
        summary = {
            'algorithm': 'NMF',
            'num_topics': self.num_topics,
            'num_features': len(self.feature_names),
            'diversity': self.get_topic_diversity(),
            'reconstruction_error': self.get_reconstruction_error(),
            'topics': []
        }

        for topic in self.topics:
            top_words = [word for word, _ in topic['words'][:top_n_words]]
            summary['topics'].append({
                'id': topic['id'],
                'label': topic['label'],
                'keywords': top_words,
                'document_count': topic['document_count']
            })

        return summary
