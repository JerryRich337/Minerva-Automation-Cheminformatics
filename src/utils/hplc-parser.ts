interface UploadSession {
  filename: string;
  extension: string;
  mimeType: string;
  size: number;
  checksum: string;
  uploadTimestamp: number;
}

export interface ParsedHPLCData {
  metadata: Record<string, any>;
  chromatograms: any[];
  peakTables: any[];
  sampleTables: any[];
  calibrationTables: any[];
}

/**
 * HPLCParser - Reads HPLC export sessions and transforms them directly into raw structural metrics.
 * Responsibility: Pure, unvalidated text extraction/parsing matching source structures.
 */
export async function parseHPLCFile(file: File, session: UploadSession): Promise<ParsedHPLCData> {
  const text = await file.text();
  const lines = text.split(/\r?\n/);

  const metadata: Record<string, any> = {
    parsedAt: new Date().toISOString(),
    filename: session.filename,
    checksum: session.checksum,
    fileSizeKB: (session.size / 1024).toFixed(2),
  };
  
  const chromatograms: any[] = [];
  const peakTables: any[] = [];
  const sampleTables: any[] = [];
  const calibrationTables: any[] = [];

  let currentSection = "metadata";

  // Simple, robust scanning rules to separate tabular structures safely
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const lower = trimmed.toLowerCase();

    // Context switching markers commonly found in HPLC batch reports
    if (lower.includes("chromatogram") || lower.includes("time,value") || lower.includes("retention time")) {
      currentSection = "chromatograms";
      if (trimmed.includes(",") || trimmed.includes("\t")) continue; 
    } else if (lower.includes("peak table") || lower.includes("peaklist") || lower.includes("area%")) {
      currentSection = "peakTables";
      continue;
    } else if (lower.includes("sample table") || lower.includes("sampleinfo") || lower.includes("vial")) {
      currentSection = "sampleTables";
      continue;
    } else if (lower.includes("calibration") || lower.includes("std curve")) {
      currentSection = "calibrationTables";
      continue;
    }

    // Direct entry populations preserving raw values completely
    const columns = trimmed.split(/,|\t/).map(c => c.replace(/^["']|["']$/g, "").trim());

    if (currentSection === "metadata") {
      if (columns.length >= 2) {
        const key = columns[0];
        metadata[key] = columns.slice(1).join(", ");
      } else {
        metadata[`row_${lines.indexOf(line)}`] = trimmed;
      }
    } else {
      const dataRow = { rawLine: trimmed, columns };
      if (currentSection === "chromatograms") chromatograms.push(dataRow);
      if (currentSection === "peakTables") peakTables.push(dataRow);
      if (currentSection === "sampleTables") sampleTables.push(dataRow);
      if (currentSection === "calibrationTables") calibrationTables.push(dataRow);
    }
  }

  return {
    metadata,
    chromatograms,
    peakTables,
    sampleTables,
    calibrationTables
  };
}