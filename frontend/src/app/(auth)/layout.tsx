"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { AuthBrandingPanel } from "@/components/auth/auth-branding-panel";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isInitializing } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isInitializing && isAuthenticated) {
      router.replace("/jobs");
    }
  }, [isInitializing, isAuthenticated, router]);

  if (isInitializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="flex min-h-screen">
      {/* Left Panel — Branding (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[#0a0a0a]">
        <AuthBrandingPanel />
      </div>

      {/* Right Panel — Form */}
      <div className="flex w-full flex-col bg-background lg:w-1/2">
        {/* Mobile logo */}
        <div className="flex items-center gap-1 px-6 pt-8 lg:hidden">
          <span className="text-2xl font-bold tracking-tight text-foreground">
            Hunty
          </span>
          <span className="text-2xl font-bold text-[#1db954]">.</span>
        </div>

        {/* Form container — vertically centered */}
        <div className="flex flex-1 items-center justify-center px-6 py-12 sm:px-12 lg:px-16 xl:px-24">
          <div className="w-full max-w-[420px] animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
