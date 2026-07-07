"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ChevronRight, FileText, ArrowLeft, Layers, BarChart3, Table2, Sliders, FlaskConical, ShieldAlert, CheckCircle2, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildHPLCExperiment } from "@/utils/hplc-experiment-builder";
import { runHPLCValidation } from "@/utils/hplc-validation-engine";
import { generateHPLCSummary } from "@/utils/hplc-summary-engine";
import { generateStructuredVisualizationData } from "@/utils/hplc-visualization-engine";

interface ReportPageProps {
  params: Promise<{ id: string }>;
}

export default function ReportDetailPage({ params }: ReportPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReport() {
      try {
        const docRef = doc(db, "reports", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setReport(docSnap.data());
        }
      } catch (err) {
        console.error("Error retrieving parsed HPLC record:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchReport();
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground animate-pulse">Loading parsed instrument layout dataset...</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-background">
        <p className="text-sm font-medium text-destructive">Report reference record not found.</p>
        <Button onClick={() => router.push("/")} variant="outline" size="sm">Return Home</Button>
      </div>
    );
  }

  const hplc = report.parsedHPLCData;
  const experiment = hplc ? buildHPLCExperiment(hplc) : null;
  const validationResult = experiment ? runHPLCValidation(experiment) : null;
  const summaryResult = experiment ? generateHPLCSummary(experiment, validationResult) : null;
  
  // Dynamically structuralize coordinate collections for chart presentation hooks
  const structuredData = experiment ? generateStructuredVisualizationData(experiment) : null;

  return (
    <div className="min-h-screen bg-background p-6 md:p-10 text-foreground">
      <div className="mx-auto max-w-5xl flex flex-col gap-6">
        
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/")} className="rounded-lg">
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{report.name}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{report.description}</p>
          </div>
        </div>

        <hr className="border-border" />

        {hplc ? (
          <div className="flex flex-col gap-4">
            
            {/* COLLAPSIBLE DETAILS BLOCK 1: METADATA */}
            <details className="group border rounded-xl bg-card transition-all" open>
              <summary className="flex items-center justify-between p-4 font-medium text-sm select-none cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                <div className="flex items-center gap-3">
                  <FileText className="size-4 text-muted-foreground" />
                  <span>Metadata ({Object.keys(hplc.metadata || {}).length} variables)</span>
                </div>
                <ChevronRight className="size-4 text-muted-foreground transition-transform group-open:rotate-90" />
              </summary>
              <div className="px-4 pb-4 pt-1 border-t border-dashed text-xs overflow-x-auto">
                <pre className="bg-muted/40 p-3 rounded-lg text-muted-foreground leading-relaxed font-mono">
                  {JSON.stringify(hplc.metadata, null, 2)}
                </pre>
              </div>
            </details>

            {/* COLLAPSIBLE DETAILS BLOCK 2: CHROMATOGRAMS */}
            <details className="group border rounded-xl bg-card transition-all">
              <summary className="flex items-center justify-between p-4 font-medium text-sm select-none cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                <div className="flex items-center gap-3">
                  <BarChart3 className="size-4 text-muted-foreground" />
                  <span>Chromatogram Segments ({hplc.chromatograms?.length || 0} rows)</span>
                </div>
                <ChevronRight className="size-4 text-muted-foreground transition-transform group-open:rotate-90" />
              </summary>
              <div className="px-4 pb-4 pt-1 border-t border-dashed text-xs max-h-72 overflow-y-auto">
                <pre className="bg-muted/40 p-3 rounded-lg text-muted-foreground font-mono">
                  {JSON.stringify(hplc.chromatograms, null, 2)}
                </pre>
              </div>
            </details>

            {/* COLLAPSIBLE DETAILS BLOCK 3: PEAK TABLES */}
            <details className="group border rounded-xl bg-card transition-all">
              <summary className="flex items-center justify-between p-4 font-medium text-sm select-none cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                <div className="flex items-center gap-3">
                  <Table2 className="size-4 text-muted-foreground" />
                  <span>Peak Tables ({hplc.peakTables?.length || 0} items)</span>
                </div>
                <ChevronRight className="size-4 text-muted-foreground transition-transform group-open:rotate-90" />
              </summary>
              <div className="px-4 pb-4 pt-1 border-t border-dashed text-xs max-h-72 overflow-y-auto">
                <pre className="bg-muted/40 p-3 rounded-lg text-muted-foreground font-mono">
                  {JSON.stringify(hplc.peakTables, null, 2)}
                </pre>
              </div>
            </details>

            {/* COLLAPSIBLE DETAILS BLOCK 4: SAMPLE TABLES */}
            <details className="group border rounded-xl bg-card transition-all">
              <summary className="flex items-center justify-between p-4 font-medium text-sm select-none cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                <div className="flex items-center gap-3">
                  <Layers className="size-4 text-muted-foreground" />
                  <span>Sample Tables ({hplc.sampleTables?.length || 0} sequences)</span>
                </div>
                <ChevronRight className="size-4 text-muted-foreground transition-transform group-open:rotate-90" />
              </summary>
              <div className="px-4 pb-4 pt-1 border-t border-dashed text-xs max-h-72 overflow-y-auto">
                <pre className="bg-muted/40 p-3 rounded-lg text-muted-foreground font-mono">
                  {JSON.stringify(hplc.sampleTables, null, 2)}
                </pre>
              </div>
            </details>

            {/* COLLAPSIBLE DETAILS BLOCK 5: CALIBRATION TABLES */}
            <details className="group border rounded-xl bg-card transition-all">
              <summary className="flex items-center justify-between p-4 font-medium text-sm select-none cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                <div className="flex items-center gap-3">
                  <Sliders className="size-4 text-muted-foreground" />
                  <span>Calibration Tables ({hplc.calibrationTables?.length || 0} entries)</span>
                </div>
                <ChevronRight className="size-4 text-muted-foreground transition-transform group-open:rotate-90" />
              </summary>
              <div className="px-4 pb-4 pt-1 border-t border-dashed text-xs max-h-72 overflow-y-auto">
                <pre className="bg-muted/40 p-3 rounded-lg text-muted-foreground font-mono">
                  {JSON.stringify(hplc.calibrationTables, null, 2)}
                </pre>
              </div>
            </details>

            <div className="my-2 border-t border-muted-foreground/20" />

            {/* DOMAIN WORKSPACE SECTION: HPLC EXPERIMENT SOURCE OF TRUTH */}
            {experiment && (
              <details className="group border-2 border-primary/20 rounded-xl bg-primary/5 transition-all" open>
                <summary className="flex items-center justify-between p-4 font-semibold text-sm select-none cursor-pointer list-none text-primary [&::-webkit-details-marker]:hidden">
                  <div className="flex items-center gap-3">
                    <FlaskConical className="size-4" />
                    <span>HPLC Experiment Domain Object (Source of Truth)</span>
                  </div>
                  <ChevronRight className="size-4 transition-transform group-open:rotate-90" />
                </summary>
                <div className="px-4 pb-4 pt-1 border-t border-primary/10 text-xs max-h-96 overflow-y-auto">
                  <p className="text-muted-foreground mb-3 text-[11px]">
                    Organized domain view grouping injection contexts (Samples: {experiment.samples.length}, Blanks: {experiment.blanks.length}, QCs: {experiment.qcInjections.length}, Standards: {experiment.calibrationStandards.length}).
                  </p>
                  <pre className="bg-background/80 p-3 rounded-lg text-foreground font-mono border">
                    {JSON.stringify(experiment, null, 2)}
                  </pre>
                </div>
              </details>
            )}

            {/* DOMAIN VALIDATION VIEW SECTION */}
            {validationResult && (
              <details className={`group border-2 rounded-xl transition-all ${validationResult.isValid ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-amber-500/20 bg-amber-500/5'}`} open>
                <summary className={`flex items-center justify-between p-4 font-semibold text-sm select-none cursor-pointer list-none [&::-webkit-details-marker]:hidden ${validationResult.isValid ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                  <div className="flex items-center gap-3">
                    {validationResult.isValid ? <CheckCircle2 className="size-4" /> : <ShieldAlert className="size-4" />}
                    <span>Deterministic HPLC Validation Engine Workspace</span>
                  </div>
                  <ChevronRight className="size-4 transition-transform group-open:rotate-90" />
                </summary>
                <div className="px-4 pb-4 pt-1 border-t border-dashed border-muted-foreground/20 text-xs max-h-96 overflow-y-auto">
                  <div className="flex items-center gap-4 my-2 p-2 rounded bg-background/50 border font-medium text-[11px]">
                    <span className="text-destructive">Errors: {validationResult.summary.errors}</span>
                    <span className="text-amber-500">Warnings: {validationResult.summary.warnings}</span>
                    <span className="text-blue-400">Info Notes: {validationResult.summary.infos}</span>
                  </div>
                  <pre className="bg-background/80 p-3 rounded-lg text-foreground font-mono border">
                    {JSON.stringify(validationResult, null, 2)}
                  </pre>
                </div>
              </details>
            )}

            {/* FACTUAL METRICS SUMMARY VIEW SECTION */}
            {summaryResult && (
              <details className="group border border-muted-foreground/30 rounded-xl bg-muted/20 transition-all" open>
                <summary className="flex items-center justify-between p-4 font-semibold text-sm select-none cursor-pointer list-none text-foreground/90 [&::-webkit-details-marker]:hidden">
                  <div className="flex items-center gap-3">
                    <ClipboardCheck className="size-4 text-muted-foreground" />
                    <span>HPLC Experiment Summary Metrics Profile</span>
                  </div>
                  <ChevronRight className="size-4 transition-transform group-open:rotate-90" />
                </summary>
                <div className="px-4 pb-4 pt-1 border-t border-dashed border-muted-foreground/20 text-xs overflow-y-auto">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-2 text-[11px]">
                    <div className="p-2 border rounded bg-card">
                      <span className="text-muted-foreground block">Samples Monitored</span>
                      <strong className="text-sm">{summaryResult.sampleCount} Injections</strong>
                    </div>
                    <div className="p-2 border rounded bg-card">
                      <span className="text-muted-foreground block">Resolved Peak Items</span>
                      <strong className="text-sm">{summaryResult.peakCount} Rows</strong>
                    </div>
                    <div className="p-2 border rounded bg-card">
                      <span className="text-muted-foreground block">Run Duration Bounds</span>
                      <strong className="text-sm">{summaryResult.runDurationMinutes || "N/A"} min</strong>
                    </div>
                    <div className="p-2 border rounded bg-card">
                      <span className="text-muted-foreground block">System Profile / Method</span>
                      <strong className="text-[10px] block truncate text-muted-foreground mt-0.5">{summaryResult.method}</strong>
                    </div>
                  </div>
                  
                  {/* StructuredData Rendering Hook */}
                  {structuredData && (
                    <div className="mt-4 border-t border-dashed pt-3">
                      <span className="text-[11px] font-semibold text-muted-foreground block mb-2">Engine StructuredData Output:</span>
                      <pre className="bg-background/80 p-3 rounded-lg text-foreground font-mono border max-h-72 overflow-y-auto text-[11px]">
                        {JSON.stringify(structuredData, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}

          </div>
        ) : (
          <div className="flex h-40 items-center justify-center rounded-xl border border-dashed bg-muted/20 p-6 text-center">
            <p className="text-sm text-muted-foreground">
              This report format did not utilize the raw text HPLCParser extraction layer.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}