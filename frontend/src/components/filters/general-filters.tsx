"use client";

import { useCallback, useMemo } from "react";
import { GripVertical, Trash2 } from "lucide-react";
import type { FilterRule, FilterRuleType } from "@/types";
import {
  IC_SENIORITY_LEVELS,
  MANAGEMENT_SENIORITY_LEVELS,
  SENIORITY_LABELS,
  WORK_TYPES,
} from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { KeywordInput } from "./keyword-input";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";

// ─── Value encoding helpers ─────────────────────────────────────────────────

function encodeValue(category: string, val: string): string {
  return `${category}:${val}`;
}

function decodeValue(encoded: string): { category: string; val: string } {
  const idx = encoded.indexOf(":");
  if (idx === -1) return { category: "free_text", val: encoded };
  return { category: encoded.slice(0, idx), val: encoded.slice(idx + 1) };
}

// ─── Constants ──────────────────────────────────────────────────────────────

const WORK_TYPE_LABELS: Record<string, string> = {
  remote: "Remote",
  hybrid: "Hybrid",
  onsite: "Onsite",
};

const SECTION_LABELS: Record<string, string> = {
  title_include: "Title Keywords (Include)",
  title_exclude: "Title Keywords (Exclude)",
  description_include: "Description Keywords",
  location: "Locations",
  seniority: "Seniority Levels",
  work_type: "Work Type",
  min_salary: "Minimum Salary",
  free_text: "Free-text Criteria",
};

// ─── Sortable Section Wrapper ───────────────────────────────────────────────

function SortableSection({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div className="flex items-start gap-2">
        <button
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          className="mt-0.5 flex shrink-0 cursor-grab touch-none items-center text-muted-foreground hover:text-foreground active:cursor-grabbing"
          tabIndex={-1}
          aria-label={`Drag to reorder ${SECTION_LABELS[id] || id}`}
        >
          <GripVertical className="size-4" />
        </button>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface GeneralFiltersProps {
  filters: FilterRule[];
  sectionOrder: string[];
  onCreate: (data: Partial<FilterRule>) => Promise<FilterRule>;
  onDelete: (id: number) => Promise<void>;
  onReorderSections: (sections: string[]) => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function GeneralFilters({
  filters,
  sectionOrder,
  onCreate,
  onDelete,
  onReorderSections,
}: GeneralFiltersProps) {
  // ── Derived data ──────────────────────────────────────────────────────────

  const byCategory = useMemo(() => {
    const map: Record<string, { rule: FilterRule; val: string }[]> = {};
    for (const f of filters) {
      const { category, val } = decodeValue(f.value);
      const logicGroup = f.logic_group || "all";
      const key = `${category}_${f.rule_type}_${logicGroup}`;
      if (!map[key]) map[key] = [];
      map[key].push({ rule: f, val });
    }
    return map;
  }, [filters]);

  const getKeywords = useCallback(
    (
      category: string,
      ruleType: FilterRuleType,
      logicGroup: string = "all",
    ): string[] => {
      return (
        byCategory[`${category}_${ruleType}_${logicGroup}`] || []
      ).map((e) => e.val);
    },
    [byCategory],
  );

  const getRules = useCallback(
    (
      category: string,
      ruleType: FilterRuleType,
      logicGroup: string = "all",
    ) => {
      return byCategory[`${category}_${ruleType}_${logicGroup}`] || [];
    },
    [byCategory],
  );

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleKeywordsChange = useCallback(
    async (
      category: string,
      ruleType: FilterRuleType,
      logicGroup: string,
      newValues: string[],
    ) => {
      const existing = getRules(category, ruleType, logicGroup);
      const existingVals = existing.map((e) => e.val);

      const added = newValues.filter((v) => !existingVals.includes(v));
      const removed = existing.filter((e) => !newValues.includes(e.val));

      for (const val of added) {
        await onCreate({
          company_id: null,
          rule_type: ruleType,
          value: encodeValue(category, val),
          logic_group: logicGroup,
        });
      }

      for (const entry of removed) {
        await onDelete(entry.rule.id);
      }
    },
    [getRules, onCreate, onDelete],
  );

  const handleCheckboxChange = useCallback(
    async (category: string, val: string, checked: boolean) => {
      if (checked) {
        await onCreate({
          company_id: null,
          rule_type: "include",
          value: encodeValue(category, val),
        });
      } else {
        const existing = getRules(category, "include");
        const match = existing.find((e) => e.val === val);
        if (match) {
          await onDelete(match.rule.id);
        }
      }
    },
    [getRules, onCreate, onDelete],
  );

  const currentSalary = useMemo(() => {
    const entries = getRules("min_salary", "include");
    return entries.length > 0 ? entries[0] : null;
  }, [getRules]);

  const handleSalaryChange = useCallback(
    async (val: string) => {
      if (currentSalary) {
        await onDelete(currentSalary.rule.id);
      }
      if (val && Number(val) > 0) {
        await onCreate({
          company_id: null,
          rule_type: "include",
          value: encodeValue("min_salary", val),
        });
      }
    },
    [currentSalary, onCreate, onDelete],
  );

  const currentFreeText = useMemo(() => {
    const entries = getRules("free_text", "include");
    return entries.length > 0 ? entries[0] : null;
  }, [getRules]);

  const handleFreeTextSave = useCallback(
    async (val: string) => {
      if (currentFreeText) {
        await onDelete(currentFreeText.rule.id);
      }
      if (val.trim()) {
        await onCreate({
          company_id: null,
          rule_type: "include",
          value: encodeValue("free_text", val.trim()),
        });
      }
    },
    [currentFreeText, onCreate, onDelete],
  );

  // ── Drag & Drop ─────────────────────────────────────────────────────────

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = sectionOrder.indexOf(active.id as string);
      const newIndex = sectionOrder.indexOf(over.id as string);
      if (oldIndex === -1 || newIndex === -1) return;

      const newOrder = arrayMove(sectionOrder, oldIndex, newIndex);
      onReorderSections(newOrder);
    },
    [sectionOrder, onReorderSections],
  );

  // ── Section renderers ──────────────────────────────────────────────────

  function renderSection(key: string) {
    switch (key) {
      case "title_include":
        return (
          <div className="space-y-4">
            <Label className="text-base">Title Keywords (Include)</Label>
            <div className="space-y-3 pl-3 border-l-2 border-border">
              <div>
                <KeywordInput
                  label="Must match ALL"
                  value={getKeywords("title", "include", "all")}
                  onChange={(vals) =>
                    handleKeywordsChange("title", "include", "all", vals)
                  }
                  placeholder="e.g. Engineer, Python"
                />
                <p className="mt-1 text-sm text-muted-foreground">
                  Every keyword must appear in the title
                </p>
              </div>
              <div>
                <KeywordInput
                  label="Must match at least ONE"
                  value={getKeywords("title", "include", "any")}
                  onChange={(vals) =>
                    handleKeywordsChange("title", "include", "any", vals)
                  }
                  placeholder="e.g. Frontend, Backend, Fullstack"
                />
                <p className="mt-1 text-sm text-muted-foreground">
                  At least one keyword must appear in the title
                </p>
              </div>
            </div>
          </div>
        );

      case "title_exclude":
        return (
          <div className="space-y-4">
            <Label className="text-base">Title Keywords (Exclude)</Label>
            <div className="space-y-3 pl-3 border-l-2 border-border">
              <div>
                <KeywordInput
                  label="Exclude if ALL appear"
                  value={getKeywords("title", "exclude", "all")}
                  onChange={(vals) =>
                    handleKeywordsChange("title", "exclude", "all", vals)
                  }
                  placeholder="e.g. Intern, Junior"
                />
                <p className="mt-1 text-sm text-muted-foreground">
                  Exclude jobs only if all these keywords appear in the title
                </p>
              </div>
              <div>
                <KeywordInput
                  label="Exclude if ANY appears"
                  value={getKeywords("title", "exclude", "any")}
                  onChange={(vals) =>
                    handleKeywordsChange("title", "exclude", "any", vals)
                  }
                  placeholder="e.g. Manager, Director, VP"
                />
                <p className="mt-1 text-sm text-muted-foreground">
                  Exclude jobs if any of these keywords appear in the title
                </p>
              </div>
            </div>
          </div>
        );

      case "description_include":
        return (
          <div className="space-y-4">
            <Label className="text-base">Description Keywords</Label>
            <div className="space-y-3 pl-3 border-l-2 border-border">
              <div>
                <KeywordInput
                  label="Must mention ALL"
                  value={getKeywords("description", "include", "all")}
                  onChange={(vals) =>
                    handleKeywordsChange(
                      "description",
                      "include",
                      "all",
                      vals,
                    )
                  }
                  placeholder="e.g. machine learning, Python"
                />
                <p className="mt-1 text-sm text-muted-foreground">
                  Every keyword must be mentioned in the description
                </p>
              </div>
              <div>
                <KeywordInput
                  label="Must mention at least ONE"
                  value={getKeywords("description", "include", "any")}
                  onChange={(vals) =>
                    handleKeywordsChange(
                      "description",
                      "include",
                      "any",
                      vals,
                    )
                  }
                  placeholder="e.g. Robotics, Computer Vision, NLP"
                />
                <p className="mt-1 text-sm text-muted-foreground">
                  At least one keyword must be mentioned in the description
                </p>
              </div>
            </div>
          </div>
        );

      case "location":
        return (
          <div>
            <KeywordInput
              label="Locations"
              value={getKeywords("location", "include")}
              onChange={(vals) =>
                handleKeywordsChange("location", "include", "all", vals)
              }
              placeholder="e.g. San Francisco, New York, London"
            />
            <p className="mt-1 text-sm text-muted-foreground">
              Only show jobs from these locations
            </p>
          </div>
        );

      case "seniority":
        return (
          <div className="space-y-3">
            <Label>Seniority Levels</Label>
            <div className="space-y-3 pl-3 border-l-2 border-border">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">IC</p>
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  {IC_SENIORITY_LEVELS.map((level) => {
                    const isChecked = getKeywords(
                      "seniority",
                      "include",
                    ).includes(level);
                    return (
                      <label
                        key={level}
                        className="flex items-center gap-2 text-base cursor-pointer"
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={(checked) =>
                            handleCheckboxChange(
                              "seniority",
                              level,
                              checked === true,
                            )
                          }
                        />
                        {SENIORITY_LABELS[level]}
                      </label>
                    );
                  })}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Management</p>
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  {MANAGEMENT_SENIORITY_LEVELS.map((level) => {
                    const isChecked = getKeywords(
                      "seniority",
                      "include",
                    ).includes(level);
                    return (
                      <label
                        key={level}
                        className="flex items-center gap-2 text-base cursor-pointer"
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={(checked) =>
                            handleCheckboxChange(
                              "seniority",
                              level,
                              checked === true,
                            )
                          }
                        />
                        {SENIORITY_LABELS[level]}
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Only show jobs matching these seniority levels
            </p>
          </div>
        );

      case "work_type":
        return (
          <div className="space-y-2">
            <Label>Work Type</Label>
            <div className="flex flex-wrap gap-4">
              {WORK_TYPES.map((wt) => {
                const isChecked = getKeywords(
                  "work_type",
                  "include",
                ).includes(wt);
                return (
                  <label
                    key={wt}
                    className="flex items-center gap-2 text-base cursor-pointer"
                  >
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={(checked) =>
                        handleCheckboxChange(
                          "work_type",
                          wt,
                          checked === true,
                        )
                      }
                    />
                    {WORK_TYPE_LABELS[wt]}
                  </label>
                );
              })}
            </div>
            <p className="text-sm text-muted-foreground">
              Only show jobs matching these work arrangements
            </p>
          </div>
        );

      case "min_salary":
        return (
          <div className="space-y-1.5">
            <Label>Minimum Salary</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                step={1000}
                placeholder="e.g. 80000"
                defaultValue={currentSalary?.val ?? ""}
                className="w-48"
                onBlur={(e) => handleSalaryChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSalaryChange(e.currentTarget.value);
                  }
                }}
              />
              {currentSalary && (
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => onDelete(currentSalary.rule.id)}
                >
                  <Trash2 className="size-3.5 text-muted-foreground" />
                </Button>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Exclude jobs below this annual salary
            </p>
          </div>
        );

      case "free_text":
        return (
          <div className="space-y-1.5">
            <Label>Free-text Criteria</Label>
            <Textarea
              placeholder="Describe additional criteria in natural language, e.g. 'I prefer companies with 50-500 employees that use modern tech stacks...'"
              defaultValue={currentFreeText?.val ?? ""}
              rows={3}
              onBlur={(e) => handleFreeTextSave(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Additional instructions for the AI when evaluating job relevance
            </p>
          </div>
        );

      default:
        return null;
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={sectionOrder}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-6">
          {sectionOrder.map((key, index) => (
            <div key={key}>
              {index > 0 && <Separator className="mb-6" />}
              <SortableSection id={key}>{renderSection(key)}</SortableSection>
            </div>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
