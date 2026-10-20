import { describe, expect, it } from "vitest";
import {
  applicationSchema,
  applicationsCsv,
  csvCell,
  emptyApplication,
  toLocalInput,
  toPayload,
  type Application,
  parseTechStack,
} from "./applications";
const valid = { ...emptyApplication, company: " Acme ", job_title: "Engineer" };
describe("application validation", () => {
  it("allows a saved opportunity without a date and trims input", () => {
    expect(applicationSchema.parse(valid).company).toBe("Acme");
    expect(toPayload(valid).applied_on).toBeNull();
  });
  it("requires company, title and application date after Saved", () => {
    expect(applicationSchema.safeParse(emptyApplication).success).toBe(false);
    expect(
      applicationSchema.safeParse({ ...valid, status: "Applied" }).success,
    ).toBe(false);
    expect(
      applicationSchema.safeParse({
        ...valid,
        status: "Applied",
        applied_on: "2026-10-20",
      }).success,
    ).toBe(true);
  });
  it("rejects invalid dates, statuses, oversized notes, and unsafe URLs", () => {
    for (const changes of [
      { applied_on: "2026-02-30" },
      { status: "Unknown" },
      { notes: "x".repeat(20001) },
      { job_url: "javascript:alert(1)" },
      { job_url: "not a URL" },
    ])
      expect(
        applicationSchema.safeParse({ ...valid, ...changes }).success,
      ).toBe(false);
  });
  it("requires an action description when a time is set", () => {
    expect(
      applicationSchema.safeParse({
        ...valid,
        next_action_at: "2026-10-25T09:00",
      }).success,
    ).toBe(false);
  });
  it("converts local datetime to UTC and back", () => {
    const local = "2026-10-25T09:30";
    const payload = toPayload({
      ...valid,
      next_action: "Interview",
      next_action_at: local,
    });
    expect(payload.next_action_at).toBe(new Date(local).toISOString());
    expect(toLocalInput(payload.next_action_at)).toBe(local);
  });
});
describe("CSV export", () => {
  it("escapes quotes, commas, newlines, and empty cells", () => {
    expect(csvCell('hello,"world"\nnext')).toBe('"hello,""world""\nnext"');
    expect(csvCell(null)).toBe('""');
  });
  it("neutralizes spreadsheet formulas including whitespace prefixes", () => {
    for (const input of ["=SUM(A1)", "+123", "-42", "@cmd", " \t=1", "\r=1"])
      expect(csvCell(input)).toBe(`"'${input}"`);
  });
  it("exports every row with a header and UTF-8 BOM", () => {
    const row: Application = {
      ...valid,
      company: "=1+1",
      id: "1",
      user_id: "user",
      applied_on: null,
      next_action_at: null,
      created_at: "2026-10-20T00:00:00Z",
      updated_at: "2026-10-20T00:00:00Z",
    };
    const csv = applicationsCsv([row, { ...row, id: "2", company: "Second" }]);
    expect(csv.startsWith("\uFEFFcompany,job_title")).toBe(true);
    expect(csv).toContain('"\'=1+1"');
    expect(csv).toContain('"Second"');
    expect(csv.split("\r\n")).toHaveLength(3);
    expect(csv).not.toContain("user_id");
  });
});

describe("student opportunity fields", () => {
  it("normalizes technologies without losing punctuation or custom tools", () => {
    expect(parseTechStack(" React, react, C#, .NET, Node.js, , SQL ")).toEqual([
      "React",
      "C#",
      ".NET",
      "Node.js",
      "SQL",
    ]);
    const payload = toPayload({
      ...valid,
      role_type: "Internship",
      tech_stack: [" React ", "react", "C#"],
      application_deadline: "2026-11-01",
      assessment_status: "Preparing",
      portfolio_url: "https://github.com/example/project",
    });
    expect(payload.tech_stack).toEqual(["React", "C#"]);
    expect(payload.application_deadline).toBe("2026-11-01");
    expect(toPayload(valid).application_deadline).toBeNull();
  });
  it("rejects invalid deadlines, unknown role types, unsafe links, and oversized stacks", () => {
    for (const changes of [
      { application_deadline: "2026-02-30" },
      { role_type: "Unknown" },
      { assessment_status: "Unknown" },
      { assessment_url: "javascript:alert(1)" },
      { portfolio_url: "data:text/html,test" },
      { tech_stack: ["x".repeat(51)] },
      { tech_stack: Array.from({ length: 21 }, (_, i) => "Tech " + i) },
      { prep_notes: "x".repeat(10001) },
    ])
      expect(
        applicationSchema.safeParse({ ...valid, ...changes }).success,
      ).toBe(false);
  });
  it("includes student fields in a spreadsheet-safe CSV", () => {
    const row: Application = {
      ...valid,
      id: "student",
      user_id: "owner",
      tech_stack: ["=1+1", "C#"],
      role_type: "Internship",
      applied_on: null,
      next_action_at: null,
      created_at: "2026-10-20T00:00:00Z",
      updated_at: "2026-10-20T00:00:00Z",
    };
    const csv = applicationsCsv([row]);
    expect(csv).toContain("role_type,tech_stack,application_deadline");
    expect(csv).toContain('"\'=1+1; C#"');
    expect(csv).toContain('"Internship"');
  });
});
