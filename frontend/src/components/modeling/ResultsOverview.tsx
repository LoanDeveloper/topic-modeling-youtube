import React from 'react';
import { Brain, MessageSquare, Target, Cpu } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ModelingResult } from '@/types';
import { cn } from '@/lib/utils';

interface ResultsOverviewProps {
  result: ModelingResult;
}

/**
 * Format numbers with K/M abbreviations (e.g., 1.2K, 500)
 */
function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1) + 'M';
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(1) + 'K';
  }
  return num.toString();
}

/**
 * Get color and label for diversity score
 */
function getDiversityColor(score: number): {
  bgColor: string;
  textColor: string;
  label: string;
} {
  if (score > 0.7) {
    return {
      bgColor: 'bg-green-50 dark:bg-green-950',
      textColor: 'text-green-700 dark:text-green-300',
      label: 'High',
    };
  }
  if (score > 0.4) {
    return {
      bgColor: 'bg-yellow-50 dark:bg-yellow-950',
      textColor: 'text-yellow-700 dark:text-yellow-300',
      label: 'Medium',
    };
  }
  return {
    bgColor: 'bg-red-50 dark:bg-red-950',
    textColor: 'text-red-700 dark:text-red-300',
    label: 'Low',
  };
}

/**
 * Stat card component
 */
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  description?: string;
  className?: string;
}

const StatCard = ({ icon, label, value, description, className }: StatCardProps) => (
  <Card className={className}>
    <CardHeader className="pb-3">
      <div className="flex items-center justify-between">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </div>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {description && (
        <CardDescription className="mt-2 text-xs">{description}</CardDescription>
      )}
    </CardContent>
  </Card>
);

/**
 * Results Overview Component
 * Displays 4 key metrics from modeling results in a responsive grid
 */
export const ResultsOverview: React.FC<ResultsOverviewProps> = ({ result }) => {
  const diversityColor = getDiversityColor(result.diversity);
  const diversityPercentage = (result.diversity * 100).toFixed(1);

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Topics Found */}
      <StatCard
        icon={<Brain className="h-4 w-4" />}
        label="Topics Found"
        value={result.num_topics}
        description="Number of extracted topics"
      />

      {/* Comments Analyzed */}
      <StatCard
        icon={<MessageSquare className="h-4 w-4" />}
        label="Comments Analyzed"
        value={formatNumber(result.valid_comments)}
        description={`of ${formatNumber(result.total_comments)} total`}
      />

      {/* Diversity Score */}
      <div className={cn('rounded-lg border shadow-sm', diversityColor.bgColor)}>
        <div className="flex flex-col space-y-1.5 p-6 pb-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-muted-foreground">
              Diversity Score
            </div>
            <Target className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
        <div className="px-6 pb-6">
          <div className={cn('text-2xl font-bold', diversityColor.textColor)}>
            {diversityPercentage}%
          </div>
          <div className={cn('mt-2 text-xs', diversityColor.textColor)}>
            {diversityColor.label} diversity
          </div>
        </div>
      </div>

      {/* Algorithm Badge */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Algorithm
            </CardTitle>
            <Cpu className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <Badge variant="default" className="text-sm">
            {result.algorithm.toUpperCase()}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {result.model_info.max_iter} iterations
          </span>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResultsOverview;
