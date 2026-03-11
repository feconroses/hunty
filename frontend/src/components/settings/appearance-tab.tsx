"use client";

import { useTheme } from "@/contexts/theme-context";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Moon, Sun } from "lucide-react";

export function AppearanceTab() {
  const { theme, setTheme } = useTheme();

  const isDark = theme === "dark";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>Customize the look and feel of Hunty</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isDark ? (
              <Moon className="size-5 text-muted-foreground" />
            ) : (
              <Sun className="size-5 text-yellow-500" />
            )}
            <div>
              <Label className="text-sm font-medium">Dark Mode</Label>
              <p className="text-xs text-muted-foreground">
                {isDark
                  ? "Dark theme is active"
                  : "Light theme is active"}
              </p>
            </div>
          </div>
          <Switch
            checked={isDark}
            onCheckedChange={(checked) =>
              setTheme(checked ? "dark" : "light")
            }
          />
        </div>

        {/* Preview */}
        <div className="rounded-lg border border-border/50 p-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            Preview
          </p>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="size-3 rounded-full bg-[#1db954]" />
              <span className="text-sm text-foreground">
                Currently using{" "}
                <span className="font-semibold">
                  {isDark ? "dark" : "light"}
                </span>{" "}
                mode
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Your interface colors and contrasts are optimized for{" "}
              {isDark ? "low-light environments" : "bright environments"}.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
