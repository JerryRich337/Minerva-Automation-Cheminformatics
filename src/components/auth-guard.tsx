"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { onAuthStateChanged } from "firebase/auth";

import { auth } from "@/lib/firebase";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  // Replace your useEffect inside AuthGuard with this:
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
        router.push("/login");
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  // Show a simple loading screen while Firebase checks their credentials
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground animate-pulse">Verifying access...</p>
      </div>
    );
  }

  // CRITICAL FIX: If they are not authenticated, return null.
  // This prevents the dashboard layout from rendering a flash of content
  // or crashing while the router is actively pushing them to /login.
  if (!isAuthenticated) {
    return null;
  }

  // If they pass the check, render the actual page
  return <>{children}</>;
}
