import { Link, useNavigate } from "@tanstack/react-router";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
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
} from "@yres/ui";
import { Bell, Building2, LayoutDashboard, LogOut, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import { signOut, useSession } from "../lib/auth-client";
import type { SessionUser, UserRole } from "../lib/auth-types";
import { USER_ROLE_LABELS } from "../lib/labels";

interface NavItem {
  to: "/dashboard" | "/buildings";
  label: string;
  icon: typeof LayoutDashboard;
  /** Omit to show for every role. */
  roles?: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/buildings", label: "Buildings", icon: Building2 },
];

function visibleNavItems(role: UserRole | undefined) {
  return NAV_ITEMS.filter((item) => !item.roles || (role && item.roles.includes(role)));
}

function initialsFor(name: string) {
  const parts = name.trim().split(/\s+/);
  const initials = parts.length > 1 ? `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}` : name.slice(0, 2);
  return initials.toUpperCase() || "?";
}

/** Stubbed for now — real unread count/list lands with the notifications backend (docs/social-features.md Phase 8). */
function NotificationBell() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" aria-label="Notifications">
          <Bell className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <p className="text-sm font-medium">Notifications</p>
        <p className="mt-2 text-sm text-muted-foreground">No notifications yet.</p>
      </PopoverContent>
    </Popover>
  );
}

function ProfileMenu({ user, onSignOut }: { user: SessionUser; onSignOut: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label="Profile menu"
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
            <span className="truncate text-xs font-normal text-muted-foreground">
              {user.email}
            </span>
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
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { data: session } = useSession();
  const user = session?.user as SessionUser | undefined;
  const navItems = visibleNavItems(user?.role);

  async function handleSignOut() {
    await signOut();
    navigate({ to: "/login" });
  }

  return (
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
              aria-label={item.label}
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
      <aside className="hidden w-64 flex-col border-r border-border bg-card p-4 sm:flex">
        <Link to="/dashboard" className="mb-8 px-2 text-lg font-semibold">
          YRES
        </Link>
        <nav className="flex flex-1 flex-col gap-1">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground [&.active]:bg-accent [&.active]:text-accent-foreground"
              activeProps={{ className: "active" }}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center justify-between border-t border-border pt-4">
          <NotificationBell />
          {user && <ProfileMenu user={user} onSignOut={handleSignOut} />}
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl p-6 sm:p-8">{children}</div>
      </main>
    </div>
  );
}
