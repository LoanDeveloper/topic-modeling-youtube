# Topic Modeling Visualization Components

This directory contains 7 production-ready React/TypeScript visualization components for topic modeling results.

## Components

### 1. TopicHeatmap
**File**: `TopicHeatmap.tsx`

Visualizes document-topic probability distribution as a heatmap using scatter plot.

**Props**:
```typescript
{
  data: {
    documents: number[];      // Array of document indices
    topics: number[];         // Array of topic indices
    probabilities: number[][]; // 2D array: probabilities[docIdx][topicIdx]
  };
  loading?: boolean;
}
```

**Features**:
- Automatically samples documents if > 100 for performance
- Color-coded probability visualization (light to dark)
- Interactive tooltips with exact probabilities
- Responsive design

---

### 2. WordCloudVisualization
**File**: `WordCloudVisualization.tsx`

Displays word clouds for each topic with word size based on importance.

**Props**:
```typescript
{
  topics: Array<{
    topic_number: number;
    words: string[];      // Array of words
    weights: number[];    // Corresponding weights
  }>;
  loading?: boolean;
}
```

**Features**:
- Tabbed interface to switch between topics
- Color-coded words for visual appeal
- Click on words to see exact weights
- Shows first 10 topics (with indication if more exist)

---

### 3. TopicEvolutionTimeline
**File**: `TopicEvolutionTimeline.tsx`

Shows how topic prevalence changes over time.

**Props**:
```typescript
{
  data: {
    dates: string[];                           // Array of date strings
    topicCounts: { [topicId: number]: number[] }; // Topic counts per date
  };
  loading?: boolean;
}
```

**Features**:
- Line chart with multiple topics
- Toggle topics on/off with checkboxes
- First 5 topics shown by default
- Smooth curves with interactive tooltips
- Legend for topic identification

---

### 4. InterTopicDistance
**File**: `InterTopicDistance.tsx`

2D scatter plot showing topic similarity/distance.

**Props**:
```typescript
{
  data: {
    coordinates: [number, number][]; // 2D coordinates for each topic
    labels: string[];                // Topic labels
    distances: number[][];           // Distance matrix (optional)
  };
  loading?: boolean;
}
```

**Features**:
- Scatter plot with color-coded topics
- Hover to see distances between topics
- Interactive legend
- Auto-calculates Euclidean distance if matrix not provided

---

### 5. SentimentAnalysis
**File**: `SentimentAnalysis.tsx`

Displays sentiment scores and distribution per topic.

**Props**:
```typescript
{
  sentiments: Array<{
    topic_number: number;
    avg_sentiment: number;      // -1 to 1
    positive_count: number;
    neutral_count: number;
    negative_count: number;
  }>;
  loading?: boolean;
}
```

**Features**:
- Two charts: average sentiment and count distribution
- Color-coded: green (positive), yellow (neutral), red (negative)
- Stacked bar chart for sentiment breakdown
- Detailed tooltips with percentages

---

### 6. CoherenceScores
**File**: `CoherenceScores.tsx`

Shows coherence scores for each topic with quality indicators.

**Props**:
```typescript
{
  coherence: {
    coherence_score: number;         // Overall score
    per_topic_coherence: number[];   // Per-topic scores
    coherence_type: string;          // e.g., "c_v", "u_mass"
  };
  loading?: boolean;
}
```

**Features**:
- Overall score prominently displayed
- Per-topic bar chart
- Quality indicators (excellent/good/fair/poor)
- Interpretation guide for different coherence types
- Color-coded based on score thresholds

---

### 7. PreprocessingStats
**File**: `PreprocessingStats.tsx`

Displays comprehensive preprocessing statistics.

**Props**:
```typescript
{
  stats: {
    original_documents: number;
    processed_documents: number;
    avg_length_original: number;
    avg_length_processed: number;
    total_vocabulary: number;
    language_distribution?: { [lang: string]: number };
  };
  loading?: boolean;
}
```

**Features**:
- Key metrics cards with icons
- Document count comparison chart
- Length comparison chart
- Language distribution pie chart
- Comprehensive summary with retention rates

---

## Usage Example

```typescript
import {
  TopicHeatmap,
  WordCloudVisualization,
  TopicEvolutionTimeline,
  InterTopicDistance,
  SentimentAnalysis,
  CoherenceScores,
  PreprocessingStats,
} from '@/components/modeling/visualizations';

function TopicModelingResults() {
  return (
    <div className="space-y-6">
      <PreprocessingStats stats={preprocessingData} />
      <WordCloudVisualization topics={topicData} />
      <TopicHeatmap data={heatmapData} />
      <TopicEvolutionTimeline data={timelineData} />
      <InterTopicDistance data={distanceData} />
      <SentimentAnalysis sentiments={sentimentData} />
      <CoherenceScores coherence={coherenceData} />
    </div>
  );
}
```

## Dependencies

These components use:
- **shadcn/ui**: Card, Tabs, Badge, Checkbox, Label components
- **Recharts**: All chart visualizations
- **Tailwind CSS**: Styling
- **lucide-react**: Icons

Make sure these are installed in your project:

```bash
npm install recharts lucide-react
```

## Features

All components include:
- Proper TypeScript typing
- Loading states
- Empty/error state handling
- Responsive design
- Accessibility features (ARIA labels)
- Interactive tooltips
- Color-coded visualizations
- Professional styling with shadcn/ui

## Customization

Each component can be customized by:
- Modifying the color palettes (COLORS arrays)
- Adjusting chart dimensions in ResponsiveContainer
- Changing threshold values for scoring systems
- Extending props for additional features

## Performance

- TopicHeatmap automatically samples large datasets (>100 documents)
- WordCloudVisualization limits to first 10 topics in tabs
- All charts use Recharts' built-in optimization
- Memoization used where appropriate
