import Link from "next/link";
import { ArrowRight, KanbanSquare, LineChart, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="mesh-bg relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-grid-pattern bg-[length:48px_48px] opacity-[0.08]" />
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-cyan-400 shadow-lg shadow-primary/25">
            <KanbanSquare className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold tracking-tight">TaskFlow AI</span>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild className="shadow-lg shadow-primary/20">
            <Link href="/signup">Get started</Link>
          </Button>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex max-w-6xl flex-col gap-16 px-6 pb-24 pt-10 lg:flex-row lg:items-center lg:pt-16">
        <div className="flex-1 space-y-8">
          <p className="inline-flex items-center rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
            Hiring-ready SaaS demo
          </p>
          <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
            Task intelligence for teams who ship with precision.
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            Projects, Kanban, analytics, roles, comments, activity, and inbox —
            unified in a polished Next.js 14 stack recruiters can audit end-to-end.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" className="gap-2 shadow-xl shadow-primary/25" asChild>
              <Link href="/signup">
                Launch demo <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="glass" asChild>
              <Link href="/login">View dashboard</Link>
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Feature
              icon={KanbanSquare}
              title="Kanban + filters"
              desc="Drag lanes, search, and spotlight overdue work."
            />
            <Feature
              icon={LineChart}
              title="Analytics core"
              desc="Glass dashboards with productivity curves & distribution."
            />
            <Feature
              icon={Shield}
              title="RBAC + JWT"
              desc="Admin vs member flows backed by secure APIs."
            />
          </div>
        </div>

        <div className="glass gradient-border relative flex-1 rounded-3xl p-1 shadow-2xl">
          <div className="rounded-[22px] bg-card/90 p-8 backdrop-blur-xl">
            <p className="text-sm font-semibold text-primary">Live surface preview</p>
            <p className="mt-3 text-2xl font-semibold tracking-tight">
              Linear-inspired rhythm. Notion-grade clarity.
            </p>
            <div className="mt-8 space-y-4">
              <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Velocity</span>
                  <span>+18%</span>
                </div>
                <div className="mt-4 h-24 rounded-xl bg-gradient-to-tr from-primary/30 via-cyan-400/20 to-transparent" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-border/70 bg-background/60 p-4">
                  <p className="text-xs text-muted-foreground">Completed</p>
                  <p className="mt-2 text-2xl font-semibold">128</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/60 p-4">
                  <p className="text-xs text-muted-foreground">Risk</p>
                  <p className="mt-2 text-2xl font-semibold text-amber-500">3</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function Feature({
  icon: Icon,
  title,
  desc,
}: {
  icon: typeof KanbanSquare;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 p-4 backdrop-blur-md">
      <Icon className="h-5 w-5 text-primary" />
      <p className="mt-3 text-sm font-semibold">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
    </div>
  );
}
