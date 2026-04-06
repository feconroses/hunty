import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Github,
  Building2,
  Columns3,
  Chrome,
  ArrowRight,
  Search,
} from "lucide-react";

// ─── Feature Card ───────────────────────────────────────────────────────────

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="group rounded-xl border border-white/[0.06] bg-[#181818] p-6 transition-all duration-300 hover:border-white/[0.12] hover:bg-[#1c1c1c]">
      <div className="mb-4 flex size-10 items-center justify-center rounded-lg bg-[#1db954]/10 text-[#1db954] transition-colors group-hover:bg-[#1db954]/15">
        {icon}
      </div>
      <h3 className="mb-2 text-xl font-bold text-white">
        {title}
      </h3>
      <p className="text-base leading-relaxed text-white/60">{description}</p>
    </div>
  );
}

// ─── Step Card ───────────────────────────────────────────────────────────────

interface StepCardProps {
  number: string;
  title: string;
  description: string;
  code?: string;
}

function StepCard({ number, title, description, code }: StepCardProps) {
  return (
    <div className="relative">
      <span className="text-6xl font-extrabold text-[#1db954]/15">
        {number}
      </span>
      <h3 className="mt-3 text-xl font-bold text-white">
        {title}
      </h3>
      <p className="mt-2 text-base leading-relaxed text-white/60">
        {description}
      </p>
      {code && (
        <div className="mt-3 rounded-md border border-white/[0.06] bg-[#0a0a0a] px-3 py-2">
          <code className="font-mono text-sm text-white/60">{code}</code>
        </div>
      )}
    </div>
  );
}

// ─── Landing Page ───────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#121212] text-white">
      {/* Dot grid background */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      {/* ── Sticky Navbar ──────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#121212]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
          <Link href="/" className="flex items-center gap-0.5">
            <span className="text-2xl font-extrabold tracking-tight text-white">
              Hunty
            </span>
            <span className="text-2xl font-bold text-[#1db954]">.</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button
                variant="ghost"
                className="text-white/70 hover:bg-white/5 hover:text-white"
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
        </div>
      </nav>

      {/* ── Hero Section ─────────────────────────────────────────────── */}
      <section className="relative z-10 flex flex-col items-center px-6 pt-20 pb-16 text-center sm:pt-28 sm:pb-20">
        {/* Radial glow */}
        <div className="pointer-events-none absolute -top-[200px] left-1/2 h-[600px] w-[800px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(29,185,84,0.08)_0%,transparent_70%)] blur-[60px]" />

        {/* Pill badge */}
        <span
          className="animate-fade-in-up inline-flex items-center gap-1.5 rounded-full border border-[#1db954]/20 bg-[#1db954]/10 px-3 py-1 text-sm font-medium text-[#1db954]"
        >
          Open Source & Self-Hosted
        </span>

        {/* Headline */}
        <h1
          className="animate-fade-in-up mt-6 max-w-3xl text-5xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-6xl lg:text-8xl"
          style={{ animationDelay: "100ms" }}
        >
          Your job search,{" "}
          <span className="bg-gradient-to-r from-[#1db954] to-[#1ed760] bg-clip-text text-transparent">
            automated
          </span>
        </h1>

        {/* Subheadline */}
        <p
          className="animate-fade-in-up mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/60 sm:text-xl"
          style={{ animationDelay: "200ms" }}
        >
          Define target companies, set your criteria, and let Claude discover
          and evaluate jobs for you. Open source, self-hosted, yours.
        </p>

        {/* CTAs */}
        <div
          className="animate-fade-in-up mt-8 flex flex-col gap-3 sm:flex-row"
          style={{ animationDelay: "300ms" }}
        >
          <Link href="/register">
            <Button
              size="lg"
              className="h-11 w-full bg-[#1db954] px-6 font-semibold text-black hover:bg-[#1ed760] sm:w-auto"
            >
              Get Started
              <ArrowRight className="size-4" />
            </Button>
          </Link>
          <a
            href="https://github.com/federicopasqualito/hunty"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button
              size="lg"
              variant="outline"
              className="h-11 w-full border-white/10 bg-white/[0.03] px-6 text-white/70 hover:border-white/15 hover:bg-white/[0.06] hover:text-white sm:w-auto"
            >
              <Github className="size-4" />
              View on GitHub
            </Button>
          </a>
        </div>

        {/* Hero Screenshot */}
        <div
          className="animate-fade-in-up relative mx-auto mt-16 max-w-5xl w-full"
          style={{ animationDelay: "500ms" }}
        >
          {/* Glow behind screenshot */}
          <div className="pointer-events-none absolute -inset-x-20 -top-20 h-[600px] bg-[radial-gradient(ellipse_at_center,rgba(29,185,84,0.12)_0%,transparent_70%)]" />

          {/* Browser chrome mockup */}
          <div className="group relative overflow-hidden rounded-xl border border-white/[0.08] bg-[#0a0a0a] shadow-2xl shadow-black/50 [perspective:2000px]">
            {/* Title bar */}
            <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
              <div className="size-2.5 rounded-full bg-[#ff5f57]" />
              <div className="size-2.5 rounded-full bg-[#febc2e]" />
              <div className="size-2.5 rounded-full bg-[#28c840]" />
              <div className="ml-3 flex-1 rounded-md bg-white/[0.04] px-3 py-1">
                <span className="text-sm text-white/40">
                  localhost:3000/jobs
                </span>
              </div>
            </div>
            {/* Screenshot */}
            <div className="transition-transform duration-600 ease-[cubic-bezier(0.16,1,0.3,1)] [transform:rotateX(2deg)] group-hover:[transform:rotateX(0deg)]">
              <Image
                src="/images/hero-dashboard.png"
                alt="Hunty kanban dashboard"
                width={1920}
                height={1080}
                className="w-full"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Badge Strip ──────────────────────────────────────────────── */}
      <section className="relative z-10 py-16">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-x-8 gap-y-4">
          {[
            "Built with Next.js & FastAPI",
            "100% Self-Hosted",
            "No Vendor Lock-in",
            "Claude AI Powered",
          ].map((label) => (
            <span
              key={label}
              className="flex items-center gap-2 text-sm text-white/50"
            >
              <span className="size-1 rounded-full bg-[#1db954]/40" />
              {label}
            </span>
          ))}
        </div>
      </section>

      {/* ── Features Section ─────────────────────────────────────────── */}
      <section className="relative z-10 px-6 pb-20 sm:px-10 sm:pb-28">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <p className="text-base font-medium text-[#1db954]">Features</p>
            <h2 className="mt-2 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
              Everything you need to land your next role
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-lg text-white/60">
              From company tracking to automated job discovery, Hunty handles
              your entire job search pipeline.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              icon={<Building2 className="size-5" />}
              title="Target Companies"
              description="Add your target companies and automatically discover their careers pages. Manage everything in a clean table view."
            />
            <FeatureCard
              icon={<Search className="size-5" />}
              title="LinkedIn Searches"
              description="Define keyword searches and scan LinkedIn for matching job postings. Filter by location, experience, and more."
            />
            <FeatureCard
              icon={<Columns3 className="size-5" />}
              title="AI-Powered Pipeline"
              description="Jobs are discovered, evaluated against your filters, and flow through a kanban pipeline from discovery to offer."
            />
            <FeatureCard
              icon={<Chrome className="size-5" />}
              title="Claude Automation"
              description="Browser tasks powered by Claude scan career pages, evaluate relevance, and create jobs automatically."
            />
          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────────────── */}
      <section className="relative z-10 px-6 pb-20 sm:px-10 sm:pb-28">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <p className="text-base font-medium text-[#1db954]">How it works</p>
            <h2 className="mt-2 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
              From setup to your first automated job scan
            </h2>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <StepCard
              number="01"
              title="Self-host in seconds"
              description="Clone the repo, run one command, and you're live. Your data stays on your infrastructure."
              code="docker compose up"
            />
            <StepCard
              number="02"
              title="Define your targets"
              description="Add companies you want to work for. Set your filters for role, location, seniority, and more."
            />
            <StepCard
              number="03"
              title="Let Claude work"
              description="Queue browser tasks for Claude to scan careers pages, discover jobs, and evaluate them against your criteria."
            />
          </div>
        </div>
      </section>

      {/* ── Open Source CTA ───────────────────────────────────────────── */}
      <section className="relative z-10 px-6 py-20 sm:px-10">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-[#1db954]/[0.03] to-transparent" />
        <div className="relative mx-auto max-w-3xl text-center">
          <h2 className="text-4xl font-extrabold text-white sm:text-5xl">
            Open source. Self-hosted.{" "}
            <span className="text-[#1db954]">Yours.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-lg text-white/60">
            Hunty is free and open source. Star us on GitHub, contribute, or
            just use it.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/register">
              <Button
                size="lg"
                className="h-11 w-full bg-[#1db954] px-6 font-semibold text-black hover:bg-[#1ed760] sm:w-auto"
              >
                Get Started
                <ArrowRight className="size-4" />
              </Button>
            </Link>
            <a
              href="https://github.com/federicopasqualito/hunty"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button
                size="lg"
                variant="outline"
                className="h-11 w-full border-white/10 bg-white/[0.03] px-6 text-white/70 hover:border-white/15 hover:bg-white/[0.06] hover:text-white sm:w-auto"
              >
                <Github className="size-4" />
                Star on GitHub
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-white/[0.06] px-6 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-0.5">
              <span className="text-base font-bold text-white/60">
                Hunty
              </span>
              <span className="text-base font-bold text-[#1db954]/60">.</span>
            </Link>
            <span className="text-sm text-white/50">
              &copy; {new Date().getFullYear()}
            </span>
          </div>
          <div className="flex items-center gap-6">
            <a
              href="https://github.com/federicopasqualito/hunty"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-base text-white/50 transition-colors hover:text-white/60"
            >
              <Github className="size-3.5" />
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
