/**
 * ChannelDetail Component
 *
 * Displays detailed channel information with Plotly visualizations.
 * Features:
 * - Channel header with name, subscribers, and description
 * - Bar chart: Comments per video (top 20 videos by comment count)
 * - Timeline chart: Comments over time
 * - Scrollable video list with expandable comments preview
 * - Dark theme for charts
 * - Skeleton loading state
 */

import { useState } from 'react';
import Plot from 'react-plotly.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useChannelDetail } from '@/hooks';
import type { VideoWithComments } from '@/types';
import { ArrowLeft, ChevronDown, ChevronUp, MessageSquare, ThumbsUp, User } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface ChannelDetailProps {
  folder: string | null;
  onClose: () => void;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format large numbers with K/M suffixes
 */
function formatNumber(num: number | null): string {
  if (num === null) return 'N/A';
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
}

/**
 * Convert timestamp to readable date
 */
function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Get relative time from timestamp
 */
function getRelativeTime(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

// ============================================================================
// Skeleton Component
// ============================================================================

function ChannelDetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-8 w-[300px]" />
              <Skeleton className="h-4 w-[200px]" />
              <Skeleton className="h-16 w-full" />
            </div>
            <Skeleton className="h-10 w-24" />
          </div>
        </CardHeader>
      </Card>

      {/* Charts Skeleton */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-[200px]" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[400px] w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-[200px]" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[400px] w-full" />
          </CardContent>
        </Card>
      </div>

      {/* Videos List Skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-[150px]" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-[100px]" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// Video Item Component
// ============================================================================

interface VideoItemProps {
  video: VideoWithComments;
}

function VideoItem({ video }: VideoItemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const previewComments = video.comments.slice(0, 5);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="rounded-lg border p-4 hover:bg-muted/50 transition-colors">
        <CollapsibleTrigger asChild>
          <div className="flex items-start justify-between cursor-pointer">
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-medium leading-none">{video.title}</h4>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  {video.comment_count.toLocaleString()} comments
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="font-mono">
                {formatNumber(video.comment_count)}
              </Badge>
              {isOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent className="mt-4">
          <Separator className="mb-4" />
          <div className="space-y-3">
            <h5 className="text-xs font-semibold text-muted-foreground uppercase">
              Top Comments ({previewComments.length})
            </h5>
            {previewComments.map((comment, idx) => (
              <div key={idx} className="rounded-md bg-muted/30 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs">
                    <User className="h-3 w-3 text-muted-foreground" />
                    <span className="font-medium">{comment.author}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <ThumbsUp className="h-3 w-3" />
                    <span>{comment.likes.toLocaleString()}</span>
                  </div>
                </div>
                <p className="text-xs text-foreground/90 line-clamp-3">{comment.text}</p>
                <div className="text-xs text-muted-foreground">
                  {formatDate(comment.timestamp)}
                </div>
              </div>
            ))}
            {video.comments.length > 5 && (
              <p className="text-xs text-muted-foreground text-center">
                + {video.comments.length - 5} more comments
              </p>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ChannelDetail({ folder, onClose }: ChannelDetailProps) {
  const { detail, loading, error } = useChannelDetail(folder);

  // ============================================================================
  // Prepare Chart Data
  // ============================================================================

  const commentsPerVideoData = detail
    ? (() => {
        // Sort videos by comment count and take top 20
        const sortedVideos = [...detail.videos]
          .sort((a, b) => b.comment_count - a.comment_count)
          .slice(0, 20);

        return {
          x: sortedVideos.map((v) => v.comment_count),
          y: sortedVideos.map((v) => {
            // Truncate long titles
            const title = v.title.length > 50 ? v.title.substring(0, 47) + '...' : v.title;
            return title;
          }),
          type: 'bar' as const,
          orientation: 'h' as const,
          marker: {
            color: '#8b5cf6',
            line: {
              color: '#6d28d9',
              width: 1,
            },
          },
          hovertemplate: '<b>%{y}</b><br>Comments: %{x:,}<extra></extra>',
        };
      })()
    : null;

  const commentsOverTimeData = detail
    ? (() => {
        // Aggregate comments by date
        const dateMap = new Map<string, number>();

        detail.videos.forEach((video) => {
          video.comments.forEach((comment) => {
            const date = new Date(comment.timestamp * 1000).toISOString().split('T')[0];
            dateMap.set(date, (dateMap.get(date) || 0) + 1);
          });
        });

        // Sort by date
        const sortedDates = Array.from(dateMap.entries())
          .sort((a, b) => a[0].localeCompare(b[0]));

        return {
          x: sortedDates.map((d) => d[0]),
          y: sortedDates.map((d) => d[1]),
          type: 'scatter' as const,
          mode: 'lines+markers' as const,
          line: {
            color: '#8b5cf6',
            width: 2,
          },
          marker: {
            color: '#8b5cf6',
            size: 6,
          },
          hovertemplate: '<b>%{x}</b><br>Comments: %{y:,}<extra></extra>',
        };
      })()
    : null;

  const plotlyLayout = {
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
    font: {
      color: 'hsl(var(--foreground))',
      family: 'Inter, system-ui, sans-serif',
    },
    margin: { t: 20, r: 20, b: 60, l: 200 },
    xaxis: {
      gridcolor: 'hsl(var(--border))',
      zerolinecolor: 'hsl(var(--border))',
    },
    yaxis: {
      gridcolor: 'hsl(var(--border))',
      zerolinecolor: 'hsl(var(--border))',
    },
    hoverlabel: {
      bgcolor: 'hsl(var(--popover))',
      bordercolor: 'hsl(var(--border))',
      font: {
        color: 'hsl(var(--popover-foreground))',
      },
    },
  };

  const timelineLayout = {
    ...plotlyLayout,
    margin: { t: 20, r: 20, b: 60, l: 60 },
    xaxis: {
      ...plotlyLayout.xaxis,
      title: { text: 'Date' },
    },
    yaxis: {
      ...plotlyLayout.yaxis,
      title: { text: 'Number of Comments' },
    },
  };

  const plotlyConfig = {
    displayModeBar: false,
    responsive: true,
  };

  // ============================================================================
  // Render States
  // ============================================================================

  if (loading) {
    return <ChannelDetailSkeleton />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Error Loading Channel</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={onClose} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Channels
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!detail) {
    return null;
  }

  // ============================================================================
  // Main Render
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <CardTitle className="text-2xl">{detail.channel_name}</CardTitle>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{formatNumber(detail.subscriber_count)} subscribers</span>
                <Separator orientation="vertical" className="h-4" />
                <span>{detail.total_videos.toLocaleString()} videos</span>
                <Separator orientation="vertical" className="h-4" />
                <span>{formatNumber(detail.total_comments)} comments</span>
              </div>
              {detail.description && (
                <CardDescription className="mt-3 line-clamp-3">
                  {detail.description}
                </CardDescription>
              )}
              <div className="text-xs text-muted-foreground mt-2">
                Last updated: {getRelativeTime(detail.last_updated)}
              </div>
            </div>
            <Button onClick={onClose} variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Comments per Video Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top Videos by Comments</CardTitle>
            <CardDescription>Top 20 videos with most comments</CardDescription>
          </CardHeader>
          <CardContent>
            {commentsPerVideoData && (
              <Plot
                data={[commentsPerVideoData]}
                layout={plotlyLayout}
                config={plotlyConfig}
                className="w-full"
                style={{ width: '100%', height: '400px' }}
              />
            )}
          </CardContent>
        </Card>

        {/* Comments Over Time Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Comments Timeline</CardTitle>
            <CardDescription>Comment activity over time</CardDescription>
          </CardHeader>
          <CardContent>
            {commentsOverTimeData && (
              <Plot
                data={[commentsOverTimeData]}
                layout={timelineLayout}
                config={plotlyConfig}
                className="w-full"
                style={{ width: '100%', height: '400px' }}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Videos List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All Videos ({detail.videos.length})</CardTitle>
          <CardDescription>Click on a video to preview top comments</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-4">
              {detail.videos
                .sort((a, b) => b.comment_count - a.comment_count)
                .map((video) => (
                  <VideoItem key={video.video_id} video={video} />
                ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
