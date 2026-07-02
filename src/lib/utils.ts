import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function iniciales(nombres?: string | null, apellidos?: string | null) {
  const a = (nombres ?? "").trim().charAt(0);
  const b = (apellidos ?? "").trim().charAt(0);
  return (a + b).toUpperCase() || "?";
}
