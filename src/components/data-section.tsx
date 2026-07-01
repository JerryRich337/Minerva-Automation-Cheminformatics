"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { onAuthStateChanged } from "firebase/auth";
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { FileText, MoreVertical, Plus, Share2, Trash2 } from "lucide-react";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { auth, db } from "@/lib/firebase";

interface Report {
  id: string;
  name: string;
  description: string;
}

export function DataSection() {
  const [open, setOpen] = useState(false);
  const [reportName, setReportName] = useState("");
  const [description, setDescription] = useState("");
  const [reports, setReports] = useState<Report[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);

        // Uses a separate "reports" collection to preserve absolute data isolation
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

  const handleOkClick = async () => {
    if (!reportName.trim() || !userId) return;

    try {
      const docRef = await addDoc(collection(db, "reports"), {
        name: reportName,
        description: description,
        userId: userId,
        createdAt: new Date(),
      });

      setReportName("");
      setDescription("");
      setOpen(false);
      // Routed to an isolated reports page tree path
      router.push(`/dashboard/reports/${docRef.id}`);
    } catch (error) {
      console.error("Error adding report: ", error);
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

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1 cursor-pointer">
              <Plus className="size-4" />
              New Report
            </Button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Report</DialogTitle>
              <DialogDescription>Enter the details below to initialize a new data report workbook.</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Report Name</Label>
                <Input
                  id="name"
                  value={reportName}
                  onChange={(e) => setReportName(e.target.value)}
                  placeholder="e.g., Q2 Analytics Clearance Summary"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Briefly describe the dataset and results summary..."
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setOpen(false)} className="cursor-pointer">
                Close
              </Button>
              <Button onClick={handleOkClick} className="cursor-pointer">
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