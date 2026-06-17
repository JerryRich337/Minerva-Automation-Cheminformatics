import type { ReactNode } from "react";

import AuthGuard from "@/components/auth-guard";

export default async function Layout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <AuthGuard>
      {/* This keeps a standard full-height container and preserves your 
        original dashboard padding so your elements don't smash against the screen edges.
      */}
      <div className="min-h-screen bg-background text-foreground">
        <main className="h-full p-4 md:p-6">{children}</main>
      </div>
    </AuthGuard>
  );
}
