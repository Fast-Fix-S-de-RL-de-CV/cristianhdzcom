"use client";
import { createContext, useContext, useMemo } from "react";

/**
 * Contexto de tenant para CLIENT components (ver ARCHITECTURE_SAAS.md).
 * El root layout lo monta con los datos ya resueltos en el server.
 *
 * Regla de oro: en client components NUNCA hardcodear rutas internas.
 *   const { tp } = useTenant();
 *   <Link href={tp("/login")} />          → "/{slug}/login" o "/login"
 *   fetch(tp("/api/posts"))               → "/{slug}/api/posts" o "/api/posts"
 */

export type TenantClientInfo = {
  slug: string;
  basePath: string; // "/{slug}" en mimarca.app, "" en dominio propio
  siteName: string;
  accent: string;
  logoUrl: string | null;
};

type TenantContextValue = TenantClientInfo & {
  tp: (path: string) => string;
};

const TenantContext = createContext<TenantContextValue>({
  slug: "",
  basePath: "",
  siteName: "",
  accent: "#C8A951",
  logoUrl: null,
  tp: (p) => p,
});

export function TenantProvider({
  value,
  children,
}: {
  value: TenantClientInfo;
  children: React.ReactNode;
}) {
  const ctx = useMemo<TenantContextValue>(() => {
    const tp = (path: string) => {
      if (!value.basePath) return path;
      if (!path.startsWith("/")) return path;
      return path === "/" ? value.basePath : `${value.basePath}${path}`;
    };
    return { ...value, tp };
  }, [value]);

  return <TenantContext.Provider value={ctx}>{children}</TenantContext.Provider>;
}

export function useTenant(): TenantContextValue {
  return useContext(TenantContext);
}
