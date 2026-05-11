import {
  ActivityType,
  PrismaClient,
  Role,
  TaskPriority,
  TaskStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password123", 12);

  await prisma.notification.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.task.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();

  const admin = await prisma.user.create({
    data: {
      email: "admin@test.com",
      passwordHash,
      name: "Alex Rivera",
      role: Role.ADMIN,
      image: null,
    },
  });

  const member = await prisma.user.create({
    data: {
      email: "member@test.com",
      passwordHash,
      name: "Jordan Lee",
      role: Role.MEMBER,
      image: null,
    },
  });

  const p1 = await prisma.project.create({
    data: {
      name: "Product Launch Q2",
      description:
        "Coordinate launch milestones, marketing assets, and engineering cutovers.",
      deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 21),
      ownerId: admin.id,
      members: {
        create: [{ userId: admin.id }, { userId: member.id }],
      },
    },
  });

  const p2 = await prisma.project.create({
    data: {
      name: "Infrastructure Reliability",
      description: "Hardening observability, alerts, and incident workflows.",
      deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 45),
      ownerId: admin.id,
      members: {
        create: [{ userId: admin.id }, { userId: member.id }],
      },
    },
  });

  const t1 = await prisma.task.create({
    data: {
      title: "Finalize roadmap narrative",
      description: "Align milestones with GTM and executive review.",
      priority: TaskPriority.HIGH,
      status: TaskStatus.IN_PROGRESS,
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3),
      projectId: p1.id,
      assigneeId: admin.id,
      createdById: admin.id,
    },
  });

  const t2 = await prisma.task.create({
    data: {
      title: "Draft launch checklist",
      priority: TaskPriority.MEDIUM,
      status: TaskStatus.TODO,
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      projectId: p1.id,
      assigneeId: member.id,
      createdById: admin.id,
    },
  });

  const t3 = await prisma.task.create({
    data: {
      title: "Implement tracing dashboards",
      description: "Wire OpenTelemetry exporters into Grafana.",
      priority: TaskPriority.HIGH,
      status: TaskStatus.TODO,
      dueDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
      projectId: p2.id,
      assigneeId: member.id,
      createdById: admin.id,
    },
  });

  await prisma.task.createMany({
    data: [
      {
        title: "Stakeholder demo dry-run",
        priority: TaskPriority.MEDIUM,
        status: TaskStatus.COMPLETED,
        projectId: p1.id,
        assigneeId: admin.id,
        createdById: admin.id,
      },
      {
        title: "Pager rotation updates",
        priority: TaskPriority.LOW,
        status: TaskStatus.COMPLETED,
        projectId: p2.id,
        assigneeId: admin.id,
        createdById: admin.id,
      },
    ],
  });

  await prisma.comment.create({
    data: {
      content: "Blocked on brand approvals — chasing marketing today.",
      taskId: t1.id,
      userId: admin.id,
    },
  });

  await prisma.activityLog.createMany({
    data: [
      {
        type: ActivityType.PROJECT_CREATED,
        title: `Created project "${p1.name}"`,
        userId: admin.id,
        projectId: p1.id,
      },
      {
        type: ActivityType.PROJECT_CREATED,
        title: `Created project "${p2.name}"`,
        userId: admin.id,
        projectId: p2.id,
      },
      {
        type: ActivityType.MEMBER_ADDED,
        title: `Added ${member.email} to ${p1.name}`,
        userId: admin.id,
        projectId: p1.id,
        metadata: { email: member.email },
      },
      {
        type: ActivityType.TASK_CREATED,
        title: `Created task "${t1.title}"`,
        userId: admin.id,
        projectId: p1.id,
        taskId: t1.id,
      },
      {
        type: ActivityType.TASK_CREATED,
        title: `Created task "${t3.title}"`,
        userId: admin.id,
        projectId: p2.id,
        taskId: t3.id,
      },
    ],
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: member.id,
        title: "New task assigned",
        body: `You were assigned "${t2.title}" in ${p1.name}.`,
        href: `/projects/${p1.id}?task=${t2.id}`,
      },
      {
        userId: member.id,
        title: "Comment mention",
        body: `${admin.name} commented on "${t1.title}".`,
        href: `/projects/${p1.id}?task=${t1.id}`,
      },
    ],
  });

  console.log("Seed complete: admin@test.com / member@test.com — password123");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
