"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";

const EMPLOYMENT_TYPE_OPTIONS = [
  { value: "full_time", label: "Full-time" },
  { value: "part_time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "internship", label: "Internship" },
  { value: "volunteer", label: "Volunteer" },
] as const;

interface CreateLinkedInSearchData {
  keywords: string;
  location: string;
  geo_id: string;
  employment_types: string[];
}

interface AddSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateLinkedInSearchData) => Promise<void>;
  editSearch?: { keywords: string; location: string | null; geo_id?: string; employment_types?: string[] | null } | null;
}

export function AddSearchDialog({
  open,
  onOpenChange,
  onSubmit,
  editSearch,
}: AddSearchDialogProps) {
  const isEdit = !!editSearch;
  const [formData, setFormData] = useState<CreateLinkedInSearchData>({
    keywords: "",
    location: "",
    geo_id: "",
    employment_types: [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open && editSearch) {
      setFormData({
        keywords: editSearch.keywords,
        location: editSearch.location || "",
        geo_id: editSearch.geo_id || "",
        employment_types: editSearch.employment_types || [],
      });
    } else if (!open) {
      setFormData({ keywords: "", location: "", geo_id: "", employment_types: [] });
    }
    setIsSubmitting(false);
  }, [open, editSearch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.keywords.trim() || !formData.location.trim() || !formData.geo_id.trim()) return;

    try {
      setIsSubmitting(true);
      await onSubmit({
        keywords: formData.keywords.trim(),
        location: formData.location.trim(),
        geo_id: formData.geo_id.trim(),
        employment_types: formData.employment_types,
      });
      onOpenChange(false);
    } catch {
      // Error handled by caller
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit LinkedIn Search" : "Add LinkedIn Search"}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? "Update the keywords or location for this search."
                : "Define a LinkedIn job search to discover new opportunities."}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            {/* Keywords */}
            <div className="space-y-2">
              <Label htmlFor="search-keywords">
                Describe the job you want *
              </Label>
              <Input
                id="search-keywords"
                placeholder="e.g., Senior ML engineer at a startup"
                value={formData.keywords}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    keywords: e.target.value,
                  }))
                }
                required
                disabled={isSubmitting}
                autoFocus
              />
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="search-location">Location *</Label>
              <Input
                id="search-location"
                placeholder="e.g., Berlin"
                value={formData.location}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    location: e.target.value,
                  }))
                }
                required
                disabled={isSubmitting}
              />
            </div>

            {/* Geo ID */}
            <div className="space-y-2">
              <Label htmlFor="search-geo-id">LinkedIn Geo ID *</Label>
              <Input
                id="search-geo-id"
                placeholder="e.g., 106967730"
                value={formData.geo_id}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    geo_id: e.target.value,
                  }))
                }
                required
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground">
                Go to linkedin.com/jobs, type a location, and copy the geoId value from the URL (e.g., geoId=106967730).
              </p>
            </div>

            {/* Employment Type */}
            <div className="space-y-2">
              <Label>Employment Type</Label>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {EMPLOYMENT_TYPE_OPTIONS.map((option) => (
                  <div key={option.value} className="flex items-center gap-2">
                    <Checkbox
                      id={`employment-${option.value}`}
                      checked={formData.employment_types.includes(option.value)}
                      onCheckedChange={(checked) => {
                        setFormData((prev) => ({
                          ...prev,
                          employment_types: checked
                            ? [...prev.employment_types, option.value]
                            : prev.employment_types.filter((t) => t !== option.value),
                        }));
                      }}
                      disabled={isSubmitting}
                    />
                    <Label
                      htmlFor={`employment-${option.value}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {option.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !formData.keywords.trim() || !formData.location.trim() || !formData.geo_id.trim()}
              className="bg-[#1db954] hover:bg-[#1ed760] text-black font-semibold"
            >
              {isSubmitting && <Loader2 className="animate-spin" />}
              {isEdit ? "Save Changes" : "Add Search"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export type { CreateLinkedInSearchData };
