"use client";

import type { ReactNode } from "react";

import { useNavigationSession } from "@/hooks/useNavigationSession";

type NavigationProviderProps = {
  children: ReactNode;
};

/**
 * Persistent navigation controller.
 *
 * This component must stay mounted for the lifetime
 * of the application so navigation continues even
 * when the navigation screen itself is unmounted.
 */
export function NavigationProvider({
  children,
}: NavigationProviderProps) {
  useNavigationSession();

  return children;
}