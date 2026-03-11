"use client";

import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MobileHeaderProps {
  onMenuClick: () => void;
}

export function MobileHeader({ onMenuClick }: MobileHeaderProps) {
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border/50 bg-background/80 px-4 py-3 backdrop-blur-md md:hidden">
      <Button variant="ghost" size="icon" onClick={onMenuClick}>
        <Menu className="size-5" />
        <span className="sr-only">Open menu</span>
      </Button>

      <div className="flex items-center gap-1">
        <span className="text-xl font-semibold tracking-tight text-foreground">
          Hunty
        </span>
        <span className="text-xl text-[#1db954] font-bold">.</span>
      </div>

      {/* Spacer to keep logo centered */}
      <div className="size-8" />
    </header>
  );
}
