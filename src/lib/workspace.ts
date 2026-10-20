import type { Application } from "./applications";

export const activeStatuses = ["Applied", "Screening", "Interview"];
export function dayKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}
export function pendingActions(rows: Application[]) {
  return rows
    .filter(
      (row) =>
        row.next_action && !["Rejected", "Withdrawn"].includes(row.status),
    )
    .sort((a, b) =>
      (a.next_action_at ?? "9999").localeCompare(b.next_action_at ?? "9999"),
    );
}
export function searchInsights(rows: Application[], now = new Date()) {
  const today = dayKey(now);
  const monday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - ((now.getDay() + 6) % 7),
  );
  const submitted = rows.filter(
    (row) => row.status !== "Saved" && row.applied_on,
  );
  const responded = submitted.filter((row) =>
    ["Screening", "Interview", "Offer", "Rejected"].includes(row.status),
  );
  const activity = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 6 + index,
    );
    return {
      date: dayKey(date),
      label: date.toLocaleDateString(undefined, { weekday: "short" }),
      count: rows.filter((row) => row.applied_on === dayKey(date)).length,
    };
  });
  return {
    active: rows.filter((row) => activeStatuses.includes(row.status)).length,
    interviews: rows.filter((row) => row.status === "Interview").length,
    offers: rows.filter((row) => row.status === "Offer").length,
    submitted: submitted.length,
    responseRate: submitted.length
      ? Math.round((responded.length / submitted.length) * 100)
      : 0,
    weekCount: rows.filter(
      (row) =>
        row.applied_on &&
        row.applied_on >= dayKey(monday) &&
        row.applied_on <= today,
    ).length,
    overdue: pendingActions(rows).filter(
      (row) => row.next_action_at && new Date(row.next_action_at) < now,
    ).length,
    activity,
  };
}
export function monthDays(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(
    first.getFullYear(),
    first.getMonth(),
    1 - ((first.getDay() + 6) % 7),
  );
  return Array.from(
    { length: 42 },
    (_, index) =>
      new Date(start.getFullYear(), start.getMonth(), start.getDate() + index),
  );
}
function escapeIcs(value: string) {
  return value
    .replaceAll("\\", "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,");
}
function foldLine(line: string) {
  const encoder = new TextEncoder();
  let result = "",
    bytes = 0;
  for (const char of line) {
    const length = encoder.encode(char).length;
    if (bytes + length > 75) {
      result += "\r\n ";
      bytes = 1;
    }
    result += char;
    bytes += length;
  }
  return result;
}
export function calendarIcs(rows: Application[], now = new Date()) {
  const stamp = (date: Date) =>
    date
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//FinallyEmployed//Job Search//EN",
    "CALSCALE:GREGORIAN",
  ];
  for (const row of pendingActions(rows).filter((row) => row.next_action_at)) {
    const start = new Date(row.next_action_at!);
    lines.push(
      "BEGIN:VEVENT",
      "UID:" + row.id + "@finallyemployed",
      "DTSTAMP:" + stamp(now),
      "DTSTART:" + stamp(start),
      "DTEND:" + stamp(new Date(start.getTime() + 3600000)),
      "SUMMARY:" + escapeIcs(row.next_action + " — " + row.company),
      "DESCRIPTION:" +
        escapeIcs(row.job_title + (row.notes ? "\n" + row.notes : "")),
      ...(row.location ? ["LOCATION:" + escapeIcs(row.location)] : []),
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join("\r\n") + "\r\n";
}
export function downloadCalendar(rows: Application[]) {
  const url = URL.createObjectURL(
    new Blob([calendarIcs(rows)], { type: "text/calendar;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "my-job-search.ics";
  link.click();
  URL.revokeObjectURL(url);
}
export type Preferences = { goal: number; motion: boolean };
export function readPreferences(userId: string): Preferences {
  try {
    const value = JSON.parse(
      localStorage.getItem("finallyemployed:preferences:" + userId) || "{}",
    );
    return {
      goal:
        Number.isInteger(value?.goal) && value.goal >= 1 && value.goal <= 100
          ? value.goal
          : 5,
      motion: value?.motion !== false,
    };
  } catch {
    return { goal: 5, motion: true };
  }
}
