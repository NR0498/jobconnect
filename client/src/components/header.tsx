import { BriefcaseBusiness, Building2, FlaskConical, GraduationCap, LogIn, LogOut, MapPinned } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth, useLogout } from "@/hooks/use-auth";
import { Button } from "./ui/button";
import { ThemeToggle } from "./theme-toggle";

const navItems = [
  { href: "/", label: "All Openings", icon: BriefcaseBusiness },
  { href: "/startups", label: "Startups", icon: Building2 },
  { href: "/internships", label: "Internships", icon: GraduationCap },
  { href: "/research", label: "Research", icon: FlaskConical },
];

export function Header() {
  const [location] = useLocation();
  const authQuery = useAuth();
  const logoutMutation = useLogout();

  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3 text-foreground">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <BriefcaseBusiness className="h-5 w-5" />
          </div>
          <div>
            <p className="text-lg font-semibold tracking-tight">JobConnect</p>
            <p className="text-xs text-muted-foreground">
              India-first opportunities board
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-2 lg:flex">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition ${
                location === href
                  ? "bg-white/10 text-foreground"
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {authQuery.data?.user ? (
            <>
              <div className="hidden rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm md:flex md:items-center md:gap-2">
                <MapPinned className="h-4 w-4 text-primary" />
                <span>{authQuery.data.user.name}</span>
                {authQuery.data.user.city ? (
                  <span className="text-muted-foreground">· {authQuery.data.user.city}</span>
                ) : null}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </>
          ) : (
            <Link href="/login">
              <Button variant="outline" size="sm">
                <LogIn className="h-4 w-4" />
                Login
              </Button>
            </Link>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
