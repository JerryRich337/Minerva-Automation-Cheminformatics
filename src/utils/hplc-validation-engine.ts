import { HPLCExperiment } from "./hplc-experiment-builder";

export interface ValidationMessage {
  type: "error" | "warning" | "info";
  ruleId: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  checkedAt: string;
  summary: {
    errors: number;
    warnings: number;
    infos: number;
  };
  messages: ValidationMessage[];
}

/**
 * Pure deterministic validation engine for incoming HPLC experiments.
 */
export function runHPLCValidation(experiment: HPLCExperiment): ValidationResult {
  const messages: ValidationMessage[] = [];

  // 1. Missing Injections / Empty Experiment Check
  const totalInjections = 
    experiment.samples.length + 
    experiment.blanks.length + 
    experiment.qcInjections.length + 
    experiment.calibrationStandards.length;

  if (totalInjections === 0) {
    messages.push({
      type: "error",
      ruleId: "EMPTY_EXPERIMENT",
      message: "The parsed experiment contains zero organized injections."
    });
  }

  // 2. Metadata Complete Check
  const essentialMetadata = ["filename", "checksum", "parsedAt"];
  essentialMetadata.forEach((key) => {
    if (!experiment.globalMetadata || !experiment.globalMetadata[key]) {
      messages.push({
        type: "warning",
        ruleId: `MISSING_METADATA_${key.toUpperCase()}`,
        message: `Essential experiment descriptor variable '${key}' is missing.`
      });
    }
  });

  // 3. Calibration Completeness Verification
  if (experiment.calibrationStandards.length === 0) {
    messages.push({
      type: "warning",
      ruleId: "MISSING_CALIBRATION",
      message: "No calibration standards were registered. Quantitative verification may be compromised."
    });
  }

  // 4. Blank Injections Verification
  if (experiment.blanks.length === 0) {
    messages.push({
      type: "info",
      ruleId: "NO_BLANKS_DETECTED",
      message: "No blank matrix injections were grouped within this layout sequence sequence."
    });
  }

  // 5. Check Duplicate Injection Identifiers
  const trackedIds = new Set<string>();
  experiment.samples.forEach((sample) => {
    if (trackedIds.has(sample.id)) {
      messages.push({
        type: "warning",
        ruleId: "DUPLICATE_SAMPLE_ID",
        message: `Duplicate injection context tracking observed for ID: ${sample.id}`
      });
    }
    trackedIds.add(sample.id);
  });

  // 6. Detector Saturation & Baseline Physical Abnormality Checks
  if (Array.isArray(experiment.chromatogramData)) {
    let detectorSaturated = false;
    let baselineNegative = false;

    experiment.chromatogramData.forEach((point) => {
      const valStr = point.columns?.[1] || "0";
      const intensity = parseFloat(valStr);

      if (!isNaN(intensity)) {
        // Assume standard system maximum absorbance saturation limits above 3000 mAU
        if (intensity >= 3000) {
          detectorSaturated = true;
        }
        // Baseline dips severely below standard dead volume thresholds
        if (intensity < -50) {
          baselineNegative = true;
        }
      }
    });

    if (detectorSaturated) {
      messages.push({
        type: "error",
        ruleId: "DETECTOR_SATURATION",
        message: "Signal intensity values exceed nominal detector limits (Saturation detected)."
      });
    }
    if (baselineNegative) {
      messages.push({
        type: "warning",
        ruleId: "NEGATIVE_BASELINE_DRIFT",
        message: "Significant negative drift or abnormal signal drop noticed in the baseline data points."
      });
    }
  }

  const errorCount = messages.filter((m) => m.type === "error").length;
  const warningCount = messages.filter((m) => m.type === "warning").length;
  const infoCount = messages.filter((m) => m.type === "info").length;

  return {
    isValid: errorCount === 0,
    checkedAt: new Date().toISOString(),
    summary: {
      errors: errorCount,
      warnings: warningCount,
      infos: infoCount
    },
    messages
  };
}