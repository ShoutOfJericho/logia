import { Link, useLocation } from "wouter";
import { ReactNode } from "react";
import { Home, BookOpenText, Library, Sparkles, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NavItemProps {
  to: string;
  icon: typeof Home;
  label: string;
  active: boolean;
}

function NavItem({ to, icon: Icon, label, active }: NavItemProps) {
  return (
    <Link
      href={to}
      data-testid={`link-nav-${label.toLowerCase()}`}
      className={cn(
        "flex items-center gap-3 px-4 py-2.5 rounded-md text-sm transition-colors hover-elevate",
        active
          ? "bg-sidebar-accent/10 text-sidebar-foreground font-medium"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [location] = useLocation();

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="hidden md:flex flex-col w-64 shrink-0 border-r border-sidebar-border bg-sidebar">
        <div className="px-6 py-7">
          <Link href="/" data-testid="link-home" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-primary text-primary-foreground flex items-center justify-center font-serif font-semibold text-lg shadow-sm">
              L
            </div>
            <div>
              <div className="font-serif text-xl leading-none text-foreground">Logia</div>
              <div className="text-[11px] uppercase tracking-widest text-muted-foreground mt-1">
                Read · Reflect · Remember
              </div>
            </div>
          </Link>
        </div>

        <nav className="px-3 flex flex-col gap-0.5">
          <NavItem to="/" icon={Home} label="Today" active={location === "/"} />
          <NavItem
            to="/sessions"
            icon={Library}
            label="Sessions"
            active={location.startsWith("/sessions")}
          />
          <NavItem
            to="/insights"
            icon={Sparkles}
            label="Insights"
            active={location === "/insights"}
          />
        </nav>

        <div className="px-4 mt-6">
          <Link href="/session/new" data-testid="link-new-session-sidebar">
            <Button className="w-full gap-2" size="lg">
              <Plus className="h-4 w-4" />
              New session
            </Button>
          </Link>
        </div>

        <div className="mt-auto px-6 py-6 border-t border-sidebar-border/60">
          <div className="flex items-start gap-2 text-xs text-muted-foreground italic font-serif leading-relaxed">
            <BookOpenText className="h-4 w-4 mt-0.5 shrink-0 text-primary/70" />
            <p>"Thy word is a lamp unto my feet, and a light unto my path."</p>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <header className="md:hidden border-b border-border bg-sidebar">
          <div className="px-4 py-3 flex items-center justify-between">
            <Link href="/" data-testid="link-home-mobile" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-md bg-primary text-primary-foreground flex items-center justify-center font-serif font-semibold">
                L
              </div>
              <span className="font-serif text-lg">Logia</span>
            </Link>
            <Link href="/session/new" data-testid="link-new-session-mobile">
              <Button size="sm" className="gap-1.5">
                <Plus className="h-3.5 w-3.5" /> New
              </Button>
            </Link>
          </div>
          <nav className="flex border-t border-border">
            {[
              { to: "/", label: "Today" },
              { to: "/sessions", label: "Sessions" },
              { to: "/insights", label: "Insights" },
            ].map((tab) => (
              <Link
                key={tab.to}
                href={tab.to}
                data-testid={`link-nav-mobile-${tab.label.toLowerCase()}`}
                className={cn(
                  "flex-1 text-center text-xs py-2.5 hover-elevate",
                  (tab.to === "/" ? location === "/" : location.startsWith(tab.to))
                    ? "text-foreground font-medium border-b-2 border-primary"
                    : "text-muted-foreground",
                )}
              >
                {tab.label}
              </Link>
            ))}
          </nav>
        </header>
        <div className="min-h-[calc(100vh-1px)]">{children}</div>
      </main>
    </div>
  );
}
