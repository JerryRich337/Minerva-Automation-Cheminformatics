"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ChevronRight, FileText, ArrowLeft, Layers, BarChart3, Table2, Sliders } from "lucide-react";
import { Button } from "@/components/ui/button";

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