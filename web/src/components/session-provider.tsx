"use client";

import { createContext, useContext, useEffect, useState } from "react";

const SessionContext = createContext<string>("");

export function SessionProvider({
  nonce,
  children,
}: {
  nonce: string;
  children: React.ReactNode;
}) {
  return (
    <SessionContext.Provider value={nonce}>{children}</SessionContext.Provider>
  );
}

export function useSessionNonce(): string {
  return useContext(SessionContext);
}
