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

/**
 * HPLCExperimentBuilder - Converts structured raw lines into a cohesive domain representation
 * without modifying, converting, scaling, or filtering original values.
 */
export function buildHPLCExperiment(parsedData: ParsedHPLCData): HPLCExperiment {
  const metadata = parsedData.metadata || {};
  
  const samples: HPLCInjection[] = [];
  const blanks: HPLCInjection[] = [];
  const qcInjections: HPLCInjection[] = [];
  const calibrationStandards: HPLCInjection[] = [];

  // Categorize sequence information safely from raw sample table entries
  if (Array.isArray(parsedData.sampleTables)) {
    parsedData.sampleTables.forEach((row, idx) => {
      const lineText = (row.rawLine || "").toLowerCase();
      const columns = row.columns || [];
      
      const injection: HPLCInjection = {
        id: `inj_${idx}`,
        type: "unknown",
        rawColumns: columns
      };

      if (lineText.includes("blk") || lineText.includes("blank")) {
        injection.type = "blank";
        blanks.push(injection);
      } else if (lineText.includes("qc") || lineText.includes("quality control")) {
        injection.type = "qc";
        qcInjections.push(injection);
      } else if (lineText.includes("std") || lineText.includes("cal") || lineText.includes("standard")) {
        injection.type = "standard";
        calibrationStandards.push(injection);
      } else {
        injection.type = "sample";
        samples.push(injection);
      }
    });
  }

  return {
    experimentId: `exp_${metadata.checksum?.substring(0, 8) || Date.now()}`,
    globalMetadata: metadata,
    samples,
    blanks,
    qcInjections,
    calibrationStandards,
    chromatogramData: parsedData.chromatograms || [],
    associatedPeaks: parsedData.peakTables || [],
    rawSourceChecksum: metadata.checksum || ""
  };
}