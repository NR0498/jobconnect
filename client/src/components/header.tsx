import { BriefcaseBusiness, Building2, FlaskConical, GraduationCap } from "lucide-react";
import { Link, useLocation } from "wouter";
import { ThemeToggle } from "./theme-toggle";

const navItems = [
  { href: "/", label: "All Openings", icon: BriefcaseBusiness },
  { href: "/startups", label: "Startups", icon: Building2 },
  { href: "/internships", label: "Internships", icon: GraduationCap },
  { href: "/research", label: "Research", icon: FlaskConical },
];

export function Header() {
  const [location] = useLocation();

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
              Live openings for students and builders
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

        <ThemeToggle />
      </div>
    </header>
  );
}
