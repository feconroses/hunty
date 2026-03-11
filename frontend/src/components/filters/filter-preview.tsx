"use client";

import { useState, useCallback, useEffect } from "react";
import { RefreshCw, Eye } from "lucide-react";
import type { Company } from "@/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─── Props ──────────────────────────────────────────────────────────────────

interface FilterPreviewProps {
  companies: Company[];
  getFilterPrompt: (companyId: number | string) => Promise<string>;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function FilterPreview({
  companies,
  getFilterPrompt,
}: FilterPreviewProps) {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("_general");
  const [promptText, setPromptText] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPrompt = useCallback(
    async (companyId: string) => {
      try {
        setLoading(true);
        setError(null);
        const text = await getFilterPrompt(companyId === "_general" ? "general" : Number(companyId));
        setPromptText(text);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load prompt preview";
        setError(message);
        setPromptText("");
      } finally {
        setLoading(false);
      }
    },
    [getFilterPrompt],
  );

  useEffect(() => {
    fetchPrompt(selectedCompanyId);
  }, [selectedCompanyId, fetchPrompt]);

  const handleRefresh = useCallback(() => {
    fetchPrompt(selectedCompanyId);
  }, [selectedCompanyId, fetchPrompt]);

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-2">
        <div className="flex-1 space-y-1.5">
          <Label>Preview Prompt For</Label>
          <Select
            value={selectedCompanyId}
            onValueChange={(value) => setSelectedCompanyId(value ?? "_general")}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select context..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_general">
                <Eye className="size-3.5 text-muted-foreground" />
                General (no company)
              </SelectItem>
              {companies.map((company) => (
                <SelectItem key={company.id} value={String(company.id)}>
                  {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={handleRefresh}
          disabled={loading}
          title="Refresh prompt"
        >
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="relative rounded-lg bg-muted/50 p-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <RefreshCw className="size-3.5 animate-spin" />
            Loading prompt preview...
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : promptText ? (
          <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-foreground/90">
            {promptText}
          </pre>
        ) : (
          <p className="text-sm text-muted-foreground">
            No prompt generated. Add some filter rules first.
          </p>
        )}
      </div>
    </div>
  );
}
