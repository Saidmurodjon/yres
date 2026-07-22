import { Link, useNavigate } from "@tanstack/react-router";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Toaster,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@yres/ui";
import {
  Bell,
  Building2,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Settings,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useNotificationSocket,
} from "../hooks";
import { signOut, useSession } from "../lib/auth-client";
import type { SessionUser, UserRole } from "../lib/auth-types";
import { USER_ROLE_LABELS } from "../lib/labels";
import { useSidebarStore } from "../stores/use-sidebar-store";

interface NavItem {
  to: "/dashboard" | "/buildings" | "/chat" | "/admin/users";
  labelKey: "dashboard" | "buildings" | "chat" | "users";
  icon: typeof LayoutDashboard;
  /** Omit to show for every role. */
  roles?: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", labelKey: "dashboard", icon: LayoutDashboard },
  { to: "/buildings", labelKey: "buildings", icon: Building2 },
  { to: "/chat", labelKey: "chat", icon: MessageCircle },
  { to: "/admin/users", labelKey: "users", icon: ShieldCheck, roles: ["admin"] },
];

function visibleNavItems(role: UserRole | undefined) {
  return NAV_ITEMS.filter((item) => !item.roles || (role && item.roles.includes(role)));
}

function initialsFor(name: string) {
  const parts = name.trim().split(/\s+/);
  const initials =
    parts.length > 1 ? `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}` : name.slice(0, 2);
  return initials.toUpperCase() || "?";
}

function NotificationBell() {
  const { t } = useTranslation("nav");
  const { data } = useNotifications({ pageSize: 10 });
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" aria-label={t("notifications")} className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute right-0 top-0 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-sm font-medium">{t("notifications")}</p>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            >
              {t("markAllRead")}
            </Button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">{t("noNotifications")}</p>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => !n.isRead && markRead.mutate(n.id)}
                className={cn(
                  "block w-full border-b border-border px-4 py-3 text-left text-sm last:border-0 hover:bg-accent",
                  !n.isRead && "bg-accent/50",
                )}
              >
                <p className="font-medium">{n.title}</p>
                {n.body && <p className="mt-0.5 text-muted-foreground">{n.body}</p>}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ProfileMenu({ user, onSignOut }: { user: SessionUser; onSignOut: () => void }) {
  const { t } = useTranslation("nav");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label={t("profileMenu")}
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.image ?? undefined} alt={user.name} />
            <AvatarFallback>{initialsFor(user.name)}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col gap-1">
            <span className="truncate font-medium">{user.name}</span>
            <span className="truncate text-xs font-normal text-muted-foreground">{user.email}</span>
            {user.role !== "auditor" && (
              <Badge variant="secondary" className="w-fit">
                {USER_ROLE_LABELS[user.role]}
              </Badge>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/profile">
            <UserRound className="mr-2 h-4 w-4" />
            {t("profile")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/settings">
            <Settings className="mr-2 h-4 w-4" />
            {t("settings")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          {t("signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { t } = useTranslation("nav");
  const { data: session } = useSession();
  const user = session?.user as SessionUser | undefined;
  const navItems = visibleNavItems(user?.role);
  const collapsed = useSidebarStore((s) => s.collapsed);
  const toggleSidebar = useSidebarStore((s) => s.toggle);
  // Called once here rather than inside NotificationBell, which renders
  // twice (mobile header + desktop sidebar, only one visible at a time via
  // CSS) — calling it there would open two redundant sockets.
  useNotificationSocket();

  async function handleSignOut() {
    await signOut();
    navigate({ to: "/login" });
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex min-h-screen flex-col sm:flex-row">
        <Toaster />
        {/* Below `sm` the sidebar is hidden entirely, so this bar is mobile's
          only way to switch sections or sign out — without it there was no
          navigation on phone-width screens at all. */}
        <header className="flex items-center justify-between border-b border-border bg-card px-3 py-2 sm:hidden">
          <Link to="/dashboard" className="px-1 text-lg font-semibold">
            YRES
          </Link>
          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                aria-label={t(item.labelKey)}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground [&.active]:bg-accent [&.active]:text-accent-foreground"
                activeProps={{ className: "active" }}
              >
                <item.icon className="h-4 w-4" />
              </Link>
            ))}
            <NotificationBell />
            {user && <ProfileMenu user={user} onSignOut={handleSignOut} />}
          </nav>
        </header>
        <aside
          className={cn(
            "hidden flex-col border-r border-border bg-card p-4 transition-[width] duration-150 sm:flex",
            collapsed ? "w-16" : "w-64",
          )}
        >
          <Link
            to="/dashboard"
            className={cn("mb-8 text-lg font-semibold", collapsed ? "px-1 text-center" : "px-2")}
          >
            {collapsed ? "Y" : "YRES"}
          </Link>
          <nav className="flex flex-1 flex-col gap-1">
            {navItems.map((item) =>
              collapsed ? (
                <Tooltip key={item.to}>
                  <TooltipTrigger asChild>
                    <Link
                      to={item.to}
                      aria-label={t(item.labelKey)}
                      className="flex items-center justify-center rounded-md px-2 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground [&.active]:bg-accent [&.active]:text-accent-foreground"
                      activeProps={{ className: "active" }}
                    >
                      <item.icon className="h-4 w-4" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right">{t(item.labelKey)}</TooltipContent>
                </Tooltip>
              ) : (
                <Link
                  key={item.to}
                  to={item.to}
                  className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground [&.active]:bg-accent [&.active]:text-accent-foreground"
                  activeProps={{ className: "active" }}
                >
                  <item.icon className="h-4 w-4" />
                  {t(item.labelKey)}
                </Link>
              ),
            )}
          </nav>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Desktop-only top navbar (mobile already has the bell/profile menu
            inline in the icon header above) — sits above the main content,
            to the right of the sidebar. */}
          <header className="hidden h-14 shrink-0 items-center justify-between gap-2 border-b border-border bg-card px-4 sm:flex">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={toggleSidebar}
                  aria-label={collapsed ? t("expandSidebar") : t("collapseSidebar")}
                  className="hover:bg-transparent hover:text-foreground"
                >
                  {collapsed ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <ChevronLeft className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {collapsed ? t("expandSidebar") : t("collapseSidebar")}
              </TooltipContent>
            </Tooltip>
            <div className="flex items-center gap-2">
              <NotificationBell />
              {user && <ProfileMenu user={user} onSignOut={handleSignOut} />}
            </div>
          </header>
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-7xl p-6 sm:p-8">{children}</div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
