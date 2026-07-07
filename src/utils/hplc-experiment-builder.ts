import { ParsedHPLCData } from "./hplc-parser";

export interface HPLCInjection {
  id: string;
  type: "sample" | "blank" | "qc" | "standard" | "unknown";
  rawColumns: string[];
}

export interface HPLCExperiment {
  experimentId: string;
  globalMetadata: Record<string, any>;
  samples: HPLCInjection[];
  blanks: HPLCInjection[];
  qcInjections: HPLCInjection[];
  calibrationStandards: HPLCInjection[];
  chromatogramData: any[];
  associatedPeaks: any[];
  rawSourceChecksum: string;
}

export function buildHPLCExperiment(parsedData: ParsedHPLCData): HPLCExperiment {
  const metadata = parsedData.metadata || {};
  
  const samples: HPLCInjection[] = [];
  const blanks: HPLCInjection[] = [];
  const qcInjections: HPLCInjection[] = [];
  const calibrationStandards: HPLCInjection[] = [];
  let chromatogramData = parsedData.chromatograms || [];

  // Fallback Rule: If explicit chromatogram list is empty but metadata contains key-value numeric items,
  // interpret them as continuous experiment baseline points so they show up in the source of truth.
  if (chromatogramData.length === 0 && Object.keys(metadata).length > 0) {
    Object.entries(metadata).forEach(([key, val]) => {
      const numKey = Number(key);
      if (!isNaN(numKey)) {
        chromatogramData.push({
          rawLine: `${key},${val}`,
          columns: [key, String(val)]
        });
      }
    });
  }

  // Populate at least a default active workspace entry if no explicit sample configuration was loaded
  if (Array.isArray(parsedData.sampleTables) && parsedData.sampleTables.length > 0) {
    parsedData.sampleTables.forEach((row, idx) => {
      const lineText = (row.rawLine || "").toLowerCase();
      const columns = row.columns || [];
      
      const injection: HPLCInjection = {
        id: `inj_${idx}`,
        type: "sample",
        rawColumns: columns
      };

      if (lineText.includes("blk") || lineText.includes("blank")) {
        injection.type = "blank";
        blanks.push(injection);
      } else if (lineText.includes("qc")) {
        injection.type = "qc";
        qcInjections.push(injection);
      } else if (lineText.includes("std") || lineText.includes("cal")) {
        injection.type = "standard";
        calibrationStandards.push(injection);
      } else {
        samples.push(injection);
      }
    });
  } else {
    // Standard default workspace registration injection
    samples.push({
      id: "inj_default_01",
      type: "sample",
      rawColumns: [metadata.filename || "Exp1.csv", "Primary Channel Detect"]
    });
  }

  return {
    experimentId: `exp_${metadata.checksum?.substring(0, 8) || "hplc_fallback"}`,
    globalMetadata: metadata,
    samples,
    blanks,
    qcInjections,
    calibrationStandards,
    chromatogramData,
    associatedPeaks: parsedData.peakTables || [],
    rawSourceChecksum: metadata.checksum || ""
  };
}