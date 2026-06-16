"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); // Clear previous errors
    
    try {
      // 1. Log the user in
      await signInWithEmailAndPassword(auth, email, password);
      
      // 2. THE FIX: Wait 800 milliseconds for Firebase state to update
      // before attempting to navigate to the protected layout.
      setTimeout(() => {
        router.push("/dashboard/default");
      }, 800);
      
    } catch (err: any) {
      // If it fails, show a generic error
      setError("Invalid email or password. Please try again.");
    }
  };

  // Inside your LoginPage component
// Inside your LoginPage component
  const handleDemoLogin = async () => {
    setError("");
    try {
      // 1. Authenticate using the hardcoded demo credentials
      // Make sure these match EXACTLY what you created in Firebase Auth
      await signInWithEmailAndPassword(auth, "demo@gmail.com", "password123");
      
      // 2. Successful login will trigger onAuthStateChanged in your AuthGuard
      // Redirect after a short delay to ensure the auth state is fully propagated
      setTimeout(() => {
        router.push("/dashboard/default");
      }, 500);
      
    } catch (err: any) {
      console.error("Auth Error:", err);
      // Provide a clearer error based on the actual failure
      setError("Demo login failed. Please ensure the demo user exists in Firebase Auth.");
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <div className="w-full max-w-[400px] space-y-6 rounded-lg border p-6 shadow-md">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">Welcome Back</h1>
          <p className="text-muted-foreground">Enter your credentials to access your account</p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="flex h-10 w-full rounded-md border bg-transparent px-3 py-2 text-sm"
              placeholder="name@example.com"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="flex h-10 w-full rounded-md border bg-transparent px-3 py-2 text-sm"
            />
          </div>
          
          {error && <p className="text-sm text-red-500">{error}</p>}
          
          <Button type="submit" className="w-full cursor-pointer">Log In</Button>
        </form>

        {/* --- DEMO BUTTON SECTION --- */}
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Or</span>
          </div>
        </div>

        <Button 
          variant="outline" 
          type="button"
          className="w-full cursor-pointer" 
          onClick={handleDemoLogin}
        >
          Try Demo
        </Button>
        {/* --------------------------- */}
        
        <div className="text-center text-sm">
          Don't have an account?{" "}
          <Link href="/register" className="underline hover:text-primary">
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}