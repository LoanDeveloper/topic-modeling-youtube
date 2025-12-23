"""Custom stopwords for French and English with YouTube-specific terms."""

# French stopwords (common words + YouTube-specific)
FRENCH_STOPWORDS = set([
    # Articles
    'le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'l',
    # Pronouns
    'je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles',
    'me', 'te', 'se', 'moi', 'toi', 'lui', 'eux',
    'mon', 'ma', 'mes', 'ton', 'ta', 'tes', 'son', 'sa', 'ses',
    'notre', 'votre', 'leur', 'nos', 'vos', 'leurs',
    'ce', 'cet', 'cette', 'ces', 'ça', 'c',
    'qui', 'que', 'quoi', 'dont', 'où',
    # Conjunctions
    'et', 'ou', 'mais', 'donc', 'or', 'ni', 'car',
    'si', 'comme', 'quand', 'lorsque', 'puisque',
    # Prepositions
    'à', 'au', 'aux', 'en', 'dans', 'par', 'pour', 'avec', 'sans',
    'sur', 'sous', 'entre', 'vers', 'chez', 'depuis', 'pendant',
    # Verbs (most common forms)
    'être', 'est', 'sont', 'était', 'été', 'étant', 'suis', 'es', 'sommes', 'êtes',
    'avoir', 'a', 'ai', 'as', 'avez', 'avons', 'ont', 'avait', 'eu', 'ayant',
    'faire', 'fait', 'faire', 'faites', 'font', 'fais', 'faisons',
    'dire', 'dit', 'dites', 'disent', 'dis', 'disons',
    'aller', 'va', 'vais', 'allons', 'allez', 'vont',
    'voir', 'voit', 'vois', 'voyons', 'voyez', 'voient', 'vu',
    'pouvoir', 'peut', 'peux', 'pouvons', 'pouvez', 'peuvent', 'pu',
    'vouloir', 'veut', 'veux', 'voulons', 'voulez', 'veulent', 'voulu',
    'devoir', 'doit', 'dois', 'devons', 'devez', 'doivent', 'dû',
    'savoir', 'sait', 'sais', 'savons', 'savez', 'savent', 'su',
    # Adverbs
    'ne', 'pas', 'plus', 'très', 'trop', 'bien', 'mal', 'tout', 'tous', 'toute', 'toutes',
    'peu', 'beaucoup', 'encore', 'déjà', 'jamais', 'toujours', 'souvent', 'parfois',
    'aussi', 'même', 'ainsi', 'alors', 'donc', 'pourtant', 'cependant',
    'oui', 'non', 'si', 'peut-être',
    # Numbers
    'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix',
    # Other common words
    'ça', 'là', 'ici', 'y', 'en', 'on', 'se',
    # YouTube-specific French
    'vidéo', 'vidéos', 'chaîne', 'chaînes', 'chaine', 'chaines',
    'commentaire', 'commentaires', 'abonne', 'abonné', 'abonnés', 'abonnez',
    'like', 'likes', 'liker', 'partage', 'partager', 'partagez',
    'merci', 'thanks', 'super', 'bravo', 'génial', 'cool',
    'bonjour', 'salut', 'coucou', 'hello', 'hey',
    'pouce', 'pouces', 'cloche', 'notification', 'notifications',
    # Short/filler words
    'ah', 'oh', 'eh', 'hein', 'bon', 'ben', 'bah',
    'ok', 'okay', 'd\'accord', 'ouais', 'nan', 'nope',
])

# English stopwords (common words + YouTube-specific)
ENGLISH_STOPWORDS = set([
    # Articles
    'a', 'an', 'the',
    # Pronouns
    'i', 'you', 'he', 'she', 'it', 'we', 'they',
    'me', 'him', 'her', 'us', 'them',
    'my', 'your', 'his', 'her', 'its', 'our', 'their',
    'mine', 'yours', 'hers', 'ours', 'theirs',
    'this', 'that', 'these', 'those',
    'who', 'whom', 'whose', 'which', 'what',
    # Conjunctions
    'and', 'or', 'but', 'so', 'yet', 'for', 'nor',
    'if', 'then', 'else', 'when', 'while', 'as', 'since', 'because',
    # Prepositions
    'of', 'in', 'on', 'at', 'to', 'from', 'by', 'with', 'without',
    'about', 'above', 'below', 'between', 'among', 'through',
    'during', 'before', 'after', 'into', 'onto', 'over', 'under',
    # Verbs (common forms)
    'be', 'is', 'am', 'are', 'was', 'were', 'been', 'being',
    'have', 'has', 'had', 'having',
    'do', 'does', 'did', 'doing', 'done',
    'will', 'would', 'shall', 'should', 'can', 'could', 'may', 'might', 'must',
    'get', 'got', 'gets', 'getting',
    'go', 'goes', 'went', 'going', 'gone',
    'make', 'makes', 'made', 'making',
    'take', 'takes', 'took', 'taking', 'taken',
    'come', 'comes', 'came', 'coming',
    'see', 'sees', 'saw', 'seeing', 'seen',
    'know', 'knows', 'knew', 'knowing', 'known',
    'think', 'thinks', 'thought', 'thinking',
    'say', 'says', 'said', 'saying',
    'tell', 'tells', 'told', 'telling',
    # Adverbs
    'not', 'no', 'yes', 'very', 'too', 'also', 'just', 'only',
    'much', 'more', 'most', 'less', 'least',
    'now', 'then', 'here', 'there', 'where',
    'all', 'both', 'each', 'every', 'some', 'any', 'many', 'few',
    'other', 'another', 'such', 'own', 'same',
    'so', 'than', 'too', 'very', 'really', 'quite',
    'well', 'still', 'even', 'already', 'never', 'always', 'often', 'sometimes',
    # Numbers
    'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
    # Other common words
    'up', 'down', 'out', 'off', 'back', 'again',
    # YouTube-specific English
    'video', 'videos', 'channel', 'channels',
    'comment', 'comments', 'subscribe', 'subscribed', 'subscriber', 'subscribers',
    'like', 'likes', 'liked', 'liking', 'dislike', 'dislikes',
    'share', 'shares', 'shared', 'sharing',
    'watch', 'watching', 'watched', 'view', 'views', 'viewed', 'viewing',
    'thanks', 'thank', 'great', 'awesome', 'amazing', 'nice', 'good', 'cool',
    'hello', 'hi', 'hey', 'yo',
    'bell', 'notification', 'notifications', 'notif', 'notifs',
    'thumb', 'thumbs',
    # Short/filler words
    'ah', 'oh', 'eh', 'um', 'uh', 'hmm',
    'ok', 'okay', 'yeah', 'yep', 'nope', 'nah',
])


def get_stopwords(language: str = 'auto') -> set:
    """
    Get stopwords for specified language.

    Args:
        language: Language code ('fr', 'en', 'auto', or 'mixed')

    Returns:
        Set of stopwords
    """
    if language == 'fr':
        return FRENCH_STOPWORDS
    elif language == 'en':
        return ENGLISH_STOPWORDS
    elif language in ('auto', 'mixed'):
        # Return combined set for mixed languages
        return FRENCH_STOPWORDS | ENGLISH_STOPWORDS
    else:
        # Default to English
        return ENGLISH_STOPWORDS


def add_custom_stopwords(stopwords: set, custom_words: list) -> set:
    """
    Add custom stopwords to existing set.

    Args:
        stopwords: Existing stopwords set
        custom_words: List of custom words to add

    Returns:
        Updated stopwords set
    """
    return stopwords | set(word.lower() for word in custom_words)
