import { describe, expect, it } from "vitest";
import { emptyApplication, type Application } from "./applications";
import {
  calendarIcs,
  dayKey,
  monthDays,
  pendingActions,
  searchInsights,
} from "./workspace";
const base: Application = {
  ...emptyApplication,
  id: "one",
  user_id: "user",
  company: "Acme",
  job_title: "Engineer",
  applied_on: null,
  next_action_at: null,
  created_at: "2026-10-20T00:00:00Z",
  updated_at: "2026-10-20T00:00:00Z",
};
describe("job search insights", () => {
  it("uses recorded dates and handles zero denominators", () => {
    expect(searchInsights([]).responseRate).toBe(0);
    const stats = searchInsights(
      [
        { ...base, status: "Saved", applied_on: null },
        { ...base, status: "Applied", applied_on: "2026-10-19" },
        { ...base, status: "Interview", applied_on: "2026-10-20" },
        { ...base, status: "Rejected", applied_on: "2026-10-18" },
        { ...base, status: "Offer", applied_on: "2026-10-22" },
      ],
      new Date(2026, 9, 20, 12),
    );
    expect(stats.submitted).toBe(4);
    expect(stats.responseRate).toBe(75);
    expect(stats.weekCount).toBe(2);
    expect(stats.activity.map((day) => day.count)).toEqual([
      0, 0, 0, 0, 1, 1, 1,
    ]);
  });
  it("keeps unscheduled tasks, excludes closed ones, and sorts scheduled first", () => {
    const rows = [
      { ...base, id: "later", next_action: "Follow up" },
      {
        ...base,
        id: "closed",
        status: "Rejected" as const,
        next_action: "Old interview",
      },
      {
        ...base,
        id: "scheduled",
        next_action: "Interview",
        next_action_at: "2026-10-20T09:00:00Z",
      },
    ];
    expect(pendingActions(rows).map((row) => row.id)).toEqual([
      "scheduled",
      "later",
    ]);
  });
  it("builds a six-week Monday-first calendar across year boundaries", () => {
    const days = monthDays(new Date(2027, 0, 1));
    expect(days).toHaveLength(42);
    expect(days[0].getDay()).toBe(1);
    expect(dayKey(days[0])).toBe("2026-12-28");
    expect(dayKey(days[41])).toBe("2027-02-07");
  });
});
describe("calendar export", () => {
  it("exports scheduled open next actions as UTC one-hour events", () => {
    const ics = calendarIcs(
      [
        {
          ...base,
          next_action: "Interview",
          next_action_at: "2026-10-25T09:00:00Z",
        },
        { ...base, id: "unscheduled", next_action: "Follow up" },
        {
          ...base,
          id: "closed",
          status: "Withdrawn",
          next_action: "Old task",
          next_action_at: "2026-10-25T09:00:00Z",
        },
      ],
      new Date("2026-10-20T00:00:00Z"),
    );
    expect(ics).toContain("DTSTART:20261025T090000Z\r\nDTEND:20261025T100000Z");
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(1);
    expect(ics).not.toContain("unscheduled@");
    expect(ics).toContain("UID:one@finallyemployed");
  });
  it("escapes calendar control characters and folds UTF-8 lines safely", () => {
    const ics = calendarIcs([
      {
        ...base,
        next_action: "Talk, plan; confirm\\next\nBEGIN:FAKE",
        notes: "界".repeat(100),
        next_action_at: "2026-10-25T09:00:00Z",
      },
    ]);
    expect(ics).toContain("Talk\\, plan\\; confirm\\\\next\\nBEGIN:FAKE");
    for (const line of ics.split("\r\n"))
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    expect(ics).not.toContain("\r\nBEGIN:FAKE");
  });
});
