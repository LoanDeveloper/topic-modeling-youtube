/**
 * ChannelTable Component
 *
 * Displays all extracted channels in a sortable table with formatted statistics.
 * Features:
 * - Sortable columns (click header to sort)
 * - Formatted numbers (1.2K, 1.5M)
 * - Relative timestamps (2 days ago)
 * - Hover effects on rows
 * - Skeleton loading state
 * - Empty state
 */

import { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useChannels } from '@/hooks';
import type { ChannelStats } from '@/types';
import { ArrowUpDown, Eye, ChevronUp, ChevronDown } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface ChannelTableProps {
  onSelectChannel: (folder: string) => void;
}

type SortField = 'channel_name' | 'video_count' | 'comment_count' | 'subscriber_count' | 'last_updated';
type SortDirection = 'asc' | 'desc';

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format large numbers with K/M suffixes
 * @example formatNumber(1234) => "1.2K"
 * @example formatNumber(1234567) => "1.2M"
 */
function formatNumber(num: number | null): string {
  if (num === null) return 'N/A';

  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`;
  }
  return num.toString();
}

/**
 * Convert timestamp to relative time
 * @example getRelativeTime("2024-01-15T10:30:00") => "2 days ago"
 */
function getRelativeTime(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  if (diffDays < 30) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  if (diffMonths < 12) return `${diffMonths} month${diffMonths === 1 ? '' : 's'} ago`;
  return `${diffYears} year${diffYears === 1 ? '' : 's'} ago`;
}

/**
 * Sort channels by specified field and direction
 */
function sortChannels(
  channels: ChannelStats[],
  field: SortField,
  direction: SortDirection
): ChannelStats[] {
  return [...channels].sort((a, b) => {
    let aVal: any = a[field];
    let bVal: any = b[field];

    // Handle null values (push to end)
    if (aVal === null || aVal === undefined) return 1;
    if (bVal === null || bVal === undefined) return -1;

    // Convert timestamps to comparable numbers
    if (field === 'last_updated') {
      aVal = new Date(aVal).getTime();
      bVal = new Date(bVal).getTime();
    }

    // String comparison
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return direction === 'asc'
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }

    // Numeric comparison
    if (direction === 'asc') {
      return aVal - bVal;
    } else {
      return bVal - aVal;
    }
  });
}

// ============================================================================
// Skeleton Component
// ============================================================================

function ChannelTableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4 p-4">
          <Skeleton className="h-4 w-[200px]" />
          <Skeleton className="h-4 w-[80px]" />
          <Skeleton className="h-4 w-[100px]" />
          <Skeleton className="h-4 w-[100px]" />
          <Skeleton className="h-4 w-[120px]" />
          <Skeleton className="h-8 w-[100px]" />
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Empty State Component
// ============================================================================

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-muted p-3 mb-4">
        <Eye className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">No channels found</h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        No extracted channel data available. Start by extracting comments from a YouTube channel
        in the Extraction tab.
      </p>
    </div>
  );
}

// ============================================================================
// Sortable Header Component
// ============================================================================

interface SortableHeaderProps {
  field: SortField;
  label: string;
  currentField: SortField;
  currentDirection: SortDirection;
  onSort: (field: SortField) => void;
}

function SortableHeader({
  field,
  label,
  currentField,
  currentDirection,
  onSort,
}: SortableHeaderProps) {
  const isActive = currentField === field;

  return (
    <TableHead>
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3 h-8 data-[state=open]:bg-accent"
        onClick={() => onSort(field)}
      >
        <span>{label}</span>
        {isActive ? (
          currentDirection === 'asc' ? (
            <ChevronUp className="ml-2 h-4 w-4" />
          ) : (
            <ChevronDown className="ml-2 h-4 w-4" />
          )
        ) : (
          <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
        )}
      </Button>
    </TableHead>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ChannelTable({ onSelectChannel }: ChannelTableProps) {
  const { channels, loading, error } = useChannels();
  const [sortField, setSortField] = useState<SortField>('last_updated');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  /**
   * Handle column sort
   */
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, default to descending (except for name)
      setSortField(field);
      setSortDirection(field === 'channel_name' ? 'asc' : 'desc');
    }
  };

  /**
   * Sorted channels (memoized)
   */
  const sortedChannels = useMemo(() => {
    return sortChannels(channels, sortField, sortDirection);
  }, [channels, sortField, sortDirection]);

  // ============================================================================
  // Render States
  // ============================================================================

  if (loading) {
    return <ChannelTableSkeleton />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-8">
        <Badge variant="destructive" className="text-sm">
          Error loading channels: {error}
        </Badge>
      </div>
    );
  }

  if (channels.length === 0) {
    return <EmptyState />;
  }

  // ============================================================================
  // Main Render
  // ============================================================================

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <SortableHeader
              field="channel_name"
              label="Channel Name"
              currentField={sortField}
              currentDirection={sortDirection}
              onSort={handleSort}
            />
            <SortableHeader
              field="video_count"
              label="Videos"
              currentField={sortField}
              currentDirection={sortDirection}
              onSort={handleSort}
            />
            <SortableHeader
              field="comment_count"
              label="Comments"
              currentField={sortField}
              currentDirection={sortDirection}
              onSort={handleSort}
            />
            <SortableHeader
              field="subscriber_count"
              label="Subscribers"
              currentField={sortField}
              currentDirection={sortDirection}
              onSort={handleSort}
            />
            <SortableHeader
              field="last_updated"
              label="Last Updated"
              currentField={sortField}
              currentDirection={sortDirection}
              onSort={handleSort}
            />
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedChannels.map((channel) => (
            <TableRow
              key={channel.folder}
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => onSelectChannel(channel.folder)}
            >
              <TableCell className="font-medium">
                <div className="flex flex-col">
                  <span>{channel.channel_name}</span>
                  <span className="text-xs text-muted-foreground">
                    {channel.folder}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="secondary" className="font-mono">
                  {channel.video_count.toLocaleString()}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="font-mono">
                  {formatNumber(channel.comment_count)}
                </Badge>
              </TableCell>
              <TableCell>
                <span className="text-sm text-muted-foreground font-mono">
                  {formatNumber(channel.subscriber_count)}
                </span>
              </TableCell>
              <TableCell>
                <span className="text-sm text-muted-foreground">
                  {getRelativeTime(channel.last_updated)}
                </span>
              </TableCell>
              <TableCell>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectChannel(channel.folder);
                  }}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
