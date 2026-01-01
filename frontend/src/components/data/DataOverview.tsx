import React from 'react';
import { Database, Video, MessageSquare, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useChannels } from '@/hooks';
import type { ChannelStats } from '@/types';

/**
 * Skeleton Loading Component
 */
const StatCardSkeleton = () => (
  <Card>
    <CardHeader className="pb-3">
      <div className="flex items-center justify-between">
        <div className="h-4 w-24 bg-muted rounded animate-pulse" />
        <div className="h-4 w-4 bg-muted rounded animate-pulse" />
      </div>
    </CardHeader>
    <CardContent>
      <div className="h-8 w-16 bg-muted rounded animate-pulse mb-2" />
      <div className="h-3 w-32 bg-muted rounded animate-pulse" />
    </CardContent>
  </Card>
);

/**
 * Stat Card Component
 */
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sublabel?: string;
  className?: string;
}

const StatCard = ({ icon, label, value, sublabel, className }: StatCardProps) => (
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
      <div className="text-3xl font-bold">{value}</div>
      {sublabel && (
        <p className="text-xs text-muted-foreground mt-1">{sublabel}</p>
      )}
    </CardContent>
  </Card>
);

/**
 * Format large numbers with K/M abbreviations
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
 * Format date to relative time (e.g., "2 days ago")
 */
function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  } catch {
    return 'Unknown';
  }
}

/**
 * Get most recent channel by last_updated timestamp
 */
function getMostRecentChannel(channels: ChannelStats[]): ChannelStats | null {
  if (channels.length === 0) return null;

  return channels.reduce((latest, current) => {
    const latestTime = new Date(latest.last_updated).getTime();
    const currentTime = new Date(current.last_updated).getTime();
    return currentTime > latestTime ? current : latest;
  });
}

/**
 * DataOverview Component
 * Displays aggregated statistics for all extracted channels
 *
 * Features:
 * - Grid of 4 stat cards: Total Channels, Total Videos, Total Comments, Last Updated
 * - Responsive layout: 1 col mobile, 2 cols tablet, 4 cols desktop
 * - Skeleton loading state
 * - Error handling with fallback display
 * - Formatted numbers with K/M abbreviations
 * - Relative time formatting for last updated
 */
export const DataOverview: React.FC = () => {
  const { channels, loading, error } = useChannels();

  // Calculate totals
  const totalChannels = channels.length;
  const totalVideos = channels.reduce((sum, ch) => sum + ch.video_count, 0);
  const totalComments = channels.reduce((sum, ch) => sum + ch.comment_count, 0);
  const mostRecent = getMostRecentChannel(channels);
  const lastUpdated = mostRecent ? formatRelativeTime(mostRecent.last_updated) : 'Never';

  // Loading state
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
        <p className="text-sm text-destructive">
          Failed to load data: {error}
        </p>
      </div>
    );
  }

  // Empty state
  if (channels.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8">
        <p className="text-center text-muted-foreground text-sm">
          No extracted data yet. Start by extracting comments from a YouTube channel.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Total Channels */}
      <StatCard
        icon={<Database className="h-4 w-4" />}
        label="Total Channels"
        value={totalChannels}
        sublabel={totalChannels === 1 ? 'channel' : 'channels'}
      />

      {/* Total Videos */}
      <StatCard
        icon={<Video className="h-4 w-4" />}
        label="Total Videos"
        value={formatNumber(totalVideos)}
        sublabel={`${totalVideos.toLocaleString()} video${totalVideos !== 1 ? 's' : ''}`}
      />

      {/* Total Comments */}
      <StatCard
        icon={<MessageSquare className="h-4 w-4" />}
        label="Total Comments"
        value={formatNumber(totalComments)}
        sublabel={`${totalComments.toLocaleString()} comment${totalComments !== 1 ? 's' : ''}`}
      />

      {/* Last Updated */}
      <StatCard
        icon={<Clock className="h-4 w-4" />}
        label="Last Updated"
        value={lastUpdated}
        sublabel={mostRecent ? `${mostRecent.channel_name}` : undefined}
      />
    </div>
  );
};

export default DataOverview;
