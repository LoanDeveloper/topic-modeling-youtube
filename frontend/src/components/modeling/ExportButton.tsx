/**
 * ExportButton Component
 *
 * Dropdown button for exporting modeling results in various formats (JSON, CSV, Excel).
 *
 * @example
 * ```typescript
 * <ExportButton jobId="job-123" />
 * ```
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileJson, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { saveAs } from 'file-saver';

interface ExportButtonProps {
  jobId: string;
}

export function ExportButton({ jobId }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<string | null>(null);

  const handleExport = async (format: 'json' | 'csv' | 'excel') => {
    setIsExporting(true);
    setExportingFormat(format);

    try {
      const blob = await api.modelingExport(jobId, format);

      // Generate filename
      const timestamp = new Date().toISOString().split('T')[0];
      const extension = format === 'excel' ? 'xlsx' : format;
      const filename = `topic-modeling-${jobId.slice(0, 8)}-${timestamp}.${extension}`;

      // Trigger download
      saveAs(blob, filename);
    } catch (err) {
      console.error(`Failed to export as ${format}:`, err);
      alert(`Export failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsExporting(false);
      setExportingFormat(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isExporting}>
          {isExporting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Exporting {exportingFormat}...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Export Results
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport('json')}>
          <FileJson className="mr-2 h-4 w-4" />
          Export as JSON
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('csv')}>
          <FileText className="mr-2 h-4 w-4" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('excel')}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Export as Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
