import { useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useLogin, useRegister } from "@/hooks/use-auth";

export function LoginPage() {
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const loginMutation = useLogin();
  const registerMutation = useRegister();

  const isRegister = mode === "register";
  const activeMutation = isRegister ? registerMutation : loginMutation;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      if (isRegister) {
        await registerMutation.mutateAsync({ name, city, email, password });
      } else {
        await loginMutation.mutateAsync({ email, password });
      }
      navigate("/");
    } catch {
      // handled by mutation state
    }
  }

  return (
    <div className="mx-auto grid min-h-[75vh] max-w-6xl gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
      <section className="space-y-6">
        <Badge className="border-primary/20 bg-primary/10 text-primary">
          India opportunities platform
        </Badge>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Sign in to track India-focused jobs, internships, startup roles, and research openings.
        </h1>
        <p className="max-w-2xl text-base leading-7 text-muted-foreground">
          Your account is stored in the database, and the opportunities catalog is synced
          automatically from India-focused sources so you always land on a live application page.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            "India-first opportunity feed",
            "Database-backed user accounts",
            "Automated sync ready for Vercel cron",
          ].map((item) => (
            <Card key={item} className="p-4">
              <CardDescription>{item}</CardDescription>
            </Card>
          ))}
        </div>
      </section>

      <Card className="mx-auto w-full max-w-xl p-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle>{isRegister ? "Create account" : "Welcome back"}</CardTitle>
            <CardDescription className="mt-2">
              {isRegister
                ? "Create a login to personalize your India opportunity search."
                : "Log in to continue exploring live openings across India."}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            onClick={() => setMode(isRegister ? "login" : "register")}
          >
            {isRegister ? "Have an account?" : "Create account"}
          </Button>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          {isRegister ? (
            <>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Full name"
                required
              />
              <Input
                value={city}
                onChange={(event) => setCity(event.target.value)}
                placeholder="City in India"
              />
            </>
          ) : null}
          <Input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            placeholder="Email address"
            required
          />
          <Input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            placeholder="Password"
            required
          />
          {activeMutation.error ? (
            <p className="text-sm text-red-500">
              {activeMutation.error instanceof Error
                ? activeMutation.error.message
                : "Something went wrong"}
            </p>
          ) : null}
          <Button className="w-full" disabled={activeMutation.isPending} type="submit">
            {activeMutation.isPending
              ? "Please wait..."
              : isRegister
                ? "Create account"
                : "Login"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
