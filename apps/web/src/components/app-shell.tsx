import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@yres/ui";
import { Building2, LayoutDashboard, LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { signOut, useSession } from "../lib/auth-client";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/buildings", label: "Buildings", icon: Building2 },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { data: session } = useSession();

  async function handleSignOut() {
    await signOut();
    navigate({ to: "/login" });
  }

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 flex-col border-r border-border bg-card p-4 sm:flex">
        <Link to="/dashboard" className="mb-8 px-2 text-lg font-semibold">
          YRES
        </Link>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map((item) => (
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
        <div className="border-t border-border pt-4">
          <p className="truncate px-2 text-sm text-muted-foreground">{session?.user.email}</p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-1 w-full justify-start gap-2"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl p-6 sm:p-8">{children}</div>
      </main>
    </div>
  );
}
