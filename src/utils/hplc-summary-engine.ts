import { HPLCExperiment } from "./hplc-experiment-builder";
import { ValidationResult } from "./hplc-validation-engine";

export interface ExperimentSummary {
  sampleCount: number;
  peakCount: number;
  qcCount: number;
  warningCount: number;
  errorCount: number;
  runDurationMinutes: number;
  instrument: string;
  method: string;
  generatedAt: string;
}

/**
 * Generates non-interpretive factual metadata summaries directly from structural experiment states.
 */
export function generateHPLCSummary(
  experiment: HPLCExperiment,
  validation: ValidationResult | null
): ExperimentSummary {
  const metadata = experiment.globalMetadata || {};

  // Find maximum timestamp/runtime value to state overall analytical session scale
  let maxDuration = 0;
  if (Array.isArray(experiment.chromatogramData)) {
    experiment.chromatogramData.forEach((pt) => {
      const timeVal = parseFloat(pt.columns?.[0] || "0");
      if (!isNaN(timeVal) && timeVal > maxDuration) {
        maxDuration = timeVal;
      }
    });
  }

  return {
    sampleCount: experiment.samples.length,
    peakCount: experiment.associatedPeaks.length,
    qcCount: experiment.qcInjections.length,
    warningCount: validation?.summary.warnings ?? 0,
    errorCount: validation?.summary.errors ?? 0,
    runDurationMinutes: maxDuration,
    instrument: metadata.instrument || metadata.Instrument || "Unknown HPLC System",
    method: metadata.method || metadata.Method || "Default Separation Profile",
    generatedAt: new Date().toISOString()
  };
}