"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { auth } from "@/lib/firebase";

export default function WelcomePage() {
  const router = useRouter();
  const [isLoggingInDemo, setIsLoggingInDemo] = useState(false);

  const handleDemoLogin = async () => {
    setIsLoggingInDemo(true);
    try {
      // Replace with your actual Firebase demo credentials
      await signInWithEmailAndPassword(auth, "demo@minerva.com", "password123");
      toast.success("Logged in with demo account!");
      router.push("/dashboard"); 
    } catch (error) {
      console.error("Demo login error:", error);
      toast.error("Failed to log in with demo credentials.");
    } finally {
      setIsLoggingInDemo(false);
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
            <Button className="w-full" disabled={isLoggingInDemo}>Log In</Button>
          </Link>
          <Link href="/register" className="w-full">
            <Button variant="outline" className="w-full" disabled={isLoggingInDemo}>
              Create Account
            </Button>
          </Link>
          
          {/* New Try Demo Button */}
          <Button 
            variant="outline" 
            className="w-full cursor-pointer" 
            onClick={handleDemoLogin}
            disabled={isLoggingInDemo}
          >
            {isLoggingInDemo ? "Connecting..." : "Try Demo"}
          </Button>
        </div>
      </div>
    </div>
  );
}