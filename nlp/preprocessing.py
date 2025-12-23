"""Text preprocessing pipeline for YouTube comments."""

from typing import List, Optional, Callable
import re
import unicodedata

try:
    import spacy
    SPACY_AVAILABLE = True
except ImportError:
    SPACY_AVAILABLE = False

from .stopwords import get_stopwords
from .language_detector import LanguageDetector


class TextPreprocessor:
    """Preprocess YouTube comments for topic modeling."""

    def __init__(self, language: str = 'auto', use_lemmatization: bool = True,
                 min_token_length: int = 2, progress_callback: Optional[Callable] = None):
        """
        Initialize text preprocessor.

        Args:
            language: Language code ('auto', 'fr', 'en', 'mixed')
            use_lemmatization: Whether to use spaCy lemmatization
            min_token_length: Minimum token length to keep
            progress_callback: Optional callback for progress updates
        """
        self.language = language
        self.use_lemmatization = use_lemmatization
        self.min_token_length = min_token_length
        self.progress_callback = progress_callback

        # Load stopwords
        self.stopwords = get_stopwords(language)

        # Initialize language detector
        self.lang_detector = LanguageDetector()

        # Initialize spaCy models (lazy loading)
        self.nlp_fr = None
        self.nlp_en = None

        if use_lemmatization and SPACY_AVAILABLE:
            self._init_spacy_models()

    def _init_spacy_models(self):
        """Initialize spaCy models lazily."""
        if self.language in ('auto', 'fr', 'mixed'):
            try:
                self.nlp_fr = spacy.load('fr_core_news_sm')
                # Disable unnecessary pipeline components
                self.nlp_fr.disable_pipes(['parser', 'ner'])
            except OSError:
                print("Warning: French spaCy model not found. Run: python -m spacy download fr_core_news_sm")

        if self.language in ('auto', 'en', 'mixed'):
            try:
                self.nlp_en = spacy.load('en_core_web_sm')
                # Disable unnecessary pipeline components
                self.nlp_en.disable_pipes(['parser', 'ner'])
            except OSError:
                print("Warning: English spaCy model not found. Run: python -m spacy download en_core_web_sm")

    def process_batch(self, texts: List[str], detect_language: bool = True) -> List[str]:
        """
        Process a batch of texts.

        Args:
            texts: List of raw comment texts
            detect_language: Whether to detect language per comment

        Returns:
            List of processed texts
        """
        processed = []
        total = len(texts)

        for i, text in enumerate(texts):
            # Progress update
            if self.progress_callback and i % 100 == 0:
                progress = (i / total) * 100
                self.progress_callback(progress, f"Preprocessing {i}/{total} comments...")

            # Detect language if needed
            lang = None
            if detect_language and self.language == 'auto':
                lang = self.lang_detector.detect_comment_language(text)

            # Process text
            processed_text = self.process(text, detected_language=lang)
            processed.append(processed_text)

        return processed

    def process(self, text: str, detected_language: Optional[str] = None) -> str:
        """
        Process a single text through the full pipeline.

        Args:
            text: Raw comment text
            detected_language: Pre-detected language (optional)

        Returns:
            Processed text as a single string
        """
        # 1. Basic cleaning
        text = self.clean_text(text)

        if not text:
            return ''

        # 2. Tokenize
        tokens = self.tokenize(text)

        # 3. Lemmatize (if enabled)
        if self.use_lemmatization:
            tokens = self.lemmatize(tokens, detected_language)

        # 4. Remove stopwords
        tokens = self.remove_stopwords(tokens)

        # 5. Filter short tokens
        tokens = [t for t in tokens if len(t) >= self.min_token_length]

        # Join tokens back into string
        return ' '.join(tokens)

    def clean_text(self, text: str) -> str:
        """
        Clean and normalize text.

        Args:
            text: Raw text

        Returns:
            Cleaned text
        """
        if not text:
            return ''

        # Convert to lowercase
        text = text.lower()

        # Remove URLs
        text = re.sub(r'https?://\S+', '', text)
        text = re.sub(r'www\.\S+', '', text)

        # Remove email addresses
        text = re.sub(r'\S+@\S+', '', text)

        # Remove mentions (@username)
        text = re.sub(r'@\w+', '', text)

        # Remove hashtags but keep the text
        text = re.sub(r'#(\w+)', r'\1', text)

        # Remove numbers standalone
        text = re.sub(r'\b\d+\b', '', text)

        # Normalize unicode characters (keep accents)
        # text = unicodedata.normalize('NFKD', text)

        # Remove special characters but keep letters with accents
        # Keep: a-z, accented letters, spaces, hyphens, apostrophes
        text = re.sub(r'[^\w\s\'-àâäéèêëïîôùûüÿçœæ]', ' ', text, flags=re.UNICODE)

        # Remove multiple spaces
        text = re.sub(r'\s+', ' ', text)

        # Strip whitespace
        text = text.strip()

        return text

    def tokenize(self, text: str) -> List[str]:
        """
        Tokenize text into words.

        Args:
            text: Cleaned text

        Returns:
            List of tokens
        """
        # Simple whitespace tokenization
        tokens = text.split()

        # Remove empty tokens
        tokens = [t for t in tokens if t]

        # Remove tokens that are just punctuation
        tokens = [t for t in tokens if not re.match(r'^[\W_]+$', t)]

        return tokens

    def lemmatize(self, tokens: List[str], detected_language: Optional[str] = None) -> List[str]:
        """
        Lemmatize tokens using spaCy.

        Args:
            tokens: List of tokens
            detected_language: Detected language for this text

        Returns:
            List of lemmatized tokens
        """
        if not SPACY_AVAILABLE:
            return tokens

        # Determine which spaCy model to use
        nlp = None

        if detected_language == 'fr' and self.nlp_fr:
            nlp = self.nlp_fr
        elif detected_language == 'en' and self.nlp_en:
            nlp = self.nlp_en
        elif self.language == 'fr' and self.nlp_fr:
            nlp = self.nlp_fr
        elif self.language == 'en' and self.nlp_en:
            nlp = self.nlp_en
        elif self.nlp_en:  # Default to English
            nlp = self.nlp_en
        elif self.nlp_fr:  # Fallback to French
            nlp = self.nlp_fr

        if not nlp:
            return tokens

        # Join tokens and process with spaCy
        text = ' '.join(tokens)

        try:
            doc = nlp(text)
            lemmatized = [token.lemma_ for token in doc]
            return lemmatized
        except Exception as e:
            print(f"Warning: Lemmatization failed: {e}")
            return tokens

    def remove_stopwords(self, tokens: List[str]) -> List[str]:
        """
        Remove stopwords from tokens.

        Args:
            tokens: List of tokens

        Returns:
            List of tokens without stopwords
        """
        return [t for t in tokens if t.lower() not in self.stopwords]

    def get_statistics(self, original_texts: List[str], processed_texts: List[str]) -> dict:
        """
        Get preprocessing statistics.

        Args:
            original_texts: Original texts
            processed_texts: Processed texts

        Returns:
            Statistics dictionary
        """
        # Count tokens
        original_tokens = sum(len(text.split()) for text in original_texts)
        processed_tokens = sum(len(text.split()) for text in processed_texts)

        # Count empty documents
        empty_docs = sum(1 for text in processed_texts if not text.strip())

        return {
            'original_documents': len(original_texts),
            'processed_documents': len(processed_texts),
            'empty_documents': empty_docs,
            'original_tokens': original_tokens,
            'processed_tokens': processed_tokens,
            'reduction_ratio': 1 - (processed_tokens / original_tokens) if original_tokens > 0 else 0,
            'avg_tokens_per_doc': processed_tokens / len(processed_texts) if processed_texts else 0
        }
