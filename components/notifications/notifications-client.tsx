"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Inbox, MailOpen } from "lucide-react";
import { toast } from "sonner";
import { relativeTime } from "@/lib/format-date";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type NotificationRow = {
  id: string;
  title: string;
  body: string;
  read: boolean;
  href: string | null;
  createdAt: string;
};

export function NotificationsClient() {
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/notifications");
    if (!res.ok) {
      toast.error("Could not load inbox");
      return;
    }
    const json = (await res.json()) as { notifications: NotificationRow[] };
    setItems(json.notifications);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await load();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function markRead(ids?: string[]) {
    const res = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ids?.length ? { ids } : { markAll: true }),
    });
    if (!res.ok) {
      toast.error("Could not update");
      return;
    }
    const json = (await res.json()) as { notifications: NotificationRow[] };
    setItems(json.notifications);
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-10 w-48 rounded-lg" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Inbox</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Email-style notifications for assignments and discussions.
          </p>
        </div>
        <Button variant="secondary" className="gap-2" onClick={() => markRead()}>
          <MailOpen className="h-4 w-4" />
          Mark all read
        </Button>
      </div>

      {!items.length ? (
        <Card className="glass border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Inbox className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">You&apos;re all caught up.</p>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {items.map((n, i) => (
            <motion.li
              key={n.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Card
                className={
                  n.read
                    ? "border-border/60 bg-muted/10 opacity-80"
                    : "glass border-primary/15 shadow-lg shadow-primary/5"
                }
              >
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{n.title}</p>
                      {!n.read ? (
                        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                          New
                        </span>
                      ) : null}
                    </div>
                    <p className="text-sm text-muted-foreground">{n.body}</p>
                    <p className="text-xs text-muted-foreground">
                      {relativeTime(n.createdAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {!n.read ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => markRead([n.id])}
                      >
                        Mark read
                      </Button>
                    ) : null}
                    {n.href ? (
                      <Button size="sm" asChild>
                        <Link href={n.href}>Open</Link>
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            </motion.li>
          ))}
        </ul>
      )}
    </div>
  );
}
