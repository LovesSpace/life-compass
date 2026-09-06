/*
 * Firestore timestamps arrive over JSON from the Admin SDK as
 * { _seconds, _nanoseconds }, not as Date objects. Everything that shows a
 * date goes through here so that shape is handled in one place.
 */

export function toDate(value) {
  if (!value) return null;

  if (value instanceof Date) return value;

  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (typeof value._seconds === "number") {
    return new Date(value._seconds * 1000);
  }

  if (typeof value.seconds === "number") {
    return new Date(value.seconds * 1000);
  }

  return null;
}

export function formatDate(value) {
  const date = toDate(value);

  if (!date) return "Just now";

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatRelative(value) {
  const date = toDate(value);

  if (!date) return "just now";

  const minutes = Math.round((Date.now() - date.getTime()) / 60000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;

  const days = Math.round(hours / 24);
  if (days < 30) return `${days} d ago`;

  return formatDate(value);
}