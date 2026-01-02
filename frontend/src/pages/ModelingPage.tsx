import { useState, lazy, Suspense, useMemo } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataSelector } from "@/components/modeling/DataSelector";
import { AlgorithmConfig } from "@/components/modeling/AlgorithmConfig";
import { ModelingProgress } from "@/components/modeling/ModelingProgress";
import { ResultsOverview } from "@/components/modeling/ResultsOverview";
import { TopicDistributionChart } from "@/components/modeling/TopicDistributionChart";
import { TopicsList } from "@/components/modeling/TopicsList";
import { TopicDetailPanel } from "@/components/modeling/TopicDetailPanel";
import { JobHistory } from "@/components/modeling/JobHistory";
import { JobComparison } from "@/components/modeling/JobComparison";
import { ExportButton } from "@/components/modeling/ExportButton";
import { useModeling } from "@/hooks/useModeling";
import { useEnhancedAnalysis } from "@/hooks/useEnhancedAnalysis";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { VisualizationLoader } from "@/components/ui/visualization-loader";
import { AlertCircle, ArrowLeft, ChevronRight, BarChart3, History, GitCompare } from "lucide-react";
import type { Algorithm, ModelingParams, ModelingRunRequest, Topic, ModelingJob } from "@/types";

// Lazy load visualizations for better performance
const PreprocessingStats = lazy(() =>
  import("@/components/modeling/visualizations").then((m) => ({ default: m.PreprocessingStats }))
);
const WordCloudVisualization = lazy(() =>
  import("@/components/modeling/visualizations").then((m) => ({ default: m.WordCloudVisualization }))
);
const TopicHeatmap = lazy(() =>
  import("@/components/modeling/visualizations").then((m) => ({ default: m.TopicHeatmap }))
);
const CoherenceScores = lazy(() =>
  import("@/components/modeling/visualizations").then((m) => ({ default: m.CoherenceScores }))
);
const TopicEvolutionTimeline = lazy(() =>
  import("@/components/modeling/visualizations").then((m) => ({ default: m.TopicEvolutionTimeline }))
);
const InterTopicDistance = lazy(() =>
  import("@/components/modeling/visualizations").then((m) => ({ default: m.InterTopicDistance }))
);
const SentimentAnalysis = lazy(() =>
  import("@/components/modeling/visualizations").then((m) => ({ default: m.SentimentAnalysis }))
);

// Import data adapters
import {
  transformTopicsToWordCloud,
  transformToHeatmap,
  transformSentimentData,
  transformCoherenceData,
  transformInterTopicDistance,
  transformToTimeline,
} from "@/lib/visualization-adapters";

type Step = "select" | "configure" | "running" | "results";
type ViewMode = "new" | "history" | "comparison";

export function ModelingPage() {
  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>("new");

  // Step management
  const [currentStep, setCurrentStep] = useState<Step>("select");

  // Data selection
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);

  // Modeling state
  const { runModeling, result, error, currentJobId, getResults } = useModeling();

  // Enhanced analysis
  const { data: enhancedData, isLoading: isLoadingEnhanced } = useEnhancedAnalysis(currentJobId);

  // Topic detail panel
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Job comparison
  const [comparisonJobIds, setComparisonJobIds] = useState<string[]>([]);

  // Memoize transformed data to prevent unnecessary recalculations
  const wordCloudData = useMemo(
    () => result ? transformTopicsToWordCloud(result.topics) : [],
    [result]
  );

  const heatmapData = useMemo(
    () => result ? transformToHeatmap(result.document_topics, result.topics) : null,
    [result]
  );

  const sentimentData = useMemo(
    () => enhancedData?.sentiment && result ? transformSentimentData(enhancedData.sentiment, result.topics) : [],
    [enhancedData?.sentiment, result]
  );

  const coherenceData = useMemo(
    () => enhancedData?.coherence ? transformCoherenceData(enhancedData.coherence) : null,
    [enhancedData?.coherence]
  );

  const distanceData = useMemo(
    () => enhancedData?.inter_topic_distances && result
      ? transformInterTopicDistance(enhancedData.inter_topic_distances, result.topics)
      : null,
    [enhancedData?.inter_topic_distances, result]
  );

  const timelineData = useMemo(
    () => result?.metadata
      ? transformToTimeline(result.document_topics, result.metadata, result.topics)
      : null,
    [result]
  );

  // Navigation handlers
  const handleConfigure = () => {
    if (selectedChannels.length === 0) return;
    setCurrentStep("configure");
  };

  const handleBackToSelect = () => {
    setCurrentStep("select");
  };

  const handleRun = async (algorithm: Algorithm, params: ModelingParams) => {
    const request: ModelingRunRequest = {
      channels: selectedChannels,
      algorithm,
      params,
    };

    setCurrentStep("running");

    try {
      await runModeling(request);
      setCurrentStep("results");
      setViewMode("new");
    } catch (err) {
      // Error is handled by hook, stay on running step to show error
    }
  };

  const handleNewAnalysis = () => {
    setCurrentStep("select");
    setSelectedChannels([]);
    setSelectedTopic(null);
    setIsDetailOpen(false);
    setViewMode("new");
  };

  const handleSelectTopic = (topicId: number) => {
    const topic = result?.topics.find(t => t.id === topicId) || null;
    setSelectedTopic(topic);
    setIsDetailOpen(true);
  };

  const handleCloseDetail = () => {
    setSelectedTopic(null);
    setIsDetailOpen(false);
  };

  const handleSelectJobFromHistory = async (jobId: string) => {
    try {
      await getResults(jobId);
      setCurrentStep("results");
      setViewMode("new");
    } catch (err) {
      console.error("Failed to load job:", err);
    }
  };

  const handleRerunJob = (job: ModelingJob) => {
    setSelectedChannels(job.channels);
    setCurrentStep("configure");
    setViewMode("new");
  };

  const handleAddToComparison = (jobId: string) => {
    if (!comparisonJobIds.includes(jobId)) {
      setComparisonJobIds([...comparisonJobIds, jobId]);
    }
  };

  const handleRemoveFromComparison = (jobId: string) => {
    setComparisonJobIds(comparisonJobIds.filter(id => id !== jobId));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Topic Modeling"
        description="Discover and analyze topics in YouTube comments"
      />

      {/* View Mode Tabs */}
      <Card>
        <CardContent className="pt-6">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="new">
                <BarChart3 className="mr-2 h-4 w-4" />
                New Analysis
              </TabsTrigger>
              <TabsTrigger value="history">
                <History className="mr-2 h-4 w-4" />
                Job History
              </TabsTrigger>
              <TabsTrigger value="comparison">
                <GitCompare className="mr-2 h-4 w-4" />
                Compare Jobs
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* New Analysis View */}
      {viewMode === "new" && (
        <>
          {/* Step 1: Data Selection */}
          {currentStep === "select" && (
            <div className="space-y-6">
              <DataSelector
                selectedChannels={selectedChannels}
                onChannelsChange={setSelectedChannels}
              />

              <div className="flex justify-end">
                <Button
                  onClick={handleConfigure}
                  disabled={selectedChannels.length === 0}
                  size="lg"
                >
                  Configure Algorithm
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Algorithm Configuration */}
          {currentStep === "configure" && (
            <div className="space-y-6">
              <Button
                variant="ghost"
                onClick={handleBackToSelect}
                className="mb-4"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Data Selection
              </Button>

              <AlgorithmConfig onRun={handleRun} />
            </div>
          )}

          {/* Step 3: Running Progress */}
          {currentStep === "running" && currentJobId && (
            <div className="space-y-6">
              <ModelingProgress jobId={currentJobId} />
            </div>
          )}

          {/* Step 4: Results Dashboard */}
          {currentStep === "results" && result && (
            <div className="space-y-6">
              {/* Header with Actions */}
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-semibold">Analysis Results</h2>
                <div className="flex gap-2">
                  <ExportButton jobId={result.job_id} />
                  <Button
                    variant="outline"
                    onClick={() => handleAddToComparison(result.job_id)}
                  >
                    <GitCompare className="mr-2 h-4 w-4" />
                    Add to Comparison
                  </Button>
                  <Button onClick={handleNewAnalysis} variant="outline">
                    New Analysis
                  </Button>
                </div>
              </div>

              {/* Results Overview Stats */}
              <ResultsOverview result={result} />

              <Separator />

              {/* Tabbed Visualizations */}
              <Tabs defaultValue="topics" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="topics">Topics</TabsTrigger>
                  <TabsTrigger value="preprocessing">Preprocessing</TabsTrigger>
                  <TabsTrigger value="analysis">Analysis</TabsTrigger>
                  <TabsTrigger value="visualizations">Visualizations</TabsTrigger>
                </TabsList>

                {/* Topics Tab */}
                <TabsContent value="topics" className="space-y-6">
                  <TopicDistributionChart topics={result.topics} />

                  <Separator />

                  <div>
                    <h3 className="text-lg font-semibold mb-4">Discovered Topics</h3>
                    <TopicsList
                      topics={result.topics}
                      onSelectTopic={handleSelectTopic}
                      selectedTopicId={selectedTopic?.id}
                    />
                  </div>

                  <Separator />

                  {/* Word Clouds */}
                  <Suspense fallback={<VisualizationLoader />}>
                    <WordCloudVisualization
                      topics={wordCloudData}
                      loading={false}
                    />
                  </Suspense>
                </TabsContent>

                {/* Preprocessing Tab */}
                <TabsContent value="preprocessing" className="space-y-6">
                  <Suspense fallback={<VisualizationLoader />}>
                    <PreprocessingStats
                      stats={{
                        original_documents: result.preprocessing_stats.original_comments,
                        processed_documents: result.preprocessing_stats.valid_comments,
                        avg_length_original: result.preprocessing_stats.average_length_original,
                        avg_length_processed: result.preprocessing_stats.average_length_processed,
                        total_vocabulary: result.preprocessing_stats.total_vocabulary,
                        language_distribution: result.preprocessing_stats.language_distribution,
                      }}
                      loading={false}
                    />
                  </Suspense>
                </TabsContent>

                {/* Analysis Tab */}
                <TabsContent value="analysis" className="space-y-6">
                  {/* Coherence Scores */}
                  {coherenceData && (
                    <Suspense fallback={<VisualizationLoader />}>
                      <CoherenceScores
                        coherence={coherenceData}
                        loading={isLoadingEnhanced}
                      />
                    </Suspense>
                  )}

                  {!coherenceData && !isLoadingEnhanced && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Coherence scores not available for this job.
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Sentiment Analysis */}
                  {sentimentData.length > 0 && (
                    <Suspense fallback={<VisualizationLoader />}>
                      <SentimentAnalysis
                        sentiments={sentimentData}
                        loading={isLoadingEnhanced}
                      />
                    </Suspense>
                  )}
                </TabsContent>

                {/* Visualizations Tab */}
                <TabsContent value="visualizations" className="space-y-6">
                  {/* Topic Heatmap */}
                  {heatmapData && (
                    <Suspense fallback={<VisualizationLoader />}>
                      <TopicHeatmap
                        data={heatmapData}
                        loading={false}
                      />
                    </Suspense>
                  )}

                  <Separator />

                  {/* Inter-Topic Distance */}
                  {distanceData && (
                    <Suspense fallback={<VisualizationLoader />}>
                      <InterTopicDistance
                        data={distanceData}
                        loading={isLoadingEnhanced}
                      />
                    </Suspense>
                  )}

                  <Separator />

                  {/* Topic Evolution Timeline */}
                  {timelineData && (
                    <Suspense fallback={<VisualizationLoader />}>
                      <TopicEvolutionTimeline
                        data={timelineData}
                        loading={false}
                      />
                    </Suspense>
                  )}
                </TabsContent>
              </Tabs>

              {/* Topic Detail Sheet */}
              <TopicDetailPanel
                topic={selectedTopic}
                open={isDetailOpen}
                onClose={handleCloseDetail}
              />
            </div>
          )}
        </>
      )}

      {/* Job History View */}
      {viewMode === "history" && (
        <JobHistory
          onSelectJob={handleSelectJobFromHistory}
          onRerunJob={handleRerunJob}
        />
      )}

      {/* Job Comparison View */}
      {viewMode === "comparison" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">Job Comparison</h2>
            <Button
              variant="outline"
              onClick={() => setComparisonJobIds([])}
              disabled={comparisonJobIds.length === 0}
            >
              Clear All
            </Button>
          </div>

          <JobComparison
            jobIds={comparisonJobIds}
            onRemoveJob={handleRemoveFromComparison}
          />

          {comparisonJobIds.length === 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Go to Job History and select jobs to compare them here.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}
    </div>
  );
}
