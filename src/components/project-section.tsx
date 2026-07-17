"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { onAuthStateChanged } from "firebase/auth";
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { Folder, MoreVertical, Plus, Search, Share2, Trash2 } from "lucide-react";

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

interface Project {
  id: string;
  name: string;
  description: string;
}

export function ProjectSection() {
  const [open, setOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [description, setDescription] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    let unsubscribeSnapshot: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      unsubscribeSnapshot?.();
      unsubscribeSnapshot = null;

      if (user) {
        setUserId(user.uid);

        const q = query(collection(db, "projects"), where("userId", "==", user.uid), orderBy("createdAt", "desc"));

        unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
          const projectList: Project[] = [];
          snapshot.forEach((document) => {
            projectList.push({ id: document.id, ...document.data() } as Project);
          });
          setProjects(projectList);
          setErrorMessage(null);
        }, (error) => {
          console.error("CRITICAL FIRESTORE PROJECT QUERY ERROR:", error.message);
          if (error.code === "permission-denied") {
            setErrorMessage("Firestore denied access to your projects. This client is authenticated; the remaining blocker is your Firestore rules for the projects collection.");
          }
        });
      } else {
        setUserId(null);
        setProjects([]);
      }

      setIsAuthReady(true);
    });

    return () => {
      unsubscribeSnapshot?.();
      unsubscribeAuth();
    };
  }, []);

  const handleOkClick = async () => {
    if (!projectName.trim()) return;

    const currentUser = auth.currentUser;
    if (!currentUser) {
      setErrorMessage("Your session is not ready. Sign in again before creating a project.");
      return;
    }

    try {
      const docRef = await addDoc(collection(db, "projects"), {
        name: projectName,
        description: description,
        userId: currentUser.uid,
        createdAt: new Date(),
      });

      setProjectName("");
      setDescription("");
      setErrorMessage(null);
      setOpen(false);
      router.push(`/dashboard/projects/${docRef.id}`);
    } catch (error: any) {
      console.error("Error adding project: ", error);
      if (error?.code === "permission-denied") {
        setErrorMessage("Firestore denied the project write. Your signed-in user is ready, so the remaining blocker is your Firestore rules for the projects collection.");
        return;
      }

      setErrorMessage("Failed to create project. Open your browser console for tracking errors.");
    }
  };

  // --- NEW FEATURES ---
  const handleDelete = async (projectId: string) => {
    if (confirm("Are you sure you want to delete this project? This cannot be undone.")) {
      try {
        await deleteDoc(doc(db, "projects", projectId));
      } catch (error) {
        console.error("Error deleting project:", error);
      }
    }
  };

  const handleShare = (projectId: string) => {
    const url = `${window.location.origin}/dashboard/projects/${projectId}`;
    navigator.clipboard.writeText(url);
    alert("Project link copied to clipboard!");
  };

  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-card p-6 text-card-foreground shadow-xs">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight">Projects</h2>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1 cursor-pointer" disabled={!isAuthReady || !userId}>
              <Plus className="size-4" />
              New Project
            </Button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
              <DialogDescription>Enter the details below to initialize a new project workspace.</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Project Name</Label>
                <Input
                  id="name"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g., Kinase Inhibitor Screen"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Briefly describe the project goals..."
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setOpen(false)} className="cursor-pointer">
                Close
              </Button>
              <Button onClick={handleOkClick} disabled={!isAuthReady || !userId || !projectName.trim()} className="cursor-pointer">
                OK
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {errorMessage && (
        <div className="rounded-lg border border-destructive/10 bg-destructive/5 px-3 py-2 text-xs font-medium text-destructive">
          {errorMessage}
        </div>
      )}

      {projects.length === 0 ? (
        <div className="flex h-32 items-center justify-center rounded-lg border border-dashed bg-muted/20">
          <p className="text-sm text-muted-foreground">No projects yet. Click "New Project" to start.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <div
              key={project.id}
              onClick={() => router.push(`/dashboard/projects/${project.id}`)}
              className="group relative flex flex-col gap-2 rounded-xl border bg-card p-4 shadow-xs transition-all hover:border-primary/50 hover:shadow-md cursor-pointer"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 overflow-hidden">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-lg border bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                    <Folder className="size-4" />
                  </div>
                  <h3 className="font-medium text-sm truncate">{project.name}</h3>
                </div>

                {/* The new Kebab Menu */}
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
                          handleDelete(project.id);
                        }}
                        className="text-red-600 focus:bg-red-50 focus:text-red-600 cursor-pointer"
                      >
                        <Trash2 className="mr-2 size-4" />
                        Delete
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShare(project.id);
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

              {project.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 pl-9">{project.description}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
