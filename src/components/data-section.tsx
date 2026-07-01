"use client";

import { useEffect, useState, useRef } from "react";

import { useRouter } from "next/navigation";

import { onAuthStateChanged } from "firebase/auth";
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { FileText, MoreVertical, Plus, Share2, Trash2, UploadCloud, File, AlertCircle, X } from "lucide-react";

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

  // Helper to strictly validate file extension strings
  const validateFile = (file: File) => {
    const filename = file.name.toLowerCase();
    
    // Check multi-segment extensions first (e.g., .ome-tiff, .jcamp-dx)
    const matchedExtension = ALLOWED_EXTENSIONS.find(ext => filename.endsWith(`.${ext}`));
    
    if (matchedExtension) {
      setSelectedFile(file);
      setErrorMessage(null);
    } else {
      setSelectedFile(null);
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
    if (e.target.target && e.target.files && e.target.files.length > 0) {
      validateFile(e.target.files[0]);
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setErrorMessage(null);
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
        description: `Uploaded file size: ${(selectedFile.size / 1024).toFixed(2)} KB`,
        userId: userId,
        createdAt: new Date(),
      });

      clearSelection();
      setOpen(false);
      router.push(`/dashboard/reports/${docRef.id}`);
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
              <Button onClick={handleOkClick} disabled={!selectedFile} className="cursor-pointer">
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
              onClick={() => router.push(`/dashboard/reports/${report.id}`)}
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