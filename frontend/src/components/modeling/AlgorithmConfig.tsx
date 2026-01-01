import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Play } from 'lucide-react';
import type { Algorithm, ModelingParams } from '@/types';

interface AlgorithmConfigProps {
  onRun: (algorithm: Algorithm, params: ModelingParams) => void;
  disabled?: boolean;
}

interface FormState {
  algorithm: Algorithm;
  numTopics: number;
  nGramRange: [number, number];
  language: string;
  maxIter: number;
  alpha: string;
  beta: string;
}

const DEFAULT_FORM_STATE: FormState = {
  algorithm: 'lda',
  numTopics: 10,
  nGramRange: [1, 1],
  language: 'auto',
  maxIter: 20,
  alpha: 'auto',
  beta: 'auto',
};

export function AlgorithmConfig({ onRun, disabled = false }: AlgorithmConfigProps) {
  const [formState, setFormState] = useState<FormState>(DEFAULT_FORM_STATE);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const handleAlgorithmChange = (algorithm: Algorithm) => {
    setFormState((prev) => ({
      ...prev,
      algorithm,
      maxIter: algorithm === 'lda' ? 20 : 200,
    }));
  };

  const handleNumTopicsChange = (value: number[]) => {
    setFormState((prev) => ({ ...prev, numTopics: value[0] }));
  };

  const handleNGramRangeChange = (value: string) => {
    const rangeMap: Record<string, [number, number]> = {
      '1-1': [1, 1],
      '1-2': [1, 2],
      '1-3': [1, 3],
    };
    setFormState((prev) => ({ ...prev, nGramRange: rangeMap[value] }));
  };

  const handleLanguageChange = (value: string) => {
    setFormState((prev) => ({ ...prev, language: value }));
  };

  const handleMaxIterChange = (value: number[]) => {
    setFormState((prev) => ({ ...prev, maxIter: value[0] }));
  };

  const handleAlphaChange = (value: string) => {
    setFormState((prev) => ({ ...prev, alpha: value }));
  };

  const handleBetaChange = (value: string) => {
    setFormState((prev) => ({ ...prev, beta: value }));
  };

  const handleRun = () => {
    const params: ModelingParams = {
      num_topics: formState.numTopics,
      n_gram_range: formState.nGramRange,
      max_iter: formState.maxIter,
      language: formState.language,
    };

    // Add algorithm-specific parameters if not auto
    if (formState.algorithm === 'lda') {
      if (formState.alpha !== 'auto') {
        (params as any).alpha = parseFloat(formState.alpha);
      }
      if (formState.beta !== 'auto') {
        (params as any).beta = parseFloat(formState.beta);
      }
    }

    onRun(formState.algorithm, params);
  };

  const nGramRangeValue = `${formState.nGramRange[0]}-${formState.nGramRange[1]}`;
  const maxIterRange = formState.algorithm === 'lda' ? { min: 5, max: 100, step: 5 } : { min: 50, max: 500, step: 50 };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Algorithm Configuration</CardTitle>
        <CardDescription>Configure topic modeling parameters and run the analysis</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Algorithm Selection */}
        <Tabs value={formState.algorithm} onValueChange={(value) => handleAlgorithmChange(value as Algorithm)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="lda">LDA</TabsTrigger>
            <TabsTrigger value="nmf">NMF</TabsTrigger>
          </TabsList>
          <TabsContent value="lda" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Latent Dirichlet Allocation (LDA) is a probabilistic model that discovers abstract topics in a collection of documents.
              It assumes documents are mixtures of topics, and topics are mixtures of words.
            </p>
          </TabsContent>
          <TabsContent value="nmf" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Non-negative Matrix Factorization (NMF) decomposes the document-term matrix into two lower-rank matrices.
              It often produces more interpretable topics with clearer word associations.
            </p>
          </TabsContent>
        </Tabs>

        {/* Number of Topics */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="num-topics">Number of Topics</Label>
            <span className="text-sm font-medium">{formState.numTopics}</span>
          </div>
          <Slider
            id="num-topics"
            min={5}
            max={50}
            step={1}
            value={[formState.numTopics]}
            onValueChange={handleNumTopicsChange}
            disabled={disabled}
          />
          <p className="text-xs text-muted-foreground">
            The number of latent topics to discover in the corpus. More topics provide finer granularity but may be harder to interpret.
          </p>
        </div>

        {/* N-gram Range */}
        <div className="space-y-3">
          <Label htmlFor="ngram-range">N-gram Range</Label>
          <Select value={nGramRangeValue} onValueChange={handleNGramRangeChange} disabled={disabled}>
            <SelectTrigger id="ngram-range">
              <SelectValue placeholder="Select n-gram range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1-1">Unigrams (1-1)</SelectItem>
              <SelectItem value="1-2">Unigrams + Bigrams (1-2)</SelectItem>
              <SelectItem value="1-3">Unigrams + Bigrams + Trigrams (1-3)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Controls whether to use single words, word pairs, or longer phrases. Higher ranges capture multi-word expressions but increase vocabulary size.
          </p>
        </div>

        {/* Language */}
        <div className="space-y-3">
          <Label htmlFor="language">Language</Label>
          <Select value={formState.language} onValueChange={handleLanguageChange} disabled={disabled}>
            <SelectTrigger id="language">
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Auto-detect</SelectItem>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="fr">French</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Language for stopword removal and text preprocessing. Auto-detect will attempt to identify the language automatically.
          </p>
        </div>

        {/* Advanced Parameters */}
        <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between" disabled={disabled}>
              <span className="font-medium">Advanced Parameters</span>
              {advancedOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-4">
            {/* Max Iterations */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="max-iter">Max Iterations</Label>
                <span className="text-sm font-medium">{formState.maxIter}</span>
              </div>
              <Slider
                id="max-iter"
                min={maxIterRange.min}
                max={maxIterRange.max}
                step={maxIterRange.step}
                value={[formState.maxIter]}
                onValueChange={handleMaxIterChange}
                disabled={disabled}
              />
              <p className="text-xs text-muted-foreground">
                Maximum number of training iterations. More iterations may improve convergence but increase computation time.
                Default: {formState.algorithm === 'lda' ? '20' : '200'}.
              </p>
            </div>

            {/* LDA-specific parameters */}
            {formState.algorithm === 'lda' && (
              <>
                <div className="space-y-3">
                  <Label htmlFor="alpha">Alpha (Document-Topic Prior)</Label>
                  <Select value={formState.alpha} onValueChange={handleAlphaChange} disabled={disabled}>
                    <SelectTrigger id="alpha">
                      <SelectValue placeholder="Select alpha" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto (1.0 / num_topics)</SelectItem>
                      <SelectItem value="0.01">Low (0.01) - Sparse</SelectItem>
                      <SelectItem value="0.1">Medium (0.1)</SelectItem>
                      <SelectItem value="1.0">High (1.0) - Dense</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Controls document-topic distribution. Lower values create sparser distributions (fewer topics per document).
                  </p>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="beta">Beta (Topic-Word Prior)</Label>
                  <Select value={formState.beta} onValueChange={handleBetaChange} disabled={disabled}>
                    <SelectTrigger id="beta">
                      <SelectValue placeholder="Select beta" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto (1.0 / num_topics)</SelectItem>
                      <SelectItem value="0.01">Low (0.01) - Sparse</SelectItem>
                      <SelectItem value="0.1">Medium (0.1)</SelectItem>
                      <SelectItem value="1.0">High (1.0) - Dense</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Controls topic-word distribution. Lower values create more specific topics (fewer words per topic).
                  </p>
                </div>
              </>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Run Button */}
        <Button onClick={handleRun} disabled={disabled} className="w-full" size="lg">
          <Play className="mr-2 h-4 w-4" />
          Run {formState.algorithm.toUpperCase()} Modeling
        </Button>
      </CardContent>
    </Card>
  );
}
