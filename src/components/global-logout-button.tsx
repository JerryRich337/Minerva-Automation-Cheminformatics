"use client";

import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { usePathname, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { auth } from "@/lib/firebase";

export function GlobalLogoutButton() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  const isAuthPage = pathname === "/login"
    || pathname === "/register"
    || pathname.startsWith("/auth/");

  if (!user || isAuthPage) {
    return null;
  }

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <div className="flex items-center justify-between border-b bg-background px-4 py-3 md:px-6">
      
      {/* --- LOGO & CONTACT START --- */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          
          <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
            Beta
          </span>
        </div>
        
        {/* Added Contact Span */}
        <span className="hidden text-xs text-muted-foreground sm:inline-block">
          Contact:{" "}
          <a 
            href="mailto:mtchurch@uwaterloo.ca" 
            className="hover:text-primary hover:underline transition-colors"
          >
            mtchurch@uwaterloo.ca
          </a>
        </span>
      </div>
      {/* --- LOGO & CONTACT END --- */}

      <Button type="button" variant="outline" size="sm" className="gap-2" onClick={handleSignOut}>
        <LogOut className="size-4" />
        Log out
      </Button>
    </div>
  );
}