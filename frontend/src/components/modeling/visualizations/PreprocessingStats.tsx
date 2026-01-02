import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend } from 'recharts';
import { FileText, Filter, Languages, BookOpen } from 'lucide-react';

interface PreprocessingStatsProps {
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

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#f97316'];

export function PreprocessingStats({ stats, loading = false }: PreprocessingStatsProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Preprocessing Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[500px]">
            <div className="animate-pulse text-muted-foreground">Loading preprocessing stats...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Preprocessing Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[500px] text-muted-foreground">
            No preprocessing statistics available
          </div>
        </CardContent>
      </Card>
    );
  }

  // Document count comparison data
  const documentComparisonData = [
    { name: 'Original', count: stats.original_documents, fill: '#3b82f6' },
    { name: 'Processed', count: stats.processed_documents, fill: '#10b981' },
  ];

  // Length comparison data
  const lengthComparisonData = [
    { name: 'Original', avgLength: stats.avg_length_original, fill: '#3b82f6' },
    { name: 'Processed', avgLength: stats.avg_length_processed, fill: '#10b981' },
  ];

  // Language distribution data
  const languageData = stats.language_distribution
    ? Object.entries(stats.language_distribution).map(([lang, count]) => ({
        name: lang.toUpperCase(),
        value: count,
      }))
    : [];

  const retentionRate = ((stats.processed_documents / stats.original_documents) * 100).toFixed(1);
  const lengthReductionRate = (
    ((stats.avg_length_original - stats.avg_length_processed) / stats.avg_length_original) *
    100
  ).toFixed(1);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preprocessing Statistics</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Overview of data preprocessing and cleaning operations
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-muted/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-muted-foreground">Original Docs</span>
            </div>
            <div className="text-2xl font-bold">{stats.original_documents.toLocaleString()}</div>
          </div>

          <div className="bg-muted/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Filter className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-muted-foreground">Processed Docs</span>
            </div>
            <div className="text-2xl font-bold">{stats.processed_documents.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground mt-1">{retentionRate}% retained</div>
          </div>

          <div className="bg-muted/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-5 h-5 text-purple-600" />
              <span className="text-sm font-medium text-muted-foreground">Vocabulary</span>
            </div>
            <div className="text-2xl font-bold">{stats.total_vocabulary.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground mt-1">unique words</div>
          </div>

          <div className="bg-muted/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Languages className="w-5 h-5 text-orange-600" />
              <span className="text-sm font-medium text-muted-foreground">Languages</span>
            </div>
            <div className="text-2xl font-bold">
              {languageData.length > 0 ? languageData.length : 'N/A'}
            </div>
            <div className="text-xs text-muted-foreground mt-1">detected</div>
          </div>
        </div>

        {/* Document Count Comparison */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Document Count Comparison</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={documentComparisonData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                {documentComparisonData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-sm text-muted-foreground text-center mt-2">
            {stats.original_documents - stats.processed_documents} documents removed during preprocessing
          </p>
        </div>

        {/* Average Length Comparison */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Average Document Length</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={lengthComparisonData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} label={{ value: 'Words', angle: -90, position: 'insideLeft' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="avgLength" radius={[8, 8, 0, 0]}>
                {lengthComparisonData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-sm text-muted-foreground text-center mt-2">
            Average length reduced by {lengthReductionRate}% after preprocessing
          </p>
        </div>

        {/* Language Distribution */}
        {languageData.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Language Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={languageData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {languageData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Summary */}
        <div className="bg-muted/30 rounded-lg p-4">
          <h4 className="font-semibold text-sm mb-2">Preprocessing Summary</h4>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>
              • Started with {stats.original_documents.toLocaleString()} documents, retained{' '}
              {stats.processed_documents.toLocaleString()} ({retentionRate}%)
            </li>
            <li>
              • Average document length reduced from {stats.avg_length_original.toFixed(1)} to{' '}
              {stats.avg_length_processed.toFixed(1)} words ({lengthReductionRate}% reduction)
            </li>
            <li>• Total vocabulary size: {stats.total_vocabulary.toLocaleString()} unique words</li>
            {languageData.length > 0 && (
              <li>
                • Detected {languageData.length} language(s):{' '}
                {languageData.map((l) => l.name).join(', ')}
              </li>
            )}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
