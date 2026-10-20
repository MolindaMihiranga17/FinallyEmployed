import { z } from "zod";
export const statuses = [
  "Saved",
  "Applied",
  "Screening",
  "Interview",
  "Offer",
  "Rejected",
  "Withdrawn",
] as const;
export const arrangements = [
  "Remote",
  "Hybrid",
  "On-site",
  "Unspecified",
] as const;
const date = z
  .string()
  .refine(
    (v) =>
      !v ||
      (/^\d{4}-\d{2}-\d{2}$/.test(v) &&
        !Number.isNaN(Date.parse(v)) &&
        new Date(v).toISOString().slice(0, 10) === v),
    "Enter a valid date",
  );
export const applicationSchema = z
  .object({
    company: z.string().trim().min(1, "Company is required").max(200),
    job_title: z.string().trim().min(1, "Job title is required").max(200),
    job_url: z
      .string()
      .trim()
      .max(2000)
      .refine((v) => {
        if (!v) return true;
        try {
          return ["https:", "http:"].includes(new URL(v).protocol);
        } catch {
          return false;
        }
      }, "Enter an http or https URL"),
    location: z.string().trim().max(200),
    work_arrangement: z.enum(arrangements),
    applied_on: date,
    status: z.enum(statuses),
    notes: z.string().max(20000),
    next_action: z.string().trim().max(300),
    next_action_at: z
      .string()
      .refine(
        (v) => !v || !Number.isNaN(new Date(v).getTime()),
        "Enter a valid date and time",
      ),
  })
  .superRefine((v, ctx) => {
    if (v.status !== "Saved" && !v.applied_on)
      ctx.addIssue({
        code: "custom",
        path: ["applied_on"],
        message: "Application date is required for this status",
      });
    if (v.next_action_at && !v.next_action)
      ctx.addIssue({
        code: "custom",
        path: ["next_action"],
        message: "Describe your next action",
      });
  });
export type ApplicationInput = z.infer<typeof applicationSchema>;
export type Application = Omit<
  ApplicationInput,
  "applied_on" | "next_action_at"
> & {
  id: string;
  user_id: string;
  applied_on: string | null;
  next_action_at: string | null;
  created_at: string;
  updated_at: string;
};
export type History = {
  id: string;
  application_id: string;
  old_status: ApplicationInput["status"] | null;
  new_status: ApplicationInput["status"];
  changed_at: string;
};
export const emptyApplication: ApplicationInput = {
  company: "",
  job_title: "",
  job_url: "",
  location: "",
  work_arrangement: "Unspecified",
  applied_on: "",
  status: "Saved",
  notes: "",
  next_action: "",
  next_action_at: "",
};
export function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
export function toPayload(input: ApplicationInput) {
  const v = applicationSchema.parse(input);
  return {
    ...v,
    applied_on: v.applied_on || null,
    next_action_at: v.next_action_at
      ? new Date(v.next_action_at).toISOString()
      : null,
  };
}
export function displayDate(value: string | null, timed = false) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    ...(timed ? { timeStyle: "short" as const } : {}),
  }).format(new Date(timed ? value : `${value}T12:00:00`));
}
export function csvCell(value: unknown) {
  const text = String(value ?? "");
  const safe = /^[\s]*[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}
export function applicationsCsv(rows: Application[]) {
  const fields = [
    "company",
    "job_title",
    "job_url",
    "location",
    "work_arrangement",
    "applied_on",
    "status",
    "notes",
    "next_action",
    "next_action_at",
    "created_at",
    "updated_at",
  ] as const;
  return (
    "\uFEFF" +
    [
      fields.join(","),
      ...rows.map((row) => fields.map((key) => csvCell(row[key])).join(",")),
    ].join("\r\n")
  );
}
export function downloadCsv(rows: Application[]) {
  const url = URL.createObjectURL(
    new Blob([applicationsCsv(rows)], { type: "text/csv;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `applications-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
