import { createFileRoute, redirect } from "@tanstack/react-router";
import { authClient } from "../lib/auth-client";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const { data } = await authClient.getSession();
    throw redirect({ to: data ? "/dashboard" : "/login" });
  },
});
