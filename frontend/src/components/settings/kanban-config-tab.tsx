"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import type { KanbanStage } from "@/types";
import { useKanbanStages } from "@/hooks/use-kanban-stages";
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
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  GripVertical,
  X,
  Plus,
  Loader2,
  Check,
  Pencil,
} from "lucide-react";

// ─── Preset Colors ──────────────────────────────────────────────────────────

const PRESET_COLORS = [
  "#6366f1",
  "#3b82f6",
  "#1db954",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#64748b",
];

// ─── Sortable Stage Item ────────────────────────────────────────────────────

interface SortableStageProps {
  stage: KanbanStage;
  onUpdate: (id: number, data: Partial<KanbanStage>) => Promise<KanbanStage>;
  onDelete: (id: number) => Promise<void>;
}

function SortableStageItem({ stage, onUpdate, onDelete }: SortableStageProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stage.id });

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(stage.name);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  async function handleSaveName() {
    if (!editName.trim()) {
      toast.error("Stage name cannot be empty");
      return;
    }

    if (editName.trim() === stage.name) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await onUpdate(stage.id, { name: editName.trim() });
      setIsEditing(false);
      toast.success("Stage name updated");
    } catch {
      toast.error("Failed to update stage name");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleColorChange(color: string) {
    try {
      await onUpdate(stage.id, { color });
      setShowColorPicker(false);
    } catch {
      toast.error("Failed to update stage color");
    }
  }

  async function handleDelete() {
    if (stage.is_default) {
      const confirmed = window.confirm(
        `"${stage.name}" is a default stage. Are you sure you want to delete it?`
      );
      if (!confirmed) return;
    }

    setIsDeleting(true);
    try {
      await onDelete(stage.id);
      toast.success("Stage deleted");
    } catch {
      toast.error("Failed to delete stage");
      setIsDeleting(false);
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-lg border border-border/50 bg-card p-2 transition-colors hover:bg-muted/30"
    >
      {/* Drag handle */}
      <button
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        className="flex shrink-0 cursor-grab touch-none items-center text-muted-foreground hover:text-foreground active:cursor-grabbing"
        tabIndex={-1}
        aria-label="Drag to reorder"
      >
        <GripVertical className="size-4" />
      </button>

      {/* Color indicator / picker */}
      <div className="relative">
        <button
          onClick={() => setShowColorPicker(!showColorPicker)}
          className="size-6 shrink-0 rounded-md border border-border/50 transition-transform hover:scale-110"
          style={{ backgroundColor: stage.color }}
          aria-label="Change color"
        />
        {showColorPicker && (
          <div className="absolute top-8 left-0 z-50 grid grid-cols-5 gap-1.5 rounded-lg border border-border bg-popover p-2 shadow-md">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => handleColorChange(color)}
                className="size-6 rounded-md border border-border/50 transition-transform hover:scale-110"
                style={{ backgroundColor: color }}
                aria-label={`Select color ${color}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Stage name */}
      <div className="min-w-0 flex-1">
        {isEditing ? (
          <div className="flex items-center gap-1">
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveName();
                if (e.key === "Escape") {
                  setEditName(stage.name);
                  setIsEditing(false);
                }
              }}
              className="h-7 text-base"
              autoFocus
              disabled={isSaving}
            />
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={handleSaveName}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <Check className="size-3" />
              )}
            </Button>
          </div>
        ) : (
          <button
            onClick={() => {
              setEditName(stage.name);
              setIsEditing(true);
            }}
            className="group flex items-center gap-1.5 text-base text-foreground hover:text-foreground/80"
          >
            <span className="truncate">{stage.name}</span>
            <Pencil className="size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </button>
        )}
      </div>

      {/* Default badge */}
      {stage.is_default && (
        <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
          Default
        </span>
      )}

      {/* Delete */}
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={handleDelete}
        disabled={isDeleting}
        className="shrink-0 text-muted-foreground hover:text-destructive"
      >
        {isDeleting ? (
          <Loader2 className="size-3 animate-spin" />
        ) : (
          <X className="size-3" />
        )}
      </Button>
    </div>
  );
}

// ─── Kanban Config Tab ──────────────────────────────────────────────────────

export function KanbanConfigTab() {
  const {
    stages,
    loading,
    error,
    createStage,
    updateStage,
    deleteStage,
    reorderStages,
  } = useKanbanStages();

  const [isAdding, setIsAdding] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = stages.findIndex((s) => s.id === active.id);
      const newIndex = stages.findIndex((s) => s.id === over.id);

      if (oldIndex === -1 || newIndex === -1) return;

      // Build new order
      const reordered = [...stages];
      const [moved] = reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, moved);

      const orderUpdates = reordered.map((s, i) => ({
        id: s.id,
        order: i,
      }));

      try {
        await reorderStages(orderUpdates);
      } catch {
        toast.error("Failed to reorder stages");
      }
    },
    [stages, reorderStages]
  );

  async function handleAddStage() {
    setIsAdding(true);
    try {
      const nextOrder = stages.length;
      const color = PRESET_COLORS[nextOrder % PRESET_COLORS.length];
      await createStage({
        name: "New Stage",
        color,
        order: nextOrder,
      });
      toast.success("Stage added");
    } catch {
      toast.error("Failed to add stage");
    } finally {
      setIsAdding(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pipeline Stages</CardTitle>
          <CardDescription>Configure your kanban board columns</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-lg" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pipeline Stages</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-base text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pipeline Stages</CardTitle>
        <CardDescription>
          Drag to reorder, click names to edit, and use color dots to change colors.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={stages.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            {stages.map((stage) => (
              <SortableStageItem
                key={stage.id}
                stage={stage}
                onUpdate={updateStage}
                onDelete={deleteStage}
              />
            ))}
          </SortableContext>
        </DndContext>

        <Button
          variant="outline"
          onClick={handleAddStage}
          disabled={isAdding}
          className="mt-3 w-full"
        >
          {isAdding ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Adding...
            </>
          ) : (
            <>
              <Plus className="size-4" />
              Add Stage
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
