import { db } from "./supabase";
import {
  type Application,
  type ApplicationInput,
  type History,
  applicationSchema,
  emptyApplication,
  toPayload,
} from "./applications";
export type Filters = {
  search: string;
  status: string;
  sort: string;
  page: number;
  active?: boolean;
  roleType?: string;
  technology?: string;
};
export const PAGE_SIZE = 12;
export async function listApplications(userId: string, filters: Filters) {
  let query = db()
    .from("applications")
    .select("*", { count: "exact" })
    .eq("user_id", userId);
  const search = filters.search
    .trim()
    .replace(/[^\p{L}\p{N} _-]/gu, " ")
    .trim();
  if (search)
    query = query.or(`company.ilike.%${search}%,job_title.ilike.%${search}%`);
  if (filters.status) query = query.eq("status", filters.status);
  else if (filters.active)
    query = query.in("status", ["Applied", "Screening", "Interview"]);
  if (filters.roleType) query = query.eq("role_type", filters.roleType);
  if (filters.technology)
    query = query.contains("tech_stack", [filters.technology]);
  const column =
    filters.sort === "next"
      ? "next_action_at"
      : filters.sort === "company"
        ? "company"
        : "applied_on";
  query = query
    .order(column, { ascending: filters.sort !== "recent", nullsFirst: false })
    .order("created_at", { ascending: false })
    .order("id");
  const { data, count, error } = await query.range(
    (filters.page - 1) * PAGE_SIZE,
    filters.page * PAGE_SIZE - 1,
  );
  if (error) throw error;
  return { rows: data as Application[], count: count ?? 0 };
}
export async function allApplications(userId: string) {
  const rows: Application[] = [];
  for (let start = 0; ; start += 500) {
    const { data, error } = await db()
      .from("applications")
      .select("*")
      .eq("user_id", userId)
      .order("id")
      .range(start, start + 499);
    if (error) throw error;
    rows.push(...(data as Application[]));
    if (data.length < 500) break;
  }
  return rows;
}
export async function getApplication(id: string, userId: string) {
  const { data, error } = await db()
    .from("applications")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();
  if (error) throw error;
  return data as Application;
}
export async function history(id: string) {
  const { data, error } = await db()
    .from("application_status_history")
    .select("*")
    .eq("application_id", id)
    .order("changed_at", { ascending: false });
  if (error) throw error;
  return data as History[];
}
export async function saveApplication(
  input: ApplicationInput,
  userId: string,
  id?: string,
) {
  const payload = toPayload(input);
  const query = id
    ? db()
        .from("applications")
        .update(payload)
        .eq("id", id)
        .eq("user_id", userId)
    : db()
        .from("applications")
        .insert({ ...payload, user_id: userId });
  const { data, error } = await query.select().single();
  if (error) throw error;
  return data as Application;
}
export async function deleteApplication(id: string, userId: string) {
  const { error, data } = await db()
    .from("applications")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)
    .select("id")
    .single();
  if (error || !data) throw error ?? new Error("Application not found");
}
export async function moveApplication(
  application: Application,
  status: ApplicationInput["status"],
  appliedOn: string,
) {
  applicationSchema.parse({
    ...emptyApplication,
    company: application.company,
    job_title: application.job_title,
    status,
    applied_on: appliedOn,
  });
  const { data, error } = await db()
    .from("applications")
    .update({ status, applied_on: appliedOn || null })
    .eq("id", application.id)
    .eq("user_id", application.user_id)
    .select()
    .single();
  if (error) throw error;
  return data as Application;
}
export async function completeNextAction(application: Application) {
  const { data, error } = await db()
    .from("applications")
    .update({ next_action: "", next_action_at: null })
    .eq("id", application.id)
    .eq("user_id", application.user_id)
    .select()
    .single();
  if (error) throw error;
  return data as Application;
}
