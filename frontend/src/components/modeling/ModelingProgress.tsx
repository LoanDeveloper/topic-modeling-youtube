import React, { useMemo } from 'react';
import { CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useModeling } from '@/hooks';
import type { ModelingStage } from '@/types';
import { cn } from '@/lib/utils';

interface ModelingProgressProps {
  jobId: string;
}

/**
 * Stage configuration with colors and labels
 */
const STAGES: Record<ModelingStage, { label: string; order: number }> = {
  idle: { label: 'Idle', order: 0 },
  loading: { label: 'Loading Data', order: 1 },
  preprocessing: { label: 'Preprocessing', order: 2 },
  training: { label: 'Training Model', order: 3 },
  finalizing: { label: 'Finalizing', order: 4 },
};

/**
 * Get color class for a stage based on its status
 */
function getStageColorClass(
  _stage: ModelingStage,
  isCompleted: boolean,
  isCurrent: boolean
): string {
  if (isCompleted) {
    return 'bg-green-100 dark:bg-green-900 text-green-900 dark:text-green-100 border-green-300 dark:border-green-700';
  }
  if (isCurrent) {
    return 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100 border-blue-300 dark:border-blue-700 animate-pulse';
  }
  return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-700';
}

/**
 * Get background color for stage indicator
 */
function getStageBgColor(
  _stage: ModelingStage,
  isCompleted: boolean,
  isCurrent: boolean
): string {
  if (isCompleted) {
    return 'bg-green-500';
  }
  if (isCurrent) {
    return 'bg-blue-500 animate-pulse';
  }
  return 'bg-gray-300 dark:bg-gray-600';
}

/**
 * Stage Badge Component
 */
interface StageBadgeProps {
  stage: ModelingStage;
  isCompleted: boolean;
  isCurrent: boolean;
}

const StageBadge: React.FC<StageBadgeProps> = ({ stage, isCompleted, isCurrent }) => {
  const colorClass = getStageColorClass(stage, isCompleted, isCurrent);
  const bgColor = getStageBgColor(stage, isCompleted, isCurrent);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className={cn('flex h-10 w-10 items-center justify-center rounded-full', bgColor)}>
        {isCompleted ? (
          <CheckCircle2 className="h-6 w-6 text-white" />
        ) : (
          <span className="text-sm font-semibold text-white">
            {STAGES[stage].order}
          </span>
        )}
      </div>
      <Badge variant="outline" className={colorClass}>
        {STAGES[stage].label}
      </Badge>
    </div>
  );
};

/**
 * Progress stage visualization component
 */
interface StagesVisualizationProps {
  currentStage?: string;
  status: 'queued' | 'running' | 'completed' | 'error';
}

const StagesVisualization: React.FC<StagesVisualizationProps> = ({
  currentStage,
  status,
}) => {
  const stageList = Object.keys(STAGES) as ModelingStage[];

  // Determine which stages are completed based on current stage
  const getStageStatus = (stage: ModelingStage) => {
    const currentIndex = currentStage ? (STAGES[currentStage as ModelingStage]?.order ?? 0) : 0;
    const stageIndex = STAGES[stage].order;

    if (status === 'completed') {
      return { isCompleted: true, isCurrent: false };
    }

    if (status === 'error') {
      return { isCompleted: stageIndex < currentIndex, isCurrent: stage === currentStage };
    }

    if (status === 'running') {
      return { isCompleted: stageIndex < currentIndex, isCurrent: stage === currentStage };
    }

    // queued status
    return { isCompleted: false, isCurrent: stage === 'idle' };
  };

  return (
    <div className="flex items-center justify-between gap-2 py-6">
      {stageList.map((stage, idx) => (
        <React.Fragment key={stage}>
          <StageBadge
            stage={stage}
            isCompleted={getStageStatus(stage).isCompleted}
            isCurrent={getStageStatus(stage).isCurrent}
          />
          {idx < stageList.length - 1 && (
            <div className="flex-1">
              <div
                className={cn(
                  'h-1 rounded-full',
                  getStageStatus(stage).isCompleted
                    ? 'bg-green-500'
                    : 'bg-gray-300 dark:bg-gray-600'
                )}
              />
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

/**
 * ModelingProgress Component
 *
 * Displays real-time progress for a modeling job including:
 * - Overall progress bar (0-100%)
 * - Stage visualization with badges
 * - Current stage highlighting
 * - Status messages
 * - Error alerts if job fails
 *
 * Auto-refreshes via polling when job is running.
 *
 * @example
 * ```tsx
 * <ModelingProgress jobId="model-job-123" />
 * ```
 */
export const ModelingProgress: React.FC<ModelingProgressProps> = ({ jobId }) => {
  const { status, error } = useModeling(jobId);

  // Parse stage from message or status
  const currentStage = useMemo<ModelingStage>(() => {
    if (!status) return 'idle';

    const stage = status.stage?.toLowerCase();
    if (stage && Object.keys(STAGES).includes(stage)) {
      return stage as ModelingStage;
    }

    // Infer stage from job status
    if (status.status === 'queued') return 'idle';
    if (status.status === 'completed') return 'finalizing';
    if (status.status === 'error') return (stage as ModelingStage) || 'preprocessing';

    // Default to preprocessing for running jobs
    return 'preprocessing';
  }, [status]);

  // Calculate visual progress based on stage
  const visualProgress = useMemo(() => {
    const stageOrder = STAGES[currentStage]?.order ?? 0;
    const totalStages = Object.keys(STAGES).length;
    const baseProgress = (stageOrder / (totalStages - 1)) * 100;

    if (!status) return baseProgress;

    // Use reported progress if available and job is running
    if (status.status === 'running' && status.progress) {
      // Map reported progress (0-100) to current stage range
      const stageLower = (stageOrder / totalStages) * 100;
      const stageUpper = ((stageOrder + 1) / totalStages) * 100;
      return stageLower + ((stageUpper - stageLower) * status.progress) / 100;
    }

    if (status.status === 'completed') return 100;
    if (status.status === 'error') return baseProgress;

    return baseProgress;
  }, [currentStage, status]);

  // Determine status badge
  const getStatusBadge = () => {
    if (!status) return null;

    switch (status.status) {
      case 'completed':
        return (
          <Badge variant="outline" className="bg-green-50 dark:bg-green-900 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700">
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Completed
          </Badge>
        );
      case 'running':
        return (
          <Badge
            variant="outline"
            className="bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700 animate-pulse"
          >
            <Clock className="mr-2 h-4 w-4" />
            Running
          </Badge>
        );
      case 'queued':
        return (
          <Badge variant="outline">
            <Clock className="mr-2 h-4 w-4" />
            Queued
          </Badge>
        );
      case 'error':
        return (
          <Badge
            variant="outline"
            className="bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700"
          >
            <AlertCircle className="mr-2 h-4 w-4" />
            Error
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Job Progress</CardTitle>
            <CardDescription className="mt-2">
              Job ID: <code className="rounded bg-muted px-2 py-1 text-xs">{jobId}</code>
            </CardDescription>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Overall Progress</span>
            <span className="text-muted-foreground">
              {Math.round(visualProgress)}%
            </span>
          </div>
          <Progress value={visualProgress} className="h-3" />
        </div>

        {/* Stages Visualization */}
        <div className="rounded-lg border border-muted bg-muted/30 p-4">
          <h3 className="mb-4 text-sm font-semibold">Processing Stages</h3>
          <StagesVisualization currentStage={currentStage} status={status?.status || 'queued'} />
        </div>

        {/* Status Message */}
        {status?.message && (
          <div className="rounded-lg border border-muted bg-muted/50 p-3">
            <p className="text-sm text-muted-foreground">{status.message}</p>
          </div>
        )}

        {/* Channels Info */}
        {status?.channels && status.channels.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Processing Channels</p>
            <div className="flex flex-wrap gap-2">
              {status.channels.map((channel) => (
                <Badge key={channel} variant="secondary">
                  {channel}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Error Alert */}
        {(error || (status?.status === 'error' && status.message)) && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error || status?.message || 'An error occurred during processing'}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default ModelingProgress;
