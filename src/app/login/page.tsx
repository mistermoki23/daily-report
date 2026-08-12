"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("anna@agency.com");
  const [password, setPassword] = useState("demo");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (!email.trim()) {
        setError("Введите email");
        return;
      }
      document.cookie = `cm_auth=1; path=/; max-age=${60 * 60 * 24 * 30}`;
      router.push("/dashboard");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <Card className="w-full max-w-md border-slate-200 shadow-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-xl font-semibold tracking-tight">
            Campaign Monitor
          </CardTitle>
          <p className="text-sm text-slate-500">
            Войдите, чтобы продолжить ежедневный мониторинг кампаний
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-slate-200"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border-slate-200"
              />
            </div>
            {error ? <p className="text-sm text-rose-600">{error}</p> : null}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Вход..." : "Войти"}
            </Button>
            <p className="text-center text-xs text-slate-400">
              Demo: любой пароль подойдёт для MVP
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
