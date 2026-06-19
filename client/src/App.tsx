import { Route, Switch } from "wouter";
import { Header } from "@/components/header";
import { HomePage } from "@/pages/home-page";
import { LoginPage } from "@/pages/login-page";

export function App() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(168,85,247,0.18),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(96,165,250,0.15),_transparent_25%),linear-gradient(180deg,_rgba(255,255,255,0.03),_transparent)]" />
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Switch>
          <Route path="/">
            <HomePage page="all" />
          </Route>
          <Route path="/startups">
            <HomePage page="startups" />
          </Route>
          <Route path="/internships">
            <HomePage page="internships" />
          </Route>
          <Route path="/research">
            <HomePage page="research" />
          </Route>
          <Route path="/login">
            <LoginPage />
          </Route>
        </Switch>
      </main>
    </div>
  );
}
