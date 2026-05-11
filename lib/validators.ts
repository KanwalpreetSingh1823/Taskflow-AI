import { z } from "zod";
import { TaskPriority, TaskStatus } from "@prisma/client";

export const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(6).max(128),
});

export const signupSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(6).max(128),
  name: z.string().min(1).max(120).trim(),
});

export const projectCreateSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  description: z.string().max(5000).optional().nullable(),
  deadline: z.string().max(40).optional().nullable(),
});

export const projectUpdateSchema = projectCreateSchema.partial();

export const inviteMemberSchema = z.object({
  email: z.string().email().max(255),
});

export const taskCreateSchema = z.object({
  projectId: z.string().cuid(),
  title: z.string().min(1).max(300).trim(),
  description: z.string().max(8000).optional().nullable(),
  priority: z.nativeEnum(TaskPriority).optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  dueDate: z.string().max(40).optional().nullable(),
  assigneeId: z.string().cuid().optional().nullable(),
});

export const taskUpdateSchema = z.object({
  title: z.string().min(1).max(300).trim().optional(),
  description: z.string().max(8000).optional().nullable(),
  priority: z.nativeEnum(TaskPriority).optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  dueDate: z.string().max(40).optional().nullable(),
  assigneeId: z.string().cuid().optional().nullable(),
});

export const commentSchema = z.object({
  content: z.string().min(1).max(4000).trim(),
});

export const profileUpdateSchema = z.object({
  name: z.string().min(1).max(120).trim(),
});
