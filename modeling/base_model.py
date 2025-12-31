"""Base class for topic modeling algorithms."""

from abc import ABC, abstractmethod
from typing import Callable, Dict, List, Optional

import numpy as np


class BaseTopicModel(ABC):
    """Abstract base class for topic modeling algorithms."""

    def __init__(self, num_topics: int, **kwargs):
        """
        Initialize the base topic model.

        Args:
            num_topics: Number of topics to extract
            **kwargs: Additional algorithm-specific parameters
        """
        self.num_topics = num_topics
        self.model = None
        self.vectorizer = None
        self.topics = []
        self.document_topics = None
        self.feature_names = []

    @abstractmethod
    def fit(self, documents: List[str], progress_callback: Optional[Callable] = None):
        """
        Train the model on documents.

        Args:
            documents: List of preprocessed text documents
            progress_callback: Optional callback function for progress updates
                             Called with (progress_percentage, message)

        Returns:
            self
        """
        pass

    @abstractmethod
    def get_topics(self, top_n_words: int = 10) -> List[Dict]:
        """
        Extract topics with top words and weights.

        Args:
            top_n_words: Number of top words to extract per topic

        Returns:
            List of topic dictionaries with structure:
            [
                {
                    'id': 0,
                    'label': 'Topic 0',
                    'words': [('word1', weight1), ('word2', weight2), ...],
                    'document_count': int
                },
                ...
            ]
        """
        pass

    @abstractmethod
    def get_document_topics(self, documents: List[str]) -> np.ndarray:
        """
        Get topic distribution for each document.

        Args:
            documents: List of documents

        Returns:
            numpy array of shape (n_documents, n_topics) with topic probabilities
        """
        pass

    def get_topic_diversity(self) -> float:
        """
        Calculate topic diversity (uniqueness of topics).

        Measures how unique the topics are by comparing top words across topics.
        Higher values indicate more diverse topics.

        Returns:
            Diversity score between 0 and 1
        """
        if not self.topics:
            return 0.0

        # Get all top words from all topics
        all_top_words = set()
        topic_words = []

        for topic in self.topics:
            words = set([word for word, _ in topic["words"][:10]])
            topic_words.append(words)
            all_top_words.update(words)

        if not all_top_words:
            return 0.0

        # Calculate diversity as ratio of unique words to total words
        unique_words = len(all_top_words)
        total_words = len(self.topics) * 10

        diversity = unique_words / total_words if total_words > 0 else 0.0
        return diversity

    def get_representative_documents(
        self, documents: List[str], topic_id: int, n: int = 5
    ) -> List[str]:
        """
        Get most representative documents for a given topic.

        Args:
            documents: List of original documents
            topic_id: ID of the topic
            n: Number of representative documents to return

        Returns:
            List of most representative documents
        """
        topic_id = int(topic_id)  # Explicit conversion from potential numpy.int64

        if self.document_topics is None or topic_id >= len(self.topics):
            return []

        # Validate document count matches document_topics rows
        num_doc_topics = self.document_topics.shape[0]
        if len(documents) != num_doc_topics:
            print(
                f"[WARNING] Document count mismatch: {len(documents)} documents vs {num_doc_topics} in document_topics matrix"
            )
            return []

        # Get topic probabilities for all documents
        topic_probs = self.document_topics[:, topic_id]

        # Get indices of top n documents
        top_indices = np.argsort(topic_probs)[-n:][::-1]

        # Return corresponding documents (convert numpy int to python int)
        result = []
        for i in top_indices:
            idx = int(i)
            if 0 <= idx < len(documents):
                result.append(documents[idx])
        return result

    def get_model_info(self) -> Dict:
        """
        Get model information and metadata.

        Returns:
            Dictionary with model information
        """
        return {
            "algorithm": self.__class__.__name__.replace("Model", ""),
            "num_topics": self.num_topics,
            "num_features": len(self.feature_names) if self.feature_names else 0,
            "diversity": self.get_topic_diversity(),
        }
