"use client";

import React from "react";
import { SessionRefresher } from "@/components/session-refresher";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SessionRefresher />
      {children}
    </>
  );
} 