"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  Kanban,
  ListTodo,
  Filter,
  Activity,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
  { href: "/companies", label: "Target Companies", icon: Building2 },
  { href: "/linkedin-searches", label: "LinkedIn Searches", icon: Search },
  { href: "/jobs", label: "Jobs", icon: Kanban },
  { href: "/tasks", label: "Tasks", icon: ListTodo },
  { href: "/filters", label: "Filters", icon: Filter },
  { href: "/activity", label: "Activity Log", icon: Activity },
];

interface SidebarProps {
  onClose?: () => void;
  className?: string;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function Sidebar({ onClose, className }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <aside
      className={cn(
        "flex h-full w-[240px] flex-col bg-[#121212] border-r border-border select-none",
        className
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between border-b border-border/50 px-5 py-4">
        <Link href="/jobs" className="flex items-center gap-1">
          <span className="text-xl font-semibold tracking-tight text-foreground">
            Hunty
          </span>
          <span className="text-3xl text-[#1db954] font-bold">.</span>
        </Link>
        {onClose && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            className="md:hidden"
          >
            <ChevronLeft className="size-4" />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <p className="px-3 pb-2 text-sm font-medium uppercase tracking-widest text-muted-foreground/70">
          Navigation
        </p>
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-base font-medium transition-all duration-150",
                isActive
                  ? "bg-muted text-primary before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-4 before:w-[3px] before:rounded-full before:bg-primary"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              <Icon className={cn("size-4 shrink-0", !isActive && "opacity-60")} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User Menu */}
      {user && (
        <div className="border-t border-border/50 p-3">
          <DropdownMenu>
            <DropdownMenuTrigger
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-base transition-all duration-150 hover:bg-muted/60"
            >
              <Avatar size="sm">
                <AvatarFallback className="bg-primary/20 text-primary text-xs">
                  {getInitials(`${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left min-w-0">
                <p className="truncate text-base font-medium text-foreground">
                  {`${user.first_name || ""} ${user.last_name || ""}`.trim() || "User"}
                </p>
                <p className="truncate text-sm text-muted-foreground">
                  {user.email}
                </p>
              </div>
              <ChevronRight className="size-3 shrink-0 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="top"
              align="start"
              sideOffset={8}
              className="w-56"
            >
              <DropdownMenuItem>
                <Link href="/settings" className="flex items-center gap-2 w-full">
                  <Settings className="size-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="size-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </aside>
  );
}
