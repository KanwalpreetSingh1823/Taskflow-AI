import type { Role, TaskPriority, TaskStatus } from "@prisma/client";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  image: string | null;
};

export type ProjectListItem = {
  id: string;
  name: string;
  description: string | null;
  deadline: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  owner: { id: string; name: string; email: string; image: string | null };
  members: {
    id: string;
    userId: string;
    user: { id: string; name: string; email: string; image: string | null };
  }[];
  tasks: {
    id: string;
    status: TaskStatus;
    dueDate: string | null;
    priority: TaskPriority;
    assigneeId: string | null;
  }[];
  stats: {
    total: number;
    completed: number;
    overdue: number;
    progress: number;
  };
};

export type TaskItem = {
  id: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string | null;
  projectId: string;
  assigneeId: string | null;
  createdAt: string;
  updatedAt: string;
  assignee: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  } | null;
  createdBy: { id: string; name: string };
};
