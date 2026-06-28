export function sanitizeReturnTo(value: string | null | undefined): string {
  if (!value || typeof value !== "string") {
    return "/";
  }

  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return "/";
  }

  if (trimmed.includes("\\")) {
    return "/";
  }

  try {
    const decoded = decodeURIComponent(trimmed);
    if (
      decoded.startsWith("//") ||
      /^https?:/i.test(decoded) ||
      /^javascript:/i.test(decoded) ||
      decoded.includes("\\")
    ) {
      return "/";
    }
  } catch {
    return "/";
  }

  return trimmed;
}
