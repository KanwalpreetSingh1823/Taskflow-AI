"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Bell,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  Sparkles,
  UserRound,
} from "lucide-react";
import { motion } from "framer-motion";
import { useAuthStore } from "@/stores/auth-store";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/layout/theme-toggle";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/notifications", label: "Inbox", icon: Bell },
  { href: "/profile", label: "Profile", icon: UserRound },
];

function NavLinks({
  onNavigate,
  pathname,
}: {
  onNavigate?: () => void;
  pathname: string;
}) {
  return (
    <nav className="flex flex-col gap-1 px-2 py-4">
      {nav.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary/15 text-primary shadow-sm"
                : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4 shrink-0 opacity-80" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarBrand() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2 px-4 py-5">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-cyan-400 shadow-lg shadow-primary/25">
        <Sparkles className="h-5 w-5 text-primary-foreground" />
      </div>
      <div>
        <p className="text-sm font-semibold tracking-tight">TaskFlow AI</p>
        <p className="text-[11px] text-muted-foreground">Team velocity, clarified</p>
      </div>
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loaded, setUser, setLoaded, logout, refreshUser } =
    useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) {
          if (!cancelled) {
            setUser(null);
            setLoaded(true);
            router.replace("/login");
          }
          return;
        }
        const data = (await res.json()) as {
          user: import("@/types").AuthUser;
        };
        if (!cancelled) {
          setUser(data.user);
          setLoaded(true);
        }
      } catch {
        if (!cancelled) {
          setLoaded(true);
          router.replace("/login");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router, setLoaded, setUser]);

  useEffect(() => {
    const onFocus = () => refreshUser();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refreshUser]);

  if (!loaded) {
    return (
      <div className="mesh-bg flex min-h-screen flex-col gap-4 p-8">
        <Skeleton className="h-12 w-48 rounded-lg" />
        <Skeleton className="h-[70vh] w-full rounded-xl" />
      </div>
    );
  }

  if (!user) return null;

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const sidebar = (
    <div className="flex h-full flex-col border-border/60 bg-card/30 backdrop-blur-xl">
      <SidebarBrand />
      <Separator />
      <NavLinks
        pathname={pathname}
        onNavigate={() => setMobileOpen(false)}
      />
      <div className="mt-auto border-t border-border/60 p-4">
        <div className="glass-muted flex items-center gap-3 rounded-lg px-3 py-2">
          <Avatar className="h-9 w-9">
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs capitalize text-muted-foreground">
              {user.role.toLowerCase()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="mesh-bg min-h-screen">
      <div className="flex min-h-screen">
        {isDesktop && (
          <aside className="sticky top-0 hidden h-screen w-60 shrink-0 border-r border-border/60 lg:block xl:w-64">
            {sidebar}
          </aside>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
            <div className="flex h-14 items-center justify-between gap-3 px-4 sm:h-16 sm:px-6">
              <div className="flex items-center gap-2 lg:hidden">
                <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="shrink-0">
                      <Menu className="h-5 w-5" />
                      <span className="sr-only">Menu</span>
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="p-0">
                    {sidebar}
                  </SheetContent>
                </Sheet>
                <span className="font-semibold tracking-tight">TaskFlow AI</span>
              </div>

              <div className="hidden lg:block">
                <p className="text-sm text-muted-foreground">
                  {pathname.startsWith("/projects/")
                    ? "Project workspace"
                    : "Mission control"}
                </p>
              </div>

              <div className="flex items-center gap-1 sm:gap-2">
                <ThemeToggle />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="relative h-10 gap-2 rounded-full px-2"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                      </Avatar>
                      <span className="hidden max-w-[120px] truncate text-sm font-medium md:inline">
                        {user.name}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium">{user.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {user.email}
                        </span>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/profile">Profile</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/notifications">Inbox</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => logout()}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          <motion.main
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="flex-1 px-4 py-6 sm:px-6 lg:px-8"
          >
            {children}
          </motion.main>
        </div>
      </div>
    </div>
  );
}
