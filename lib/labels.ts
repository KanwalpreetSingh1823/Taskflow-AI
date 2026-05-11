import { TaskPriority, TaskStatus } from "@prisma/client";

export function priorityLabel(p: TaskPriority) {
  switch (p) {
    case TaskPriority.LOW:
      return "Low";
    case TaskPriority.MEDIUM:
      return "Medium";
    case TaskPriority.HIGH:
      return "High";
    default:
      return p;
  }
}

export function statusLabel(s: TaskStatus) {
  switch (s) {
    case TaskStatus.TODO:
      return "Todo";
    case TaskStatus.IN_PROGRESS:
      return "In progress";
    case TaskStatus.COMPLETED:
      return "Completed";
    default:
      return s;
  }
}
