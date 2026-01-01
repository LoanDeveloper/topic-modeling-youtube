"""
Dimensionality Reduction Module

Reduces high-dimensional topic representations to 2D for visualization.
Supports UMAP, t-SNE, and PCA methods for inter-topic distance mapping.

Usage:
    reducer = DimensionalityReducer(method='umap')
    coords_2d = reducer.reduce(topic_embeddings)
"""

import logging
from typing import List, Dict, Any, Tuple, Optional
import numpy as np

logger = logging.getLogger(__name__)

# Try to import dimensionality reduction libraries
try:
    import umap
    UMAP_AVAILABLE = True
except ImportError:
    UMAP_AVAILABLE = False
    logger.warning("UMAP not available. Install with: pip install umap-learn")

try:
    from sklearn.manifold import TSNE
    from sklearn.decomposition import PCA
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False
    logger.warning("scikit-learn not available. Install with: pip install scikit-learn")


class DimensionalityReducer:
    """
    Reduces high-dimensional data to 2D for visualization.

    Methods:
        - umap: Uniform Manifold Approximation and Projection (recommended)
        - tsne: t-Distributed Stochastic Neighbor Embedding (slower, but good quality)
        - pca: Principal Component Analysis (fast, linear)
    """

    def __init__(
        self,
        method: str = 'umap',
        random_state: int = 42,
        **kwargs
    ):
        """
        Initialize dimensionality reducer.

        Args:
            method: Reduction method ('umap', 'tsne', or 'pca')
            random_state: Random seed for reproducibility
            **kwargs: Additional parameters for the chosen method
        """
        self.method = method
        self.random_state = random_state
        self.kwargs = kwargs
        self.reducer = None

        # Initialize reducer based on method
        if method == 'umap':
            if not UMAP_AVAILABLE:
                raise ImportError("UMAP not installed. Run: pip install umap-learn")

            # Default UMAP parameters
            umap_params = {
                'n_neighbors': kwargs.get('n_neighbors', 15),
                'min_dist': kwargs.get('min_dist', 0.1),
                'metric': kwargs.get('metric', 'cosine'),
                'n_components': 2,
                'random_state': random_state
            }

            self.reducer = umap.UMAP(**umap_params)
            logger.info(f"UMAP reducer initialized with params: {umap_params}")

        elif method == 'tsne':
            if not SKLEARN_AVAILABLE:
                raise ImportError("scikit-learn not installed. Run: pip install scikit-learn")

            # Default t-SNE parameters
            tsne_params = {
                'n_components': 2,
                'perplexity': kwargs.get('perplexity', 30),
                'learning_rate': kwargs.get('learning_rate', 200),
                'n_iter': kwargs.get('n_iter', 1000),
                'random_state': random_state
            }

            self.reducer = TSNE(**tsne_params)
            logger.info(f"t-SNE reducer initialized with params: {tsne_params}")

        elif method == 'pca':
            if not SKLEARN_AVAILABLE:
                raise ImportError("scikit-learn not installed. Run: pip install scikit-learn")

            self.reducer = PCA(n_components=2, random_state=random_state)
            logger.info("PCA reducer initialized")

        else:
            raise ValueError(f"Unknown method: {method}. Choose 'umap', 'tsne', or 'pca'")

    def reduce(self, embeddings: np.ndarray) -> np.ndarray:
        """
        Reduce high-dimensional embeddings to 2D.

        Args:
            embeddings: Array of shape (n_samples, n_features)

        Returns:
            Array of shape (n_samples, 2) with 2D coordinates
        """
        if embeddings.shape[0] < 2:
            logger.warning("Not enough samples for dimensionality reduction")
            return np.zeros((embeddings.shape[0], 2))

        logger.info(f"Reducing {embeddings.shape[0]} embeddings from {embeddings.shape[1]}D to 2D using {self.method}...")

        try:
            coords_2d = self.reducer.fit_transform(embeddings)
            logger.info(f"Dimensionality reduction completed. Output shape: {coords_2d.shape}")
            return coords_2d

        except Exception as e:
            logger.error(f"Dimensionality reduction failed: {e}")
            # Return zeros as fallback
            return np.zeros((embeddings.shape[0], 2))

    def calculate_distances(self, coords_2d: np.ndarray) -> np.ndarray:
        """
        Calculate pairwise Euclidean distances in 2D space.

        Args:
            coords_2d: Array of shape (n_points, 2)

        Returns:
            Distance matrix of shape (n_points, n_points)
        """
        from scipy.spatial.distance import pdist, squareform

        distances = pdist(coords_2d, metric='euclidean')
        distance_matrix = squareform(distances)

        return distance_matrix


class TopicDistanceCalculator:
    """
    Calculates inter-topic distances for visualization.

    Creates 2D representations of topics based on their semantic similarity.
    """

    def __init__(self, method: str = 'umap', random_state: int = 42):
        """
        Initialize topic distance calculator.

        Args:
            method: Dimensionality reduction method ('umap', 'tsne', 'pca')
            random_state: Random seed
        """
        self.method = method
        self.random_state = random_state

    def calculate_topic_distances(
        self,
        topic_term_matrix: np.ndarray,
        topic_labels: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Calculate 2D coordinates and distances between topics.

        Args:
            topic_term_matrix: Matrix of shape (n_topics, n_terms) representing topics
            topic_labels: Optional labels for topics (e.g., ["Topic 0", "Topic 1", ...])

        Returns:
            Dict with:
                - coordinates: List of [x, y] coordinates for each topic
                - distances: Distance matrix (n_topics, n_topics)
                - labels: Topic labels
                - method: Reduction method used
        """
        n_topics = topic_term_matrix.shape[0]

        if topic_labels is None:
            topic_labels = [f"Topic {i}" for i in range(n_topics)]

        logger.info(f"Calculating inter-topic distances for {n_topics} topics using {self.method}...")

        # Reduce to 2D
        reducer = DimensionalityReducer(method=self.method, random_state=self.random_state)
        coords_2d = reducer.reduce(topic_term_matrix)

        # Calculate distances
        distances = reducer.calculate_distances(coords_2d)

        # Format coordinates as list of [x, y]
        coordinates = [[float(x), float(y)] for x, y in coords_2d]

        logger.info(f"Topic distance calculation completed")

        return {
            'coordinates': coordinates,
            'distances': distances.tolist(),
            'labels': topic_labels,
            'method': self.method,
            'num_topics': n_topics
        }

    def calculate_document_clusters(
        self,
        document_topics: np.ndarray,
        sample_size: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Calculate 2D coordinates for documents based on topic distributions.

        Args:
            document_topics: Matrix of shape (n_docs, n_topics)
            sample_size: If provided, randomly sample this many documents

        Returns:
            Dict with:
                - coordinates: List of [x, y] coordinates for each document
                - dominant_topic: Dominant topic for each document
                - method: Reduction method used
        """
        n_docs = document_topics.shape[0]

        # Sample if needed
        if sample_size and n_docs > sample_size:
            logger.info(f"Sampling {sample_size} documents from {n_docs} for visualization")
            indices = np.random.choice(n_docs, sample_size, replace=False)
            document_topics_sampled = document_topics[indices]
        else:
            document_topics_sampled = document_topics
            indices = np.arange(n_docs)

        logger.info(f"Reducing {len(document_topics_sampled)} documents to 2D using {self.method}...")

        # Reduce to 2D
        reducer = DimensionalityReducer(method=self.method, random_state=self.random_state)
        coords_2d = reducer.reduce(document_topics_sampled)

        # Get dominant topic for each document
        dominant_topics = [int(np.argmax(doc_topic)) for doc_topic in document_topics_sampled]

        # Format coordinates
        coordinates = [[float(x), float(y)] for x, y in coords_2d]

        logger.info("Document clustering completed")

        return {
            'coordinates': coordinates,
            'dominant_topic': dominant_topics,
            'method': self.method,
            'num_documents': len(coordinates),
            'sampled_indices': indices.tolist() if sample_size else None
        }


def calculate_topic_distances_for_job(
    topic_term_matrix: np.ndarray,
    topic_labels: Optional[List[str]] = None,
    method: str = 'umap',
    random_state: int = 42
) -> Dict[str, Any]:
    """
    Convenience function to calculate topic distances for a modeling job.

    Args:
        topic_term_matrix: Matrix of shape (n_topics, n_terms)
        topic_labels: Optional topic labels
        method: Dimensionality reduction method ('umap', 'tsne', 'pca')
        random_state: Random seed

    Returns:
        Dict with coordinates, distances, and labels
    """
    calculator = TopicDistanceCalculator(method=method, random_state=random_state)
    return calculator.calculate_topic_distances(topic_term_matrix, topic_labels)


def calculate_document_clusters_for_job(
    document_topics: np.ndarray,
    method: str = 'umap',
    sample_size: int = 1000,
    random_state: int = 42
) -> Dict[str, Any]:
    """
    Convenience function to calculate document clusters for visualization.

    Args:
        document_topics: Matrix of shape (n_docs, n_topics)
        method: Dimensionality reduction method
        sample_size: Maximum number of documents to visualize
        random_state: Random seed

    Returns:
        Dict with coordinates and dominant topics
    """
    calculator = TopicDistanceCalculator(method=method, random_state=random_state)
    return calculator.calculate_document_clusters(document_topics, sample_size)
