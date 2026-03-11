"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Github,
  Building2,
  Filter,
  Columns3,
  Chrome,
  Terminal,
  ArrowRight,
} from "lucide-react";

// ─── Typing Animation Hook ─────────────────────────────────────────────────

function useTypingAnimation(text: string, speed = 80, startDelay = 600) {
  const [displayedText, setDisplayedText] = useState("");
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    let index = 0;
    let timeout: ReturnType<typeof setTimeout>;

    const startTyping = () => {
      timeout = setTimeout(function type() {
        if (index < text.length) {
          setDisplayedText(text.slice(0, index + 1));
          index++;
          timeout = setTimeout(type, speed);
        } else {
          setIsComplete(true);
        }
      }, speed);
    };

    const delayTimeout = setTimeout(startTyping, startDelay);

    return () => {
      clearTimeout(delayTimeout);
      clearTimeout(timeout);
    };
  }, [text, speed, startDelay]);

  return { displayedText, isComplete };
}

// ─── Terminal Window Component ──────────────────────────────────────────────

function TerminalWindow({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-2xl overflow-hidden rounded-xl border border-[#1db954]/20 bg-[#0a0a0a] shadow-[0_0_60px_-15px_rgba(29,185,84,0.15)]">
      {/* Title bar */}
      <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3">
        <div className="size-3 rounded-full bg-[#ff5f57]" />
        <div className="size-3 rounded-full bg-[#febc2e]" />
        <div className="size-3 rounded-full bg-[#28c840]" />
        <span className="ml-2 font-mono text-xs text-white/30">
          hunty -- bash
        </span>
      </div>
      {/* Terminal body */}
      <div className="p-5 sm:p-6">{children}</div>
    </div>
  );
}

// ─── Feature Card ───────────────────────────────────────────────────────────

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="group rounded-xl border border-dashed border-[#1db954]/30 bg-[#0a0a0a] p-5 transition-all hover:border-[#1db954]/60 hover:shadow-[0_0_30px_-10px_rgba(29,185,84,0.1)]">
      <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-[#1db954]/10 text-[#1db954]">
        {icon}
      </div>
      <h3 className="mb-1.5 font-mono text-sm font-semibold text-white">
        {title}
      </h3>
      <p className="text-sm leading-relaxed text-white/50">{description}</p>
    </div>
  );
}

// ─── Landing Page ───────────────────────────────────────────────────────────

export default function HomePage() {
  const { displayedText, isComplete } = useTypingAnimation("hunty start", 90, 800);

  return (
    <div className="min-h-screen bg-[#121212] text-white">
      {/* Background glow effects */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 -translate-x-1/2 h-[600px] w-[900px] rounded-full bg-[#1db954]/[0.04] blur-[100px]" />
        <div className="absolute right-0 top-1/3 h-[400px] w-[400px] rounded-full bg-[#1db954]/[0.02] blur-[80px]" />
      </div>

      {/* ── Nav Bar ──────────────────────────────────────────────────────── */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-10">
        <Link href="/" className="flex items-center gap-0.5">
          <span className="text-xl font-bold tracking-tight text-white">
            Hunty
          </span>
          <span className="text-xl font-bold text-[#1db954]">.</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button
              variant="ghost"
              className="text-white/70 hover:text-white hover:bg-white/5"
            >
              Sign In
            </Button>
          </Link>
          <Link href="/register">
            <Button className="bg-[#1db954] font-semibold text-black hover:bg-[#1ed760]">
              Get Started
            </Button>
          </Link>
        </div>
      </nav>

      {/* ── Hero Section ─────────────────────────────────────────────────── */}
      <section className="relative z-10 flex flex-col items-center px-6 pt-16 pb-20 text-center sm:pt-24 sm:pb-28">
        <TerminalWindow>
          <div className="font-mono text-sm sm:text-base">
            <div className="flex items-center gap-2">
              <span className="text-[#1db954]">$</span>
              <span className="text-white/90">{displayedText}</span>
              <span
                className={`inline-block h-4 w-2 bg-[#1db954] ${
                  isComplete ? "animate-pulse" : "animate-blink"
                }`}
              />
            </div>
            {isComplete && (
              <div className="mt-3 space-y-1 text-white/40">
                <p>
                  <span className="text-[#1db954]">{'>'}</span> Initializing job search pipeline...
                </p>
                <p>
                  <span className="text-[#1db954]">{'>'}</span> Loading target companies...
                </p>
                <p>
                  <span className="text-[#1db954]">{'>'}</span> Ready. Happy hunting.
                </p>
              </div>
            )}
          </div>
        </TerminalWindow>

        <h1 className="mt-10 max-w-xl text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
          Open-source job search,{" "}
          <span className="text-[#1db954]">powered by AI</span>
        </h1>
        <p className="mt-4 max-w-lg text-base text-white/50 sm:text-lg">
          Define your target companies. Set your criteria. Let Claude find and
          evaluate jobs for you.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/register">
            <Button
              size="lg"
              className="w-full bg-[#1db954] px-8 font-semibold text-black hover:bg-[#1ed760] sm:w-auto"
            >
              Get Started
              <ArrowRight className="size-4" />
            </Button>
          </Link>
          <a
            href="https://github.com/hunty"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button
              size="lg"
              variant="outline"
              className="w-full border-white/10 bg-transparent px-8 text-white/70 hover:border-white/20 hover:bg-white/5 hover:text-white sm:w-auto"
            >
              <Github className="size-4" />
              View on GitHub
            </Button>
          </a>
        </div>
      </section>

      {/* ── Features Section ─────────────────────────────────────────────── */}
      <section className="relative z-10 px-6 pb-20 sm:px-10 sm:pb-28">
        <div className="mx-auto max-w-5xl">
          <div className="mb-10 text-center">
            <p className="font-mono text-xs uppercase tracking-widest text-[#1db954]/70">
              Features
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Everything you need to land your next role
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              icon={<Building2 className="size-5" />}
              title="Define Companies"
              description="Add your target companies and automatically discover their careers pages."
            />
            <FeatureCard
              icon={<Filter className="size-5" />}
              title="Smart Filtering"
              description="Set rules and let AI evaluate job relevance based on your criteria."
            />
            <FeatureCard
              icon={<Columns3 className="size-5" />}
              title="Kanban Pipeline"
              description="Track applications from discovery through interview to offer."
            />
            <FeatureCard
              icon={<Chrome className="size-5" />}
              title="Claude Automation"
              description="Browser tasks powered by Claude in Chrome to scan and evaluate jobs."
            />
          </div>
        </div>
      </section>

      {/* ── Docker / Getting Started Section ─────────────────────────────── */}
      <section className="relative z-10 px-6 pb-20 sm:px-10 sm:pb-28">
        <div className="mx-auto max-w-2xl">
          <div className="mb-8 text-center">
            <p className="font-mono text-xs uppercase tracking-widest text-[#1db954]/70">
              Quick Start
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Up and running in seconds
            </h2>
          </div>

          <TerminalWindow>
            <div className="space-y-2 font-mono text-sm">
              <div>
                <span className="text-[#1db954]">$</span>{" "}
                <span className="text-white/80">
                  git clone https://github.com/yourusername/hunty.git
                </span>
              </div>
              <div>
                <span className="text-[#1db954]">$</span>{" "}
                <span className="text-white/80">cd hunty</span>
              </div>
              <div>
                <span className="text-[#1db954]">$</span>{" "}
                <span className="text-white/80">docker compose up</span>
              </div>
              <div className="pt-1">
                <span className="text-[#1db954]/60">
                  # Open http://localhost:3000
                </span>
              </div>
            </div>
          </TerminalWindow>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-white/5 px-6 py-10 text-center">
        <p className="text-sm text-white/40">
          Built for job seekers. Open source &amp; free.
        </p>
        <a
          href="https://github.com/hunty"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-2 text-sm text-white/30 transition-colors hover:text-[#1db954]"
        >
          <Github className="size-4" />
          Star on GitHub
        </a>
        <div className="mt-6 font-mono text-xs text-white/20">
          <span className="text-[#1db954]/40">$</span> exit 0
        </div>
      </footer>

    </div>
  );
}
