#!/bin/bash

# Setup script for Topic Modeling feature
# Usage: ./setup_modeling.sh

echo "========================================="
echo "Topic Modeling Setup"
echo "========================================="
echo ""

# Check if virtual environment is active
if [[ -z "$VIRTUAL_ENV" ]]; then
    echo "⚠️  Virtual environment not active!"
    echo "Please activate it first:"
    echo "  source .venv/bin/activate  # Linux/Mac"
    echo "  .venv\\Scripts\\activate   # Windows"
    exit 1
fi

echo "✅ Virtual environment active: $VIRTUAL_ENV"
echo ""

# Install Python packages
echo "📦 Installing Python packages..."
pip install -q scikit-learn>=1.3.0 gensim>=4.3.0 langdetect>=1.0.9 spacy>=3.7.0 numpy>=1.24.0 pandas>=2.0.0 jinja2>=3.1.0

if [ $? -ne 0 ]; then
    echo "❌ Failed to install packages"
    exit 1
fi

echo "✅ Python packages installed"
echo ""

# Download spaCy models
echo "📥 Downloading spaCy language models..."

echo "  - French model (fr_core_news_sm)..."
python -m spacy download fr_core_news_sm -q 2>/dev/null

if [ $? -eq 0 ]; then
    echo "    ✅ French model installed"
else
    echo "    ⚠️  French model may already be installed or failed"
fi

echo "  - English model (en_core_web_sm)..."
python -m spacy download en_core_web_sm -q 2>/dev/null

if [ $? -eq 0 ]; then
    echo "    ✅ English model installed"
else
    echo "    ⚠️  English model may already be installed or failed"
fi

echo ""

# Verify installation
echo "🔍 Verifying installation..."

python << EOF
import sys
try:
    # Check packages
    import sklearn
    import langdetect
    import spacy
    import numpy
    import pandas
    import jinja2

    # Check spaCy models
    try:
        nlp_fr = spacy.load('fr_core_news_sm')
        print("✅ French spaCy model loaded")
    except:
        print("❌ French spaCy model not found")
        sys.exit(1)

    try:
        nlp_en = spacy.load('en_core_web_sm')
        print("✅ English spaCy model loaded")
    except:
        print("❌ English spaCy model not found")
        sys.exit(1)

    # Check custom modules
    import nlp.language_detector
    import nlp.preprocessing
    import modeling.lda_model
    import modeling.nmf_model
    print("✅ Custom modules importable")

    print("")
    print("========================================")
    print("✅ All dependencies installed correctly!")
    print("========================================")

except Exception as e:
    print(f"❌ Verification failed: {e}")
    sys.exit(1)
EOF

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Setup verification failed"
    exit 1
fi

echo ""
echo "🚀 Ready to use topic modeling!"
echo ""
echo "Next steps:"
echo "  1. Start the app: python app.py"
echo "  2. Open: http://localhost:4242"
echo "  3. Go to 'Modeling' tab"
echo "  4. Select a channel with comments (e.g., @defendintelligence)"
echo "  5. Click 'Preview Data' → Choose 'LDA' → 'Start Modeling'"
echo ""
