"use client";

import { SessionProvider } from "next-auth/react";

export function NeoSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SessionProvider>{children}</SessionProvider>;
}
