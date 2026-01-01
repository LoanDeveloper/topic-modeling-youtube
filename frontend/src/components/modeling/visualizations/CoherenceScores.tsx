import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, XCircle } from 'lucide-react';

interface CoherenceScoresProps {
  coherence: {
    coherence_score: number;
    per_topic_coherence: number[];
    coherence_type: string;
  };
  loading?: boolean;
}

export function CoherenceScores({ coherence, loading = false }: CoherenceScoresProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Topic Coherence Scores</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[500px]">
            <div className="animate-pulse text-muted-foreground">Loading coherence scores...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!coherence || coherence.per_topic_coherence.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Topic Coherence Scores</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[500px] text-muted-foreground">
            No coherence data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = coherence.per_topic_coherence.map((score, idx) => ({
    topic: `Topic ${idx}`,
    topicNumber: idx,
    score: score,
  }));

  // Color coding based on coherence score
  // Higher coherence = better quality topics
  // Typical ranges: < -1.5 (poor), -1.5 to -1 (fair), -1 to -0.5 (good), > -0.5 (excellent)
  // For c_v coherence: 0-0.4 (poor), 0.4-0.6 (fair), 0.6-0.8 (good), 0.8-1 (excellent)
  const getCoherenceColor = (score: number, type: string) => {
    if (type.toLowerCase().includes('c_v') || type.toLowerCase().includes('cv')) {
      if (score >= 0.8) return '#10b981'; // Green - excellent
      if (score >= 0.6) return '#84cc16'; // Light green - good
      if (score >= 0.4) return '#eab308'; // Yellow - fair
      return '#ef4444'; // Red - poor
    } else {
      // u_mass or other negative coherence measures
      if (score >= -0.5) return '#10b981'; // Green - excellent
      if (score >= -1) return '#84cc16'; // Light green - good
      if (score >= -1.5) return '#eab308'; // Yellow - fair
      return '#ef4444'; // Red - poor
    }
  };

  const getCoherenceQuality = (score: number, type: string) => {
    if (type.toLowerCase().includes('c_v') || type.toLowerCase().includes('cv')) {
      if (score >= 0.8) return { label: 'Excellent', icon: CheckCircle2, color: 'text-green-600' };
      if (score >= 0.6) return { label: 'Good', icon: CheckCircle2, color: 'text-green-500' };
      if (score >= 0.4) return { label: 'Fair', icon: AlertCircle, color: 'text-yellow-600' };
      return { label: 'Poor', icon: XCircle, color: 'text-red-600' };
    } else {
      if (score >= -0.5) return { label: 'Excellent', icon: CheckCircle2, color: 'text-green-600' };
      if (score >= -1) return { label: 'Good', icon: CheckCircle2, color: 'text-green-500' };
      if (score >= -1.5) return { label: 'Fair', icon: AlertCircle, color: 'text-yellow-600' };
      return { label: 'Poor', icon: XCircle, color: 'text-red-600' };
    }
  };

  const overallQuality = getCoherenceQuality(coherence.coherence_score, coherence.coherence_type);
  const OverallIcon = overallQuality.icon;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Topic Coherence Scores</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Measure of topic quality and interpretability ({coherence.coherence_type})
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Score */}
        <div className="bg-muted/30 rounded-lg p-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <OverallIcon className={`w-6 h-6 ${overallQuality.color}`} />
            <h3 className="text-lg font-semibold">Overall Coherence Score</h3>
          </div>
          <div className="text-4xl font-bold mb-2">{coherence.coherence_score.toFixed(4)}</div>
          <Badge variant="secondary" className="text-sm">
            {overallQuality.label} Quality
          </Badge>
        </div>

        {/* Per-Topic Scores */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Per-Topic Coherence Scores</h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="topic" tick={{ fontSize: 12 }} />
              <YAxis
                label={{ value: 'Coherence Score', angle: -90, position: 'insideLeft' }}
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
                    const quality = getCoherenceQuality(data.score, coherence.coherence_type);

                    return (
                      <div className="bg-background border border-border rounded-lg shadow-lg p-3">
                        <p className="font-semibold">{data.topic}</p>
                        <p className="text-sm">Score: {data.score.toFixed(4)}</p>
                        <p className={`text-sm font-medium ${quality.color}`}>
                          Quality: {quality.label}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="score" radius={[8, 8, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={getCoherenceColor(entry.score, coherence.coherence_type)}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Interpretation Guide */}
        <div className="bg-muted/30 rounded-lg p-4 space-y-3">
          <h4 className="font-semibold text-sm">Interpretation Guide</h4>
          <div className="space-y-2 text-sm">
            {coherence.coherence_type.toLowerCase().includes('c_v') ||
            coherence.coherence_type.toLowerCase().includes('cv') ? (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-600 rounded" />
                  <span>Excellent: 0.8 - 1.0 (highly coherent topics)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded" />
                  <span>Good: 0.6 - 0.8 (coherent topics)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-600 rounded" />
                  <span>Fair: 0.4 - 0.6 (moderately coherent)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-600 rounded" />
                  <span>Poor: 0.0 - 0.4 (low coherence)</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-600 rounded" />
                  <span>Excellent: -0.5 to 0 (highly coherent topics)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded" />
                  <span>Good: -1.0 to -0.5 (coherent topics)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-600 rounded" />
                  <span>Fair: -1.5 to -1.0 (moderately coherent)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-600 rounded" />
                  <span>Poor: &lt; -1.5 (low coherence)</span>
                </div>
              </>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Higher coherence scores indicate topics with more semantically related words, making them
            easier to interpret and more meaningful.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
