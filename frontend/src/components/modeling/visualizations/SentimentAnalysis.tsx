import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
} from 'recharts';

interface SentimentAnalysisProps {
  sentiments: Array<{
    topic_number: number;
    avg_sentiment: number;
    positive_count: number;
    neutral_count: number;
    negative_count: number;
  }>;
  loading?: boolean;
}

export function SentimentAnalysis({ sentiments, loading = false }: SentimentAnalysisProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sentiment Analysis by Topic</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[500px]">
            <div className="animate-pulse text-muted-foreground">Loading sentiment data...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!sentiments || sentiments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sentiment Analysis by Topic</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[500px] text-muted-foreground">
            No sentiment data available
          </div>
        </CardContent>
      </Card>
    );
  }

  // Prepare data for average sentiment chart
  const avgSentimentData = sentiments.map((s) => ({
    topic: `Topic ${s.topic_number}`,
    topicNumber: s.topic_number,
    sentiment: s.avg_sentiment,
  }));

  // Prepare data for stacked counts chart
  const countsData = sentiments.map((s) => ({
    topic: `Topic ${s.topic_number}`,
    topicNumber: s.topic_number,
    Positive: s.positive_count,
    Neutral: s.neutral_count,
    Negative: s.negative_count,
    total: s.positive_count + s.neutral_count + s.negative_count,
  }));

  // Color function for average sentiment
  const getSentimentColor = (sentiment: number) => {
    if (sentiment > 0.2) return '#10b981'; // Green
    if (sentiment < -0.2) return '#ef4444'; // Red
    return '#eab308'; // Yellow
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sentiment Analysis by Topic</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Average sentiment scores and distribution across topics
        </p>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Average Sentiment Chart */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Average Sentiment Score</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={avgSentimentData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="topic" tick={{ fontSize: 12 }} />
              <YAxis
                domain={[-1, 1]}
                ticks={[-1, -0.5, 0, 0.5, 1]}
                label={{ value: 'Sentiment Score', angle: -90, position: 'insideLeft' }}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    const sentiment = data.sentiment;
                    let label = 'Neutral';
                    if (sentiment > 0.2) label = 'Positive';
                    if (sentiment < -0.2) label = 'Negative';

                    return (
                      <div className="bg-background border border-border rounded-lg shadow-lg p-3">
                        <p className="font-semibold">{data.topic}</p>
                        <p className="text-sm">
                          Score: {sentiment.toFixed(3)} ({label})
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="sentiment" radius={[8, 8, 0, 0]}>
                {avgSentimentData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getSentimentColor(entry.sentiment)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center justify-center gap-6 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded" />
              <span>Positive (&gt; 0.2)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-500 rounded" />
              <span>Neutral (-0.2 to 0.2)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded" />
              <span>Negative (&lt; -0.2)</span>
            </div>
          </div>
        </div>

        {/* Stacked Counts Chart */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Sentiment Distribution (Comment Counts)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={countsData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="topic" tick={{ fontSize: 12 }} />
              <YAxis
                label={{ value: 'Number of Comments', angle: -90, position: 'insideLeft' }}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    const total = data.total;
                    const posPercent = ((data.Positive / total) * 100).toFixed(1);
                    const neuPercent = ((data.Neutral / total) * 100).toFixed(1);
                    const negPercent = ((data.Negative / total) * 100).toFixed(1);

                    return (
                      <div className="bg-background border border-border rounded-lg shadow-lg p-3">
                        <p className="font-semibold mb-2">{data.topic}</p>
                        <p className="text-sm text-green-600">
                          Positive: {data.Positive} ({posPercent}%)
                        </p>
                        <p className="text-sm text-yellow-600">
                          Neutral: {data.Neutral} ({neuPercent}%)
                        </p>
                        <p className="text-sm text-red-600">
                          Negative: {data.Negative} ({negPercent}%)
                        </p>
                        <p className="text-sm font-medium mt-1">Total: {total}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend />
              <Bar dataKey="Positive" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Neutral" stackId="a" fill="#eab308" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Negative" stackId="a" fill="#ef4444" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="text-sm text-muted-foreground">
          <p>
            <strong>Sentiment Score Range:</strong> -1 (very negative) to +1 (very positive)
          </p>
          <p className="mt-1">
            Use these insights to understand the emotional tone of discussions around each topic.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
