function normalizeToDate(value: string | number | Date): Date {
  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "string") {
    let normalized = value.trim();

    if (normalized.includes(" ") && !normalized.includes("T")) {
      normalized = normalized.replace(" ", "T");
    }

    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(normalized) && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(normalized)) {
      normalized += "Z";
    }

    const dateFromString = new Date(normalized);
    if (!Number.isNaN(dateFromString.getTime())) {
      return dateFromString;
    }
  }

  const date = new Date(value);
  return date;
}

export function formatESTDateTime(value: string | number | Date): string {
  const date = normalizeToDate(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatESTTime(value: string | number | Date): string {
  const date = normalizeToDate(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
