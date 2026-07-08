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

export interface HPLCWorkspace {
  readonly experiment: HPLCExperiment;
  readonly validation: ValidationResult;
  readonly summary: ExperimentSummary;
  readonly visualizationData: any;
  readonly builtAt: string;
}

/**
 * Generates non-interpretive factual metadata summaries directly from structural experiment states.
 */
export function generateHPLCSummary(
  experiment: HPLCExperiment,
  validation: ValidationResult | null
): ExperimentSummary {
  const metadata = experiment.globalMetadata || {};

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

/**
 * HPLCWorkspaceBuilder: Combines experiment, validation, summary, and visualization data
 * into a single, fully frozen, immutable workspace object snapshot.
 */
export function buildHPLCWorkspace(
  experiment: HPLCExperiment,
  validation: ValidationResult,
  visualizationData: any
): HPLCWorkspace {
  const summary = generateHPLCSummary(experiment, validation);

  const workspace: HPLCWorkspace = {
    experiment,
    validation,
    summary,
    visualizationData,
    builtAt: new Date().toISOString()
  };

  // Enforce deep structural immutability via recursive freezing
  const deepFreeze = (obj: any): any => {
    if (obj && typeof obj === "object") {
      Object.freeze(obj);
      Object.getOwnPropertyNames(obj).forEach((prop) => deepFreeze(obj[prop]));
    }
    return obj;
  };

  return deepFreeze(workspace);
}