import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataSelector } from "@/components/modeling/DataSelector";
import { AlgorithmConfig } from "@/components/modeling/AlgorithmConfig";
import { ModelingProgress } from "@/components/modeling/ModelingProgress";
import { ResultsOverview } from "@/components/modeling/ResultsOverview";
import { TopicDistributionChart } from "@/components/modeling/TopicDistributionChart";
import { TopicsList } from "@/components/modeling/TopicsList";
import { TopicDetailPanel } from "@/components/modeling/TopicDetailPanel";
import { useModeling } from "@/hooks/useModeling";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, ArrowLeft, ChevronRight } from "lucide-react";
import type { Algorithm, ModelingParams, ModelingRunRequest, Topic } from "@/types";

type Step = "select" | "configure" | "running" | "results";

export function ModelingPage() {
  // Step management
  const [currentStep, setCurrentStep] = useState<Step>("select");

  // Data selection
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);

  // Modeling state
  const { runModeling, result, error, currentJobId } = useModeling();

  // Topic detail panel
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

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
    } catch (err) {
      // Error is handled by hook, stay on running step to show error
    }
  };

  const handleNewAnalysis = () => {
    setCurrentStep("select");
    setSelectedChannels([]);
    setSelectedTopic(null);
    setIsDetailOpen(false);
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Topic Modeling"
        description="Discover and analyze topics in YouTube comments"
      />

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

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
          {/* New Analysis Button */}
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">Analysis Results</h2>
            <Button onClick={handleNewAnalysis} variant="outline">
              New Analysis
            </Button>
          </div>

          {/* Results Overview Stats */}
          <ResultsOverview result={result} />

          <Separator />

          {/* Topic Distribution Chart */}
          <TopicDistributionChart topics={result.topics} />

          <Separator />

          {/* Topics List and Detail Panel */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Discovered Topics</h3>
            <TopicsList
              topics={result.topics}
              onSelectTopic={handleSelectTopic}
              selectedTopicId={selectedTopic?.id}
            />
          </div>

          {/* Topic Detail Sheet */}
          <TopicDetailPanel
            topic={selectedTopic}
            open={isDetailOpen}
            onClose={handleCloseDetail}
          />
        </div>
      )}
    </div>
  );
}
