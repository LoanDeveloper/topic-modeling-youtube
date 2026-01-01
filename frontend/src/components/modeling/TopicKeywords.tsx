import React from 'react';
import { Badge } from '@/components/ui/badge';
import type { TopicWord } from '@/types';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface TopicKeywordsProps {
  words: TopicWord[];
  maxWords?: number;
}

/**
 * TopicKeywords Component
 *
 * Displays topic keywords as weighted badges with:
 * - Opacity based on weight (higher weight = more opaque)
 * - Size variation (larger for higher weights)
 * - Wrap layout for responsive display
 * - Tooltip showing exact weight on hover
 *
 * @param words - Array of [word, weight] tuples
 * @param maxWords - Maximum number of words to display (default: 10)
 */
export const TopicKeywords: React.FC<TopicKeywordsProps> = ({
  words,
  maxWords = 10,
}) => {
  // Sort by weight descending and limit to maxWords
  const sortedWords = [...words]
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxWords);

  // Calculate max weight for normalization
  const maxWeight = Math.max(...sortedWords.map((w) => w[1]), 1);

  // Helper function to calculate opacity based on weight
  const getOpacity = (weight: number): number => {
    return Math.max(0.4, weight / maxWeight);
  };

  // Helper function to calculate size class based on weight
  const getSizeClass = (weight: number): string => {
    const normalized = weight / maxWeight;
    if (normalized > 0.75) {
      return 'text-sm px-3 py-1.5';
    } else if (normalized > 0.5) {
      return 'text-xs px-2.5 py-1';
    } else {
      return 'text-xs px-2 py-0.5';
    }
  };

  // Helper function to format weight for display
  const formatWeight = (weight: number): string => {
    return weight.toFixed(3);
  };

  return (
    <TooltipProvider>
      <div className="flex flex-wrap gap-2">
        {sortedWords.map(([word, weight]) => {
          const opacity = getOpacity(weight);
          const sizeClass = getSizeClass(weight);

          return (
            <Tooltip key={`${word}-${weight}`}>
              <TooltipTrigger asChild>
                <Badge
                  variant="secondary"
                  className={`
                    ${sizeClass}
                    cursor-help
                    transition-opacity
                    hover:opacity-100
                    font-medium
                  `}
                  style={{
                    opacity: opacity,
                  }}
                >
                  {word}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs">
                  <div className="font-semibold">{word}</div>
                  <div className="text-muted-foreground">
                    Weight: {formatWeight(weight)}
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
};

export default TopicKeywords;
