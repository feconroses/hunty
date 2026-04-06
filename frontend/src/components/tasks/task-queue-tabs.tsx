"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { SortableTaskCard } from "./sortable-task-card";
import { TaskCard } from "./task-card";
import { ListTodo, Inbox, CalendarClock, CheckCircle2 } from "lucide-react";
import type { Task, TaskQueue } from "@/types";

interface TaskQueueTabsProps {
  todayTasks: Task[];
  queueTasks: Task[];
  scheduledTasks: Task[];
  completedTasks: Task[];
  onComplete: (
    id: number,
    notes?: string,
    resultData?: Record<string, unknown>,
  ) => Promise<void>;
  onFail: (id: number, notes?: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onReorder: (
    items: { id: number; queue_order: number }[],
  ) => Promise<void>;
  onTasksReordered: (queue: TaskQueue, reordered: Task[]) => void;
  isLoading?: boolean;
}

export function TaskQueueTabs({
  todayTasks,
  queueTasks,
  scheduledTasks,
  completedTasks,
  onComplete,
  onFail,
  onDelete,
  onReorder,
  onTasksReordered,
  isLoading,
}: TaskQueueTabsProps) {
  const [activeId, setActiveId] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
    useSensor(KeyboardSensor),
  );

  const getActiveTask = useCallback((): Task | undefined => {
    if (!activeId) return undefined;
    return (
      todayTasks.find((t) => t.id === activeId) ||
      queueTasks.find((t) => t.id === activeId) ||
      scheduledTasks.find((t) => t.id === activeId)
    );
  }, [activeId, todayTasks, queueTasks, scheduledTasks]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(Number(event.active.id));
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      // Determine which queue this drag happened in
      const findQueue = (
        id: number,
      ): { tasks: Task[]; queue: TaskQueue } | null => {
        if (todayTasks.some((t) => t.id === id))
          return { tasks: todayTasks, queue: "today" };
        if (queueTasks.some((t) => t.id === id))
          return { tasks: queueTasks, queue: "queue" };
        if (scheduledTasks.some((t) => t.id === id))
          return { tasks: scheduledTasks, queue: "scheduled" };
        return null;
      };

      const activeQueue = findQueue(Number(active.id));
      const overQueue = findQueue(Number(over.id));

      // Only allow reordering within the same queue
      if (
        !activeQueue ||
        !overQueue ||
        activeQueue.queue !== overQueue.queue
      ) {
        return;
      }

      const tasks = activeQueue.tasks;
      const oldIndex = tasks.findIndex((t) => t.id === Number(active.id));
      const newIndex = tasks.findIndex((t) => t.id === Number(over.id));

      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

      const reordered = arrayMove(tasks, oldIndex, newIndex);

      // Optimistically update parent state
      onTasksReordered(activeQueue.queue, reordered);

      // Persist the new order to the backend
      const items = reordered.map((t, i) => ({
        id: t.id,
        queue_order: i,
      }));
      onReorder(items).catch(() => {
        // Revert on error: re-set original order
        onTasksReordered(activeQueue.queue, tasks);
      });
    },
    [todayTasks, queueTasks, scheduledTasks, onReorder, onTasksReordered],
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  const renderTaskList = (tasks: Task[], queue: TaskQueue) => {
    if (tasks.length === 0) {
      const emptyConfig = {
        today: {
          icon: ListTodo,
          title: "No tasks for today",
          description:
            "Tasks will be auto-filled from the queue, or you can manually add tasks.",
        },
        queue: {
          icon: Inbox,
          title: "Queue is empty",
          description:
            "New tasks are added here when companies need scanning or career pages need finding.",
        },
        scheduled: {
          icon: CalendarClock,
          title: "No scheduled tasks",
          description:
            "Tasks with future dates will appear here until their scheduled time.",
        },
      };
      const config = emptyConfig[queue];
      return (
        <EmptyState
          icon={config.icon}
          title={config.title}
          description={config.description}
        />
      );
    }

    return (
      <SortableContext
        items={tasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-3">
          {tasks.map((task) => (
            <SortableTaskCard
              key={task.id}
              task={task}
              onComplete={onComplete}
              onFail={onFail}
              onDelete={onDelete}
              isLoading={isLoading}
            />
          ))}
        </div>
      </SortableContext>
    );
  };

  const activeTask = getActiveTask();

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <Tabs defaultValue="today">
        <TabsList variant="line" className="mb-4">
          <TabsTrigger value="today" className="gap-1.5">
            Today
            <Badge
              variant="secondary"
              className="ml-1 size-5 items-center justify-center rounded-full px-0 text-[10px]"
            >
              {todayTasks.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="queue" className="gap-1.5">
            Queue
            <Badge
              variant="secondary"
              className="ml-1 size-5 items-center justify-center rounded-full px-0 text-[10px]"
            >
              {queueTasks.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="scheduled" className="gap-1.5">
            Scheduled
            <Badge
              variant="secondary"
              className="ml-1 size-5 items-center justify-center rounded-full px-0 text-[10px]"
            >
              {scheduledTasks.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="completed" className="gap-1.5">
            Completed
            <Badge
              variant="secondary"
              className="ml-1 size-5 items-center justify-center rounded-full px-0 text-[10px]"
            >
              {completedTasks.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="today">
          {renderTaskList(todayTasks, "today")}
        </TabsContent>
        <TabsContent value="queue">
          {renderTaskList(queueTasks, "queue")}
        </TabsContent>
        <TabsContent value="scheduled">
          {renderTaskList(scheduledTasks, "scheduled")}
        </TabsContent>
        <TabsContent value="completed">
          {completedTasks.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="No completed tasks"
              description="Tasks will appear here after you mark them as complete or failed."
            />
          ) : (
            <div className="space-y-3">
              {completedTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onComplete={onComplete}
                  onFail={onFail}
                  onDelete={onDelete}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <DragOverlay>
        {activeTask ? (
          <div className="opacity-80">
            <TaskCard
              task={activeTask}
              onComplete={onComplete}
              onFail={onFail}
              onDelete={onDelete}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
