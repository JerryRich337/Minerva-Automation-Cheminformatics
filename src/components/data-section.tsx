"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { 
  addDoc, 
  collection, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  orderBy, 
  query, 
  where,
  serverTimestamp 
} from "firebase/firestore";
import { FileText, Plus, Share2, Trash2, UploadCloud, File, AlertCircle, X, Cpu, ChevronDown, MoreVertical } from "lucide-react";

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

const ALLOWED_EXTENSIONS = [
  "csv", "tsv", "txt", "xlsx", "json", "xml", "zip", 
  "mzml", "mzxml", "fcs", "rdml", "ome-tiff", "tiff", 
  "jcamp-dx", "fastq", "fasta", "bam", "vcf", "hdf5", "parquet"
];

const INSTRUMENT_PRESETS = [
  "High-Performance Liquid Chromatography (HPLC System)",
  "Liquid Chromatography-Mass Spectrometry (LC-MS/MS)",
  "Gas Chromatography-Mass Spectrometry (GC-MS)",
  "BD Flow Cytometer (FCS Core System)",
  "Thermo Scientific / Agilent Mass Spectrometer",
  "Bruker / Waters Mass Spectrometer",
  "FTIR / NMR Spectrometer (JCAMP-DX Standard)",
  "Illumina NextSeq / NovaSeq Sequencer",
  "Sanger / Oxford Nanopore Genetic Sequencer",
  "Real-Time PCR Cycler (qPCR System)",
  "UV-Vis Microplate Spectrophotometer",
  "Generic Tabular Matrix Table"
];

export function DataSection() {
  const [open, setOpen] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [detectedInstrument, setDetectedInstrument] = useState<string | null>(null);
  const [isManualOverride, setIsManualOverride] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);

        const q = query(
          collection(db, "reports"), 
          where("userId", "==", user.uid), 
          orderBy("createdAt", "desc")
        );

        const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
          const reportList: Report[] = [];
          snapshot.forEach((document) => {
            reportList.push({ id: document.id, ...document.data() } as Report);
          });
          setReports(reportList);
        }, (error) => {
          console.error("CRITICAL FIRESTORE QUERY ERROR:", error.message);
        });

        return () => unsubscribeSnapshot();
      } else {
        setUserId(null);
        setReports([]);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const analyzeInstrument = (file: File) => {
    setIsAnalyzing(true);
    setDetectedInstrument("Analyzing layout signatures...");
    setIsManualOverride(false);

    const filename = file.name.toLowerCase();
    const extension = ALLOWED_EXTENSIONS.find(ext => filename.endsWith(`.${ext}`)) || "";

    const reader = new FileReader();
    
    reader.onload = (e) => {
      const arrayBuffer = e.target?.result as ArrayBuffer;
      if (!arrayBuffer) {
        setDetectedInstrument("Generic Tabular Matrix Table");
        setIsAnalyzing(false);
        return;
      }

      const uint8 = new Uint8Array(arrayBuffer.slice(0, 4));
      let magicBytes = "";
      for (let i = 0; i < uint8.length; i++) {
        magicBytes += uint8[i].toString(16).padStart(2, "0");
      }

      const textDecoder = new TextDecoder("utf-8");
      const headerText = textDecoder.decode(new Uint8Array(arrayBuffer));
      const headerTextLower = headerText.toLowerCase();

      let instrumentName = "Generic Tabular Matrix Table";

      const hplcKeywords = [
        "hplc", "chromatogram", "retention time", "ret.time", "r.time", "m/z", 
        "absorbance", "wavelength", "peak table", "peak list", "area%", "height",
        "elution", "flow rate", "pump", "detector channel", "injection volume"
      ];

      const matchesHplcKeywords = hplcKeywords.some(keyword => headerTextLower.includes(keyword)) || 
                                   filename.includes("hplc") || 
                                   filename.includes("chrom");

      if (magicBytes === "504b0304" && extension === "xlsx") {
        instrumentName = matchesHplcKeywords 
          ? "High-Performance Liquid Chromatography (HPLC System)" 
          : "Microsoft Excel Sheet Asset";
      } else if (magicBytes === "89484446") {
        instrumentName = "HDF5 Scientific Storage Container";
      } else if (magicBytes === "4e414d45" || filename.endsWith(".fcs")) {
        instrumentName = "BD Flow Cytometer (FCS Core System)";
      } else if (extension === "mzml" || headerText.includes("<mzML") || headerText.includes("http://psi.hupo.org/ms/mzml")) {
        instrumentName = "Thermo Scientific / Agilent Mass Spectrometer";
      } else if (extension === "mzxml" || headerText.includes("<mzXML")) {
        instrumentName = "Bruker / Waters Mass Spectrometer";
      } else if (extension === "jcamp-dx" || headerText.includes("##TITLE") || headerText.includes("##JCAMP")) {
        instrumentName = "FTIR / NMR Spectrometer (JCAMP-DX Standard)";
      } else if (extension === "fastq" || headerText.startsWith("@")) {
        instrumentName = "Illumina NextSeq / NovaSeq Sequencer";
      } else if (extension === "fasta" || headerText.startsWith(">")) {
        instrumentName = "Sanger / Oxford Nanopore Genetic Sequencer";
      } else if (extension === "vcf" || headerText.includes("##fileformat=VCF")) {
        instrumentName = "GATK Variant Caller Pipeline (VCF Data)";
      } else if (extension === "rdml" || headerText.includes("<rdml")) {
        instrumentName = "Real-Time PCR Cycler (qPCR System)";
      } else if (extension === "csv" || extension === "tsv" || extension === "txt") {
        if (matchesHplcKeywords) {
          instrumentName = "High-Performance Liquid Chromatography (HPLC System)";
        } else if (headerText.includes("Compound") || headerText.includes("SMILES")) {
          instrumentName = "Cheminformatics Structure Library Export";
        } else {
          instrumentName = "Generic Tabular Matrix Table";
        }
      }

      setDetectedInstrument(instrumentName);
      setIsAnalyzing(false);
    };

    reader.onerror = () => {
      setDetectedInstrument("Generic Tabular Matrix Table");
      setIsAnalyzing(false);
    };

    const blobSlice = file.slice(0, 4096);
    reader.readAsArrayBuffer(blobSlice);
  };

  const validateFile = (file: File) => {
    const filename = file.name.toLowerCase();
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
    setIsManualOverride(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      clearSelection();
    }
  };

  const handleOkClick = async () => {
    if (!selectedFile || !userId) return;

    try {
      // Deduplication naming algorithm
      const originalName = selectedFile.name;
      const lastDotIndex = originalName.lastIndexOf(".");
      
      let baseName = originalName;
      let extension = "";
      
      if (lastDotIndex !== -1) {
        baseName = originalName.substring(0, lastDotIndex);
        extension = originalName.substring(lastDotIndex); // includes the dot (e.g., ".csv")
      }

      let finalName = originalName;
      let counter = 1;

      // Extract existing report names for checking
      const existingNames = reports.map(r => r.name);

      // Sequentially find an available file index name variation
      while (existingNames.includes(finalName)) {
        finalName = `${baseName}(${counter})${extension}`;
        counter++;
      }

      const reportsCollection = collection(db, "reports");

      await addDoc(reportsCollection, {
        name: finalName,
        description: `Instrument: ${detectedInstrument || "Unknown Instrument"} | Size: ${(selectedFile.size / 1024).toFixed(2)} KB`,
        userId: userId,
        createdAt: serverTimestamp(),
      });

      clearSelection();
      setOpen(false);
      
    } catch (error: any) {
      console.error("FIRESTORE WRITE ERROR:", error);
      setErrorMessage("Failed to save report. Open your browser console for tracking errors.");
    }
  };

  const handleDeleteReport = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); 
    e.preventDefault();
    if (!confirm("Are you sure you want to permanently delete this report file?")) return;
    
    try {
      await deleteDoc(doc(db, "reports", id));
    } catch (error) {
      console.error("Failed to delete document from Firestore: ", error);
    }
  };

  const handleShareReport = (e: React.MouseEvent, report: Report) => {
    e.stopPropagation();
    e.preventDefault();
    
    const targetUrl = `${window.location.origin}/dashboard?reportId=${report.id}`;
    
    if (navigator.share) {
      navigator.share({
        title: report.name,
        text: report.description,
        url: targetUrl
      }).catch((err) => console.log("Shared system aborted:", err));
    } else {
      navigator.clipboard.writeText(targetUrl);
      alert("Success! Link copied to your clipboard.");
    }
  };

  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-card p-6 text-card-foreground shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight">Data</h2>

        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1 cursor-pointer">
              <Plus className="size-4" />
              New Report
            </Button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-[500px] p-6 gap-6">
            <DialogHeader className="gap-1">
              <DialogTitle className="text-lg font-semibold">Create New Report</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Upload your analytical file dataset to initialize a new workbench report layout.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4">
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
                className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
                  isDragging 
                    ? "border-primary bg-primary/5 scale-[0.99]" 
                    : selectedFile 
                      ? "border-emerald-500/40 bg-emerald-50/10 dark:bg-emerald-950/5" 
                      : "border-muted-foreground/20 hover:border-muted-foreground/40 hover:bg-muted/30"
                }`}
              >
                {!selectedFile ? (
                  <>
                    <div className="flex size-10 items-center justify-center rounded-lg border bg-background shadow-sm mb-3 text-muted-foreground">
                      <UploadCloud className="size-5" />
                    </div>
                    <p className="text-sm font-medium text-foreground">Click to upload or drag & drop</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-[340px]">
                      Accepts standard tabular, mass spectrometry, sequencing formats, or packages.
                    </p>
                  </>
                ) : (
                  <div className="flex w-full items-center justify-between gap-3 bg-background p-3 rounded-lg border shadow-sm">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        <File className="size-4" />
                      </div>
                      <div className="text-left overflow-hidden">
                        <p className="text-sm font-medium text-foreground truncate max-w-[240px]">{selectedFile.name}</p>
                        <p className="text-xs text-muted-foreground">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      onClick={(e) => { e.stopPropagation(); clearSelection(); }}
                      className="size-7 text-muted-foreground hover:text-foreground hover:bg-muted shrink-0 rounded-md"
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                )}
              </div>

              {selectedFile && detectedInstrument && (
                <div className="flex items-center justify-between gap-4 rounded-xl border bg-muted/40 p-3.5 shadow-sm">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-background text-primary shadow-sm">
                      <Cpu className={`size-4 ${isAnalyzing ? "animate-pulse" : ""}`} />
                    </div>
                    <div className="text-left overflow-hidden">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
                        {isManualOverride ? "Manual Selected Override" : "Engine Identification Match"}
                      </p>
                      <p className="font-medium text-sm text-foreground mt-0.5 break-words line-clamp-2 leading-tight">
                        {detectedInstrument}
                      </p>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 px-3 shrink-0 font-medium">
                        Change
                        <ChevronDown className="size-3.5 opacity-60" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[300px] max-h-[280px] overflow-y-auto">
                      {INSTRUMENT_PRESETS.map((preset) => (
                        <DropdownMenuItem
                          key={preset}
                          onClick={() => {
                            setDetectedInstrument(preset);
                            setIsManualOverride(true);
                          }}
                          className={`text-xs py-2 cursor-pointer ${detectedInstrument === preset ? "bg-primary/5 font-semibold text-primary focus:bg-primary/10" : ""}`}
                        >
                          {preset}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}

              {errorMessage && (
                <div className="flex items-start gap-2 text-destructive text-xs bg-destructive/5 p-3 rounded-lg border border-destructive/10">
                  <AlertCircle className="size-4 shrink-0 mt-0.5" />
                  <span className="font-medium">{errorMessage}</span>
                </div>
              )}
            </div>

            <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 border-t">
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
              className="group relative flex flex-col gap-2 rounded-xl border bg-card p-4 shadow-sm transition-all hover:border-primary/50 hover:shadow-md cursor-pointer"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 overflow-hidden">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-lg border bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                    <FileText className="size-4" />
                  </div>
                  <h3 className="font-medium text-sm truncate max-w-[140px] sm:max-w-[180px]">{report.name}</h3>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="size-8 h-8 w-8 -mr-2 -mt-1 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 data-[state=open]:opacity-100 rounded-lg text-muted-foreground hover:text-foreground"
                    >
                      <MoreVertical className="size-4" />
                      <span className="sr-only">Open menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem 
                      onClick={(e) => handleDeleteReport(e, report.id)}
                      className="gap-2 cursor-pointer text-xs text-destructive focus:text-destructive focus:bg-destructive/5 font-medium"
                    >
                      <Trash2 className="size-3.5" />
                      <span>Delete</span>
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem 
                      onClick={(e) => handleShareReport(e, report)}
                      className="gap-2 cursor-pointer text-xs font-medium"
                    >
                      <Share2 className="size-3.5 text-muted-foreground" />
                      <span>Share</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {report.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 pl-9 pr-2">{report.description}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}