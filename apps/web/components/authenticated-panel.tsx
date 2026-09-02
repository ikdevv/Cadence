"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/stores/auth-store";
import type { AuthUser } from "@cadence/shared";

export function AuthenticatedPanel({ user }: { user: AuthUser }) {
  const clearSession = useAuthStore((state) => state.clearSession);

  return (
    <Card>
      <CardHeader>
        <CardTitle>You&apos;re signed in</CardTitle>
        <CardDescription>{user.email}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="outline" className="w-full" onClick={clearSession}>
          Log out
        </Button>
      </CardContent>
    </Card>
  );
}
