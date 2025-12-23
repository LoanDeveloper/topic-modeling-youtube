"""Language detection for YouTube comments."""

from typing import List, Dict
from collections import Counter
import re
from langdetect import detect, detect_langs, LangDetectException


class LanguageDetector:
    """Detect language of comments with caching and batch processing."""

    def __init__(self):
        """Initialize language detector."""
        self.cache = {}  # Cache detection results

    def detect_comment_language(self, text: str, confidence_threshold: float = 0.7) -> str:
        """
        Detect language of a single comment.

        Args:
            text: Comment text
            confidence_threshold: Minimum confidence required (0-1)

        Returns:
            Language code ('fr', 'en', or 'unknown')
        """
        # Check cache first
        if text in self.cache:
            return self.cache[text]

        # Clean and validate text
        cleaned_text = self._clean_text_for_detection(text)

        if not cleaned_text or len(cleaned_text) < 3:
            return 'unknown'

        try:
            # Get detection with probabilities
            lang_probs = detect_langs(cleaned_text)

            # Get most probable language
            if lang_probs:
                top_lang = lang_probs[0]

                # Check if French or English with sufficient confidence
                if top_lang.lang in ('fr', 'en') and top_lang.prob >= confidence_threshold:
                    result = top_lang.lang
                # Fallback to basic detection if confidence too low
                elif top_lang.prob < confidence_threshold:
                    # Try basic detection for short comments
                    try:
                        detected = detect(cleaned_text)
                        result = detected if detected in ('fr', 'en') else 'unknown'
                    except:
                        result = 'unknown'
                else:
                    result = 'unknown'
            else:
                result = 'unknown'

        except LangDetectException:
            result = 'unknown'

        # Cache result
        self.cache[text] = result
        return result

    def detect_batch_languages(self, comments: List[str], confidence_threshold: float = 0.7) -> List[str]:
        """
        Detect languages for a batch of comments.

        Args:
            comments: List of comment texts
            confidence_threshold: Minimum confidence required

        Returns:
            List of language codes corresponding to each comment
        """
        languages = []

        for comment in comments:
            lang = self.detect_comment_language(comment, confidence_threshold)
            languages.append(lang)

        return languages

    def get_dominant_language(self, comments: List[str]) -> str:
        """
        Get the dominant language in a batch of comments.

        Args:
            comments: List of comment texts

        Returns:
            Dominant language code ('fr', 'en', or 'mixed')
        """
        if not comments:
            return 'unknown'

        # Detect all languages
        languages = self.detect_batch_languages(comments)

        # Count language occurrences
        lang_counts = Counter(languages)

        # Remove unknown from counts
        if 'unknown' in lang_counts:
            del lang_counts['unknown']

        if not lang_counts:
            return 'unknown'

        # Get most common language
        most_common = lang_counts.most_common(2)

        if len(most_common) == 0:
            return 'unknown'
        elif len(most_common) == 1:
            return most_common[0][0]
        else:
            # Check if there's a clear dominant language (>60%)
            top_lang, top_count = most_common[0]
            second_lang, second_count = most_common[1]

            total_valid = sum(lang_counts.values())
            top_ratio = top_count / total_valid if total_valid > 0 else 0

            if top_ratio > 0.6:
                return top_lang
            else:
                return 'mixed'

    def get_language_distribution(self, comments: List[str]) -> Dict[str, float]:
        """
        Get distribution of languages in comments.

        Args:
            comments: List of comment texts

        Returns:
            Dictionary mapping language codes to percentages
        """
        if not comments:
            return {}

        languages = self.detect_batch_languages(comments)
        lang_counts = Counter(languages)

        total = len(comments)
        distribution = {
            lang: (count / total) * 100
            for lang, count in lang_counts.items()
        }

        return distribution

    def _clean_text_for_detection(self, text: str) -> str:
        """
        Clean text for language detection.

        Args:
            text: Raw comment text

        Returns:
            Cleaned text
        """
        if not text:
            return ''

        # Remove URLs
        text = re.sub(r'https?://\S+', '', text)
        text = re.sub(r'www\.\S+', '', text)

        # Remove mentions and hashtags
        text = re.sub(r'@\w+', '', text)
        text = re.sub(r'#\w+', '', text)

        # Remove excessive emojis and special characters
        # Keep letters and basic punctuation
        text = re.sub(r'[^\w\s\'-.,!?àâäéèêëïîôùûüÿçœæ]', ' ', text, flags=re.UNICODE)

        # Remove multiple spaces
        text = re.sub(r'\s+', ' ', text)

        # Strip whitespace
        text = text.strip()

        return text

    def clear_cache(self):
        """Clear the detection cache."""
        self.cache.clear()
