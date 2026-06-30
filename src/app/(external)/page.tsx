"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";

import { Button } from "@/components/ui/button";
import { auth } from "@/lib/firebase";

export default function WelcomePage() {
  const [error, setError] = useState("");
  const router = useRouter();

  const handleDemoLogin = async () => {
    setError("");
    try {
      // 1. Authenticate using the hardcoded demo credentials
      await signInWithEmailAndPassword(auth, "demo@gmail.com", "password123");

      // 2. Redirect after a short delay to ensure auth state is fully propagated
      setTimeout(() => {
        router.push("/dashboard/default");
      }, 500);
    } catch (err: any) {
      console.error("Auth Error:", err);
      setError("Demo login failed. Please ensure the demo user exists in Firebase Auth.");
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <div className="mx-auto flex w-full max-w-[400px] flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">Welcome to Minerva Automation</h1>
          <p className="text-sm text-muted-foreground">Please log in or create an account to access your dashboard.</p>
        </div>

        <div className="flex flex-col gap-4">
          <Link href="/login" className="w-full">
            <Button className="w-full">Log In</Button>
          </Link>
          <Link href="/register" className="w-full">
            <Button variant="outline" className="w-full">
              Create Account
            </Button>
          </Link>

          {/* --- DEMO BUTTON SECTION --- */}
          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          <Button variant="secondary" type="button" className="w-full cursor-pointer" onClick={handleDemoLogin}>
            Try Demo
          </Button>
          {/* --------------------------- */}
        </div>

        {error && <p className="text-center text-sm text-red-500">{error}</p>}
      </div>
    </div>
  );
}