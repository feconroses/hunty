"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { verifyEmail } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle } from "lucide-react";
import { LoadingSpinner } from "@/components/shared/loading-spinner";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [errorMessage, setErrorMessage] = useState("");
  const hasVerified = useRef(false);

  useEffect(() => {
    if (!token || hasVerified.current) return;
    hasVerified.current = true;

    async function verify() {
      try {
        await verifyEmail(token!);
        setStatus("success");
      } catch {
        setStatus("error");
        setErrorMessage(
          "The verification link is invalid or has expired."
        );
      }
    }

    verify();
  }, [token]);

  if (!token) {
    return (
      <div className="space-y-8">
        <div className="space-y-4 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-red-500/15">
            <XCircle className="size-7 text-red-500" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Invalid link
            </h1>
            <p className="text-lg text-muted-foreground">
              This verification link is missing required information.
            </p>
          </div>
        </div>
        <Link href="/login" className="block w-full">
          <Button variant="outline" className="w-full">
            Go to Login
          </Button>
        </Link>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="flex flex-col items-center py-12">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-lg text-muted-foreground">
          Verifying your email...
        </p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="space-y-8">
        <div className="space-y-4 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-red-500/15">
            <XCircle className="size-7 text-red-500" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Verification failed
            </h1>
            <p className="text-lg text-muted-foreground">{errorMessage}</p>
          </div>
        </div>
        <Link href="/login" className="block w-full">
          <Button variant="outline" className="w-full">
            Go to Login
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-4 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-[#1db954]/15">
          <CheckCircle className="size-7 text-[#1db954]" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Email verified
          </h1>
          <p className="text-lg text-muted-foreground">
            Your email has been verified successfully. You can now sign in.
          </p>
        </div>
      </div>
      <Link href="/login" className="block w-full">
        <Button className="h-11 w-full rounded-xl bg-[#1db954] text-base font-semibold text-black hover:bg-[#1ed760]">
          Sign In
        </Button>
      </Link>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
