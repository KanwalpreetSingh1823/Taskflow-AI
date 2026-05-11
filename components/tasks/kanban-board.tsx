"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  type DragEndEvent,
  type DragStartEvent,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import { GripVertical } from "lucide-react";
import { TaskStatus } from "@prisma/client";
import { toast } from "sonner";
import type { TaskItem } from "@/types";
import { cn } from "@/lib/utils";
import { formatDue, isOverdue } from "@/lib/format-date";
import { priorityLabel, statusLabel } from "@/lib/labels";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

const COLUMNS: TaskStatus[] = [
  TaskStatus.TODO,
  TaskStatus.IN_PROGRESS,
  TaskStatus.COMPLETED,
];

function DroppableColumn({
  status,
  children,
}: {
  status: TaskStatus;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-[420px] min-w-[260px] flex-1 flex-col rounded-2xl border border-dashed border-border/70 bg-muted/15 p-3 transition-colors",
        isOver && "border-primary/50 bg-primary/5",
      )}
    >
      <div className="mb-3 flex items-center justify-between px-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {statusLabel(status)}
        </p>
      </div>
      {children}
    </div>
  );
}

function DraggableTask({
  task,
  onOpen,
  dragDisabled,
}: {
  task: TaskItem;
  onOpen: (task: TaskItem) => void;
  dragDisabled: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    disabled: dragDisabled,
    data: { task },
  });

  const overdue = isOverdue(task.dueDate, task.status);

  return (
    <motion.div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.45 : 1,
      }}
      layout
      className="touch-none"
    >
      <Card
        role="button"
        tabIndex={0}
        onClick={() => onOpen(task)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpen(task);
          }
        }}
        className={cn(
          "glass cursor-pointer border-border/70 p-3 text-left shadow-sm transition hover:border-primary/35 hover:shadow-md",
          overdue && "border-red-500/40 bg-red-500/5",
        )}
      >
        <div className="flex gap-2">
          <button
            type="button"
            className={cn(
              "mt-0.5 text-muted-foreground hover:text-foreground",
              dragDisabled && "cursor-not-allowed opacity-40 hover:text-muted-foreground",
            )}
            {...(!dragDisabled ? { ...listeners, ...attributes } : {})}
            aria-label={dragDisabled ? "Drag disabled" : "Drag task"}
            disabled={dragDisabled}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-sm font-medium leading-snug">{task.title}</p>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="outline" className="text-[10px]">
                {priorityLabel(task.priority)}
              </Badge>
              {overdue ? (
                <Badge variant="danger" className="text-[10px]">
                  Overdue
                </Badge>
              ) : null}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Due {formatDue(task.dueDate)}
              {task.assignee ? ` · ${task.assignee.name}` : ""}
            </p>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

export function KanbanBoard({
  tasks,
  canDragTask,
  onTaskUpdate,
  onOpenTask,
}: {
  tasks: TaskItem[];
  canDragTask: (task: TaskItem) => boolean;
  onTaskUpdate: (tasks: TaskItem[]) => void;
  onOpenTask: (task: TaskItem) => void;
}) {
  const grouped = useMemo(() => {
    const g: Record<TaskStatus, TaskItem[]> = {
      [TaskStatus.TODO]: [],
      [TaskStatus.IN_PROGRESS]: [],
      [TaskStatus.COMPLETED]: [],
    };
    tasks.forEach((t) => {
      g[t.status].push(t);
    });
    return g;
  }, [tasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  function resolveColumn(id: string | undefined): TaskStatus | null {
    if (!id) return null;
    if (COLUMNS.includes(id as TaskStatus)) return id as TaskStatus;
    const t = tasks.find((x) => x.id === id);
    return t?.status ?? null;
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    const activeTask = tasks.find((t) => t.id === active.id);
    if (!activeTask || !canDragTask(activeTask)) return;
    const targetCol = resolveColumn(over?.id as string | undefined);
    if (!targetCol || targetCol === activeTask.status) return;

    const prev = tasks;
    const optimistic = tasks.map((t) =>
      t.id === activeTask.id ? { ...t, status: targetCol } : t,
    );
    onTaskUpdate(optimistic);

    try {
      const res = await fetch(`/api/tasks/${activeTask.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: targetCol }),
      });
      if (!res.ok) throw new Error();
      const json = (await res.json()) as { task: TaskItem };
      onTaskUpdate(
        optimistic.map((t) => (t.id === json.task.id ? json.task : t)),
      );
      toast.success("Status updated");
    } catch {
      onTaskUpdate(prev);
      toast.error("Could not update status");
    }
  }

  const [started, setStarted] = useState<TaskItem | null>(null);
  function handleDragStart(e: DragStartEvent) {
    const t = tasks.find((x) => x.id === e.active.id);
    setStarted(t ?? null);
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={(e) => {
        setStarted(null);
        void handleDragEnd(e);
      }}
    >
      <ScrollArea className="w-full pb-4">
        <div className="flex min-w-max gap-4">
          {COLUMNS.map((col) => (
            <DroppableColumn key={col} status={col}>
              <div className="flex flex-col gap-3">
                {grouped[col].map((task) => (
                  <DraggableTask
                    key={task.id}
                    task={task}
                    dragDisabled={!canDragTask(task)}
                    onOpen={onOpenTask}
                  />
                ))}
              </div>
            </DroppableColumn>
          ))}
        </div>
      </ScrollArea>
      <DragOverlay dropAnimation={null}>
        {started ? (
          <Card className="glass w-[260px] border-primary/30 p-3 opacity-95 shadow-xl">
            <p className="text-sm font-medium">{started.title}</p>
          </Card>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
