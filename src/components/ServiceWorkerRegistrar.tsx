"use client";

import { useServiceWorker } from "@/hooks/use-service-worker";

export function ServiceWorkerRegistrar() {
  useServiceWorker();
  return null;
}