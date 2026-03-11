"use client";

export function AuthBrandingPanel() {
  return (
    <div className="relative flex h-full w-full flex-col justify-between p-12">
      {/* Background layers */}
      <div className="absolute inset-0">
        {/* Base gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#1db954]/20 via-[#121212] to-[#0a0a0a]" />

        {/* Mesh gradient blobs */}
        <div className="absolute -left-[10%] -top-[20%] h-[600px] w-[600px] rounded-full bg-[#1db954]/15 blur-[120px]" />
        <div className="absolute -bottom-[10%] -right-[15%] h-[500px] w-[500px] rounded-full bg-[#1db954]/10 blur-[100px]" />
        <div className="absolute left-[30%] top-[40%] h-[300px] w-[300px] rounded-full bg-[#1db954]/[0.08] blur-[80px]" />

        {/* Dot grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,1) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
      </div>

      {/* Floating geometric shapes */}
      <div className="animate-float-slow absolute right-[20%] top-[15%] h-20 w-20 rounded-2xl border border-[#1db954]/20" />
      <div className="animate-float-medium absolute bottom-[25%] left-[15%] h-16 w-16 rounded-full border border-[#1db954]/15" />
      <div className="animate-float-fast absolute right-[35%] top-[55%] h-12 w-12 border border-[#1db954]/10" />

      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-center gap-1">
          <span className="text-2xl font-bold tracking-tight text-white">
            Hunty
          </span>
          <span className="text-2xl font-bold text-[#1db954]">.</span>
        </div>
      </div>

      <div className="relative z-10 space-y-4">
        <h2 className="text-3xl font-extrabold leading-tight tracking-tight text-white xl:text-4xl">
          Track your job search
          <br />
          <span className="text-[#1db954]">like a pro.</span>
        </h2>
        <p className="max-w-sm text-sm leading-relaxed text-[#b3b3b3]">
          Open-source job search tracking. Discover opportunities, manage
          applications, and land your next role.
        </p>
      </div>
    </div>
  );
}
