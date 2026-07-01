"use client";

import { useEffect, useState, useRef } from "react";

import { useRouter } from "next/navigation";

import { onAuthStateChanged } from "firebase/auth";
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { FileText, MoreVertical, Plus, Share2, Trash2, UploadCloud, File, AlertCircle, X, Cpu } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { auth, db } from "@/lib/firebase";

interface Report {
  id: string;
  name: string;
  description: string;
}

// Strictly allowed extensions
const ALLOWED_EXTENSIONS = [
  "csv", "tsv", "txt", "xlsx", "json", "xml", "zip", 
  "mzml", "mzxml", "fcs", "rdml", "ome-tiff", "tiff", 
  "jcamp-dx", "fastq", "fasta", "bam", "vcf", "hdf5", "parquet"
];

export function DataSection() {
  const [open, setOpen] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  
  // Drag and Drop / File Selection State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Instrument Detection Engine State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [detectedInstrument, setDetectedInstrument] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);

        const q = query(collection(db, "reports"), where("userId", "==", user.uid), orderBy("createdAt", "desc"));

        const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
          const reportList: Report[] = [];
          snapshot.forEach((document) => {
            reportList.push({ id: document.id, ...document.data() } as Report);
          });
          setReports(reportList);
        });

        return () => unsubscribeSnapshot();
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // INSTRUMENT DETECTION ENGINE
  const analyzeInstrument = (file: File) => {
    setIsAnalyzing(true);
    setDetectedInstrument("Analyzing layout signatures...");

    const filename = file.name.toLowerCase();
    const extension = ALLOWED_EXTENSIONS.find(ext => filename.endsWith(`.${ext}`)) || "";

    // Read the first 4096 bytes for header/magic byte/structure inspection
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const arrayBuffer = e.target?.result as ArrayBuffer;
      if (!arrayBuffer) {
        setDetectedInstrument("Generic Data Engine File");
        setIsAnalyzing(false);
        return;
      }

      // 1. Binary Signature / Magic Byte Check
      const uint8 = new Uint8Array(arrayBuffer.slice(0, 4));
      let magicBytes = "";
      for (let i = 0; i < uint8.length; i++) {
        magicBytes += uint8[i].toString(16).padStart(2, "0");
      }

      // Convert to text string to inspect textual headers (Metadata/Structure Detector)
      const textDecoder = new TextDecoder("utf-8");
      const headerText = textDecoder.decode(new Uint8Array(arrayBuffer));

      let instrumentName = "Unknown / Standard Analytical Tool";

      // 2. Multi-Tiered Evaluation (Extension -> Magic Bytes -> Structure -> Metadata)
      if (magicBytes === "504b0304" && extension === "xlsx") {
        // Excel file layout detection
        instrumentName = "Microsoft Excel Sheet Asset";
      } else if (magicBytes === "89484446") {
        instrumentName = "HDF5 Scientific Storage Container";
      } else if (magicBytes === "4e414d45" || filename.endsWith(".fcs")) {
        instrumentName = "BD Flow Cytometer (FCS Core System)";
      } else if (magicBytes === "1f8b0800" || extension === "zip") {
        instrumentName = "Compressed Data Archive Paket";
      } else if (extension === "mzml" || headerText.includes("<mzML") || headerText.includes("http://psi.hupo.org/ms/mzml")) {
        instrumentName = "Thermo Scientific / Agilent Mass Spectrometer (mzML)";
      } else if (extension === "mzxml" || headerText.includes("<mzXML")) {
        instrumentName = "Bruker / Waters Mass Spectrometer (mzXML)";
      } else if (extension === "jcamp-dx" || headerText.includes("##TITLE") || headerText.includes("##JCAMP")) {
        instrumentName = "FTIR / NMR Spectrometer (JCAMP-DX Standard)";
      } else if (extension === "fastq" || headerText.startsWith("@")) {
        instrumentName = "Illumina NextSeq / NovaSeq Sequencer (FASTQ)";
      } else if (extension === "fasta" || headerText.startsWith(">")) {
        instrumentName = "Sanger / Oxford Nanopore Genetic Sequencer (FASTA)";
      } else if (extension === "vcf" || headerText.includes("##fileformat=VCF")) {
        instrumentName = "GATK Variant Caller Pipeline (VCF Data)";
      } else if (extension === "rdml" || headerText.includes("<rdml")) {
        instrumentName = "Real-Time PCR Cycler (qPCR RDML format)";
      } else if (headerText.includes("wavelen") || headerText.includes("absorbance")) {
        instrumentName = "UV-Vis Microplate Spectrophotometer (Tabular)";
      } else if (extension === "csv" || extension === "tsv") {
        // Inspect row layout headers
        if (headerText.includes("Retention Time") || headerText.includes("m/z")) {
          instrumentName = "LC-MS Chromatography System (CSV Log)";
        } else if (headerText.includes("Compound") || headerText.includes("SMILES")) {
          instrumentName = "Cheminformatics Structure Library Export";
        } else {
          instrumentName = "Generic Tabular Matrix Table";
        }
      } else if (extension === "json") {
        instrumentName = "Structured Platform API Snapshot (JSON)";
      } else if (extension === "xml") {
        instrumentName = "Standard Metadata Manifest Configuration (XML)";
      } else if (extension === "txt") {
        instrumentName = "Raw Instrument Terminal Printout (TXT)";
      }

      setDetectedInstrument(instrumentName);
      setIsAnalyzing(false);
    };

    reader.onerror = () => {
      setDetectedInstrument("Fallback File Reader Pipeline");
      setIsAnalyzing(false);
    };

    // Slice first 4KB to run inspection tasks without lagging browser frame loops
    const blobSlice = file.slice(0, 4096);
    reader.readAsArrayBuffer(blobSlice);
  };

  // Helper to strictly validate file extension strings
  const validateFile = (file: File) => {
    const filename = file.name.toLowerCase();
    
    // Check multi-segment extensions first (e.g., .ome-tiff, .jcamp-dx)
    const matchedExtension = ALLOWED_EXTENSIONS.find(ext => filename.endsWith(`.${ext}`));
    
    if (matchedExtension) {
      setSelectedFile(file);
      setErrorMessage(null);
      analyzeInstrument(file);
    } else {
      setSelectedFile(null);
      setDetectedInstrument(null);
      setErrorMessage("Unsupported file type. Please upload a valid data platform file format.");
    }
  };

  // Drag handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateFile(e.target.files[0]);
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setErrorMessage(null);
    setDetectedInstrument(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Safe tracking for dialog closing triggers to reset state
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      clearSelection();
    }
  };

  const handleOkClick = async () => {
    if (!selectedFile || !userId) return;

    try {
      // Setup file description tracking logic for processing downstream
      const docRef = await addDoc(collection(db, "reports"), {
        name: selectedFile.name,
        description: `Instrument: ${detectedInstrument || "Unknown"} | Size: ${(selectedFile.size / 1024).toFixed(2)} KB`,
        userId: userId,
        createdAt: new Date(),
      });

      clearSelection();
      setOpen(false);
      // Fallback fallback forward route matching since template route wasn't generated yet
      router.push(`/dashboard`);
    } catch (error) {
      console.error("Error adding report asset: ", error);
    }
  };

  const handleDelete = async (reportId: string) => {
    if (confirm("Are you sure you want to delete this report? This cannot be undone.")) {
      try {
        await deleteDoc(doc(db, "reports", reportId));
      } catch (error) {
        console.error("Error deleting report:", error);
      }
    }
  };

  const handleShare = (reportId: string) => {
    const url = `${window.location.origin}/dashboard/reports/${reportId}`;
    navigator.clipboard.writeText(url);
    alert("Report link copied to clipboard!");
  };

  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-card p-6 text-card-foreground shadow-xs">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight">Data</h2>

        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1 cursor-pointer">
              <Plus className="size-4" />
              New Report
            </Button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Report</DialogTitle>
              <DialogDescription>Upload your analytical file dataset to initialize a new workbench report layout.</DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                id="report-file-uploader"
              />
              
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                  isDragging 
                    ? "border-primary bg-primary/5" 
                    : selectedFile 
                      ? "border-emerald-500 bg-emerald-50/10 dark:bg-emerald-950/10" 
                      : "border-border hover:bg-muted/50"
                }`}
              >
                {!selectedFile ? (
                  <>
                    <div className="flex size-10 items-center justify-center rounded-lg border bg-background shadow-xs mb-3 text-muted-foreground">
                      <UploadCloud className="size-5" />
                    </div>
                    <p className="text-sm font-medium">Click to upload or drag & drop</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-[340px]">
                      Accepts standard tabular, mass spectrometry, sequencing formats, packages, layouts or archives.
                    </p>
                  </>
                ) : (
                  <div className="flex w-full items-center justify-between gap-3 bg-muted/40 p-3 rounded-lg border border-emerald-500/30">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        <File className="size-4" />
                      </div>
                      <div className="text-left overflow-hidden">
                        <p className="text-sm font-medium truncate pr-2">{selectedFile.name}</p>
                        <p className="text-xs text-muted-foreground">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      onClick={(e) => { e.stopPropagation(); clearSelection(); }}
                      className="size-7 h-7 w-7 text-muted-foreground hover:text-foreground shrink-0 rounded-md"
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Dynamic Instrument Fingerprint Engine Response UI Block */}
              {selectedFile && detectedInstrument && (
                <div className="flex items-center gap-2.5 mt-3 text-xs bg-muted border border-border p-3 rounded-lg">
                  <Cpu className={`size-4 text-primary ${isAnalyzing ? "animate-pulse" : ""}`} />
                  <div className="overflow-hidden text-left">
                    <p className="font-medium text-muted-foreground uppercase tracking-wider text-[10px]">Engine Identification Match</p>
                    <p className="text-foreground font-semibold truncate mt-0.5">{detectedInstrument}</p>
                  </div>
                </div>
              )}

              {errorMessage && (
                <div className="flex items-start gap-2 text-destructive mt-3 text-xs bg-destructive/10 p-2.5 rounded-lg border border-destructive/20">
                  <AlertCircle className="size-4 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => handleOpenChange(false)} className="cursor-pointer">
                Close
              </Button>
              <Button onClick={handleOkClick} disabled={!selectedFile || isAnalyzing} className="cursor-pointer">
                OK
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {reports.length === 0 ? (
        <div className="flex h-32 items-center justify-center rounded-lg border border-dashed bg-muted/20">
          <p className="text-sm text-muted-foreground">No reports yet. Click "New Report" to start.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reports.map((report) => (
            <div
              key={report.id}
              onClick={() => router.push(`/dashboard`)}
              className="group relative flex flex-col gap-2 rounded-xl border bg-card p-4 shadow-xs transition-all hover:border-primary/50 hover:shadow-md cursor-pointer"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 overflow-hidden">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-lg border bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                    <FileText className="size-4" />
                  </div>
                  <h3 className="font-medium text-sm truncate">{report.name}</h3>
                </div>

                <div onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 -mr-2 -mt-1 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 data-[state=open]:opacity-100"
                      >
                        <MoreVertical className="size-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[160px]">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(report.id);
                        }}
                        className="text-red-600 focus:bg-red-50 focus:text-red-600 cursor-pointer"
                      >
                        <Trash2 className="mr-2 size-4" />
                        Delete
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShare(report.id);
                        }}
                        className="cursor-pointer"
                      >
                        <Share2 className="mr-2 size-4" />
                        Share
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {report.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 pl-9">{report.description}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}