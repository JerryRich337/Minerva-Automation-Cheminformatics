import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function WelcomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <div className="mx-auto flex w-full max-w-[400px] flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">
            Welcome to Minerva Automation
          </h1>
          <p className="text-sm text-muted-foreground">
            Please log in or create an account to access your dashboard.
          </p>
        </div>
        
        <div className="flex flex-col gap-4">
          <Link href="/login" className="w-full">
            <Button className="w-full">Log In</Button>
          </Link>
          <Link href="/register" className="w-full">
            <Button variant="outline" className="w-full">Create Account</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}