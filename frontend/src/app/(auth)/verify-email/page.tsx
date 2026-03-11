"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { verifyEmail } from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-red-500/15">
            <XCircle className="size-6 text-red-500" />
          </div>
          <CardTitle className="text-xl">Invalid Link</CardTitle>
          <CardDescription>
            This verification link is missing required information.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/login" className="block w-full">
            <Button variant="outline" className="w-full">
              Go to Login
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (status === "loading") {
    return (
      <Card>
        <CardContent className="py-12">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Verifying your email...
          </p>
        </CardContent>
      </Card>
    );
  }

  if (status === "error") {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-red-500/15">
            <XCircle className="size-6 text-red-500" />
          </div>
          <CardTitle className="text-xl">Verification Failed</CardTitle>
          <CardDescription>{errorMessage}</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/login" className="block w-full">
            <Button variant="outline" className="w-full">
              Go to Login
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-[#1db954]/15">
          <CheckCircle className="size-6 text-[#1db954]" />
        </div>
        <CardTitle className="text-xl">Email Verified</CardTitle>
        <CardDescription>
          Your email has been verified successfully. You can now sign in.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Link href="/login" className="block w-full">
          <Button className="w-full bg-[#1db954] hover:bg-[#1ed760] text-black font-semibold">
            Sign In
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <Card>
          <CardContent className="py-12">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-center text-sm text-muted-foreground">
              Loading...
            </p>
          </CardContent>
        </Card>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
