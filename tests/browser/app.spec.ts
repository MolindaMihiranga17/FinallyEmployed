import { test, expect, type Page } from "@playwright/test";
import type { Application } from "../../src/lib/applications";
import { emptyApplication } from "../../src/lib/applications";
const origin = "http://127.0.0.1:4174";
const userId = "10000000-0000-4000-8000-000000000001";
const id = "20000000-0000-4000-8000-000000000001";
const row: Application = {
  ...emptyApplication,
  id,
  user_id: userId,
  company: "Acme",
  job_title: "Frontend Engineer",
  job_url: "https://example.com/job",
  location: "Colombo",
  work_arrangement: "Remote",
  status: "Applied",
  applied_on: "2026-10-20",
  notes: "Prepare portfolio",
  next_action: "Interview",
  next_action_at: "2026-10-25T09:00:00Z",
  created_at: "2026-10-20T00:00:00Z",
  updated_at: "2026-10-20T00:00:00Z",
};
async function signedIn(
  page: Page,
  allowWrites = false,
  initialRows: Application[] = [row],
) {
  let stored = initialRows.map((item) => ({ ...item }));
  await page.addInitScript(
    ({ userId }) => {
      const b64 = (value: object) =>
        btoa(JSON.stringify(value))
          .replace(/=/g, "")
          .replace(/\+/g, "-")
          .replace(/\//g, "_");
      const exp = Math.floor(Date.now() / 1000) + 3600;
      const user = {
        id: userId,
        aud: "authenticated",
        role: "authenticated",
        email: "alex@example.com",
        user_metadata: { full_name: "Alex Test" },
      };
      const token = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: userId, exp, role: "authenticated" })}.test-signature`;
      localStorage.setItem(
        "sb-browser-test-auth-token",
        JSON.stringify({
          access_token: token,
          refresh_token: "test-refresh",
          token_type: "bearer",
          expires_at: exp,
          expires_in: 3600,
          user,
        }),
      );
    },
    { userId },
  );
  await page.route("https://browser-test.supabase.co/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/application_status_history"))
      return route.fulfill({
        json: [
          {
            id: "history-1",
            application_id: id,
            old_status: null,
            new_status: "Applied",
            changed_at: row.created_at,
          },
        ],
      });
    if (url.pathname.endsWith("/applications")) {
      if (
        !allowWrites &&
        (route.request().method() === "POST" ||
          route.request().method() === "PATCH")
      )
        return route.fulfill({
          status: 400,
          json: { message: "Test save failure: please retry" },
        });
      if (allowWrites && route.request().method() === "PATCH") {
        const recordId = url.searchParams.get("id")?.replace("eq.", "");
        const index = stored.findIndex((item) => item.id === recordId);
        stored[index] = { ...stored[index], ...route.request().postDataJSON() };
        return route.fulfill({ json: stored[index] });
      }
      if (route.request().method() === "DELETE")
        return route.fulfill({ json: { id } });
      if (url.searchParams.has("id"))
        return route.fulfill({
          json: stored.find(
            (item) => "eq." + item.id === url.searchParams.get("id"),
          ),
        });
      return route.fulfill({
        json: stored,
        headers: {
          "content-range": "0-" + (stored.length - 1) + "/" + stored.length,
          "access-control-expose-headers": "content-range",
        },
      });
    }
    return route.fulfill({ json: {} });
  });
}
test("missing configuration shows actionable setup without crashing", async ({
  page,
}) => {
  await page.goto("http://127.0.0.1:4173");
  await expect(
    page.getByRole("heading", { name: "Your next chapter starts here." }),
  ).toBeVisible();
  await expect(page.getByText("Restart").first()).toBeVisible();
});
test("protected routes lead to Google login and callback failures have recovery", async ({
  page,
}, testInfo) => {
  await page.goto(`${origin}/applications`);
  await expect(page).toHaveURL(/\/login/);
  await expect(
    page.getByRole("button", { name: "Continue with Google" }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("login.png"),
    fullPage: true,
  });
  await page.goto(`${origin}/auth/callback?error_description=Access%20denied`);
  await expect(page.getByRole("alert")).toHaveText("Access denied");
  await expect(
    page.getByRole("link", { name: "Back to sign-in" }),
  ).toBeVisible();
});
test("dashboard, search, history, CSV export, and failed form save", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await signedIn(page);
  await page.goto(origin);
  await expect(
    page.getByRole("heading", { name: "Welcome back, Alex." }),
  ).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator(".summary-stat").first()).toBeVisible();
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter(
          (animation) => animation.effect?.getTiming().iterations !== Infinity,
        )
        .map((animation) => animation.finished.catch(() => {})),
    ),
  );
  expect(
    await page
      .locator("body")
      .evaluate((el) => getComputedStyle(el).fontFamily),
  ).toContain("Poppins");
  await page.screenshot({
    path: testInfo.outputPath("dashboard.png"),
    fullPage: true,
  });
  await page.getByRole("link", { name: "Applications", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Search company or job title" })
    .fill("Acme");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page).toHaveURL(/q=Acme/);
  await expect(
    page.getByText("Showing 1–1 of 1 application", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("applications.png"),
    fullPage: true,
  });
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export all CSV" }).click();
  expect((await downloadEvent).suggestedFilename()).toMatch(
    /^applications-.*\.csv$/,
  );
  await page
    .getByRole("link", { name: "View Frontend Engineer at Acme" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Status history" }),
  ).toBeVisible();
  await expect(page.getByText("Added as Applied")).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("details.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Keep application" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("link", { name: "Edit application" }).click();
  await page.screenshot({
    path: testInfo.outputPath("form.png"),
    fullPage: true,
  });
  await page.getByLabel("Company *", { exact: true }).fill("Changed company");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("alert")).toHaveText(
    "Test save failure: please retry",
  );
  await expect(page.getByLabel("Company *", { exact: true })).toHaveValue(
    "Changed company",
  );
  expect(errors).toEqual([]);
});
test("mobile layout and required-field validation", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signedIn(page);
  await page.goto(`${origin}/applications`);
  await expect(
    page.locator(".mobile-cards").getByText("Frontend Engineer"),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("mobile-list.png"),
    fullPage: true,
  });
  await page.getByRole("link", { name: "Add application" }).click();
  await page.getByRole("button", { name: "Add application" }).click();
  await expect(page.getByText("Company is required")).toBeVisible();
  await expect(page.getByText("Job title is required")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("mobile-form.png"),
    fullPage: true,
  });
});

test("dashboard shortcuts, stage filters, and clear filters", async ({
  page,
}) => {
  await signedIn(page);
  await page.goto(origin);
  const activeRequest = page.waitForRequest(
    (req) =>
      req.url().includes("/rest/v1/applications") &&
      new URL(req.url()).searchParams.get("status") ===
        "in.(Applied,Screening,Interview)",
  );
  await page.getByRole("link", { name: /Active applications/ }).click();
  await activeRequest;
  await expect(page).toHaveURL(/group=active/);
  await expect(
    page.getByRole("button", { name: "In progress", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  const request = page.waitForRequest(
    (req) =>
      req.url().includes("/rest/v1/applications") &&
      new URL(req.url()).searchParams.get("status") === "eq.Interview",
  );
  await page.getByRole("button", { name: "Interview", exact: true }).click();
  await request;
  await expect(page).toHaveURL(/status=Interview/);
  await expect(page).not.toHaveURL(/group=/);
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(
    page.getByRole("button", { name: "All applications", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page).not.toHaveURL(/status=/);
});

test("board moves persist, and saved roles require a real application date", async ({
  page,
}, testInfo) => {
  await signedIn(page, true, [{ ...row, status: "Saved", applied_on: null }]);
  await page.goto(origin + "/board");
  await page
    .getByLabel("Stage for Frontend Engineer at Acme")
    .selectOption("Interview");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "When did you apply?" }),
  ).toBeVisible();
  await page.getByLabel("Application date", { exact: true }).fill("2026-10-20");
  const saved = page.waitForRequest(
    (request) =>
      request.method() === "PATCH" && request.url().includes("/applications"),
  );
  await page.getByRole("button", { name: "Move application" }).click();
  expect((await saved).postDataJSON()).toEqual({
    status: "Interview",
    applied_on: "2026-10-20",
  });
  await expect(
    page
      .getByRole("region", { name: "Interview applications", exact: true })
      .getByRole("heading", { name: "Frontend Engineer" }),
  ).toBeVisible();
  await expect(page.getByRole("status")).toContainText(
    "Acme moved to Interview",
  );
  await page.screenshot({
    path: testInfo.outputPath("board.png"),
    fullPage: true,
  });
  await page.reload();
  await expect(
    page.getByLabel("Stage for Frontend Engineer at Acme"),
  ).toHaveValue("Interview");
});

test("calendar selects event dates, exports ICS, and navigates months", async ({
  page,
}, testInfo) => {
  await signedIn(page);
  await page.goto(origin + "/calendar");
  await page.getByLabel("Go to month").fill("2026-10");
  await page.locator('[data-day="2026-10-25"]').click();
  await expect(page.locator(".agenda-event")).toContainText("Interview");
  await expect(page.locator(".agenda-event")).toContainText("Acme");
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export calendar" }).click();
  expect((await downloadEvent).suggestedFilename()).toBe("my-job-search.ics");
  await page.screenshot({
    path: testInfo.outputPath("calendar.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Next month" }).click();
  await expect(page.getByLabel("Go to month")).toHaveValue("2026-11");
  await page.getByRole("button", { name: "Previous month" }).click();
  await expect(page.getByLabel("Go to month")).toHaveValue("2026-10");
});

test("goals and motion preferences persist, and next steps can be completed", async ({
  page,
}) => {
  await signedIn(page, true);
  await page.goto(origin);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("Weekly application goal").fill("12");
  await page.getByLabel("Interface animations").uncheck();
  await page.getByRole("button", { name: "Save preferences" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-motion", "off");
  await page.reload();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.getByLabel("Weekly application goal")).toHaveValue("12");
  await expect(page.getByLabel("Interface animations")).not.toBeChecked();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page
    .getByRole("button", { name: "Complete Interview at Acme" })
    .click();
  const request = page.waitForRequest(
    (req) => req.method() === "PATCH" && req.url().includes("/applications"),
  );
  await page
    .getByRole("button", { name: "Mark complete", exact: true })
    .click();
  expect((await request).postDataJSON()).toEqual({
    next_action: "",
    next_action_at: null,
  });
  await expect(page.getByText("Nothing on your list. Yet.")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Nothing on your list. Yet.")).toBeVisible();
  await page.getByRole("button", { name: "Your account" }).click();
  await expect(
    page.getByText("alex@example.com", { exact: true }),
  ).toBeVisible();
});

test("reference dashboard and new pages remain usable on small screens with reduced motion", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await signedIn(page, true, [
    row,
    {
      ...row,
      id: "20000000-0000-4000-8000-000000000002",
      company: "Linear",
      job_title: "Product Designer",
      status: "Interview",
      next_action: "Portfolio interview",
      next_action_at: "2026-10-22T10:00:00Z",
      applied_on: "2026-10-19",
    },
    {
      ...row,
      id: "20000000-0000-4000-8000-000000000003",
      company: "Notion",
      job_title: "Frontend Developer",
      status: "Screening",
      next_action: "Follow up with recruiter",
      next_action_at: "2026-10-21T08:00:00Z",
      applied_on: "2026-10-18",
    },
    {
      ...row,
      id: "20000000-0000-4000-8000-000000000004",
      company: "Figma",
      job_title: "Design Engineer",
      status: "Offer",
      next_action: "Review offer",
      next_action_at: null,
      applied_on: "2026-10-17",
    },
    {
      ...row,
      id: "20000000-0000-4000-8000-000000000005",
      company: "Stripe",
      job_title: "UI Engineer",
      status: "Saved",
      next_action: "",
      next_action_at: null,
      applied_on: null,
    },
  ]);
  await page.setViewportSize({ width: 1600, height: 1100 });
  await page.goto(origin);
  await expect(
    page.getByRole("heading", { name: "Your momentum" }),
  ).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: testInfo.outputPath("reference-dashboard-desktop.png"),
    fullPage: true,
  });
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    for (const path of ["", "/calendar", "/insights", "/board"]) {
      await page.goto(origin + path);
      await expect(page.locator("main h1")).toBeVisible();
      const layout = await page.evaluate(() => ({
        width: window.innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        overflow: Array.from(
          document.querySelectorAll(
            "main, .route-stage, .board-scroll, .board-grid, .workspace-surface, .workspace-toolbar, .pill-nav",
          ),
        ).map((el) => ({
          className: el.className,
          width: el.getBoundingClientRect().width,
          scroll: el.scrollWidth,
          overflow: getComputedStyle(el).overflowX,
        })),
      }));
      expect(
        layout.scrollWidth <= layout.width,
        width + path + ": " + JSON.stringify(layout),
      ).toBe(true);
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(origin);
  await expect(
    page.getByRole("heading", { name: "Weekly focus" }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("reference-dashboard-mobile.png"),
    fullPage: true,
  });
  expect(
    await page
      .locator(".route-stage")
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe("none");
  await page.goto(origin + "/insights");
  await expect(
    page.getByRole("heading", { name: "Response snapshot" }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("insights.png"),
    fullPage: true,
  });
});

test("readable typography and appearance persist across pages and device changes", async ({ page }, testInfo) => {
  await signedIn(page);
  await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "light" });
  await page.goto(origin);
  await page.getByRole("button", { name: "Switch to dark mode", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await page.getByRole("button", { name: "Switch to light mode", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("radio", { name: "Dark", exact: true }).check();
  await page.getByRole("button", { name: "Save preferences" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator(".summary-stat").first()).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: testInfo.outputPath("dark-desktop.png"), fullPage: true });
  for (const path of ["", "/applications", "/applications/new", "/calendar", "/board", "/insights"]) {
    await page.setViewportSize({ width: 320, height: 844 });
    await page.goto(origin + path);
    await expect(page.locator("main h1")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), path).toBe(true);
    const smallText = await page.locator("main").evaluate(el => Array.from(el.querySelectorAll("p, small, label, button, a, h2, h3")).filter(node => node.getBoundingClientRect().width > 0 && parseFloat(getComputedStyle(node).fontSize) < 12).map(node => node.className));
    expect(smallText, path).toEqual([]);
  }
  await page.goto(origin);
  await page.screenshot({ path: testInfo.outputPath("dark-mobile.png"), fullPage: true });
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("radio", { name: "Use device" }).check();
  await page.getByRole("button", { name: "Save preferences" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Switch to light mode", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("accent choices persist in both modes and cancelling keeps the saved color", async ({ page }, testInfo) => {
  await signedIn(page);
  await page.goto(origin);
  for (const [name, id, color] of [
    ["Ocean", "blue", "rgb(37, 99, 235)"],
    ["Violet", "violet", "rgb(124, 58, 237)"],
    ["Teal", "teal", "rgb(15, 118, 110)"],
    ["Rose", "rose", "rgb(190, 24, 93)"],
    ["Amber", "amber", "rgb(180, 83, 9)"],
    ["Graphite", "slate", "rgb(71, 85, 105)"],
  ]) {
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await page.getByRole("radio", { name, exact: true }).check();
    await page.getByRole("button", { name: "Save preferences" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-accent", id);
    await expect(page.getByRole("link", { name: "Add application", exact: true })).toHaveCSS("background-color", color);
  }
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-accent", "slate");
  await page.getByRole("button", { name: "Switch to dark mode", exact: true }).click();
  await expect(page.getByRole("link", { name: "Add application", exact: true })).toHaveCSS("background-color", "rgb(71, 85, 105)");
  await page.setViewportSize({ width: 320, height: 844 });
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.getByRole("radio", { name: "Graphite", exact: true })).toBeChecked();
  await page.getByRole("radio", { name: "Violet", exact: true }).check();
  await page.screenshot({ path: testInfo.outputPath("accent-settings-mobile.png"), fullPage: true });
  expect(await page.locator(".dialog-content").evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-accent", "slate");
  await expect(page.getByRole("dialog")).not.toBeVisible();
});

test("student opportunity fields persist, filter server requests, and guide preparation", async ({ page }, testInfo) => {
  await signedIn(page, true, [row, { ...row, id: "20000000-0000-4000-8000-000000000009", company: "CampusLab", status: "Saved", applied_on: null, application_deadline: "2000-01-01", next_action: "", next_action_at: null }]);
  await page.goto(origin + `/applications/${id}/edit`);
  await page.getByRole("combobox", { name: "Role type", exact: true }).selectOption("Internship");
  await page.getByLabel("Required tech stack", { exact: true }).fill("React, react, TypeScript");
  await page.getByRole("button", { name: "C#", exact: true }).click();
  await page.getByLabel("Application deadline", { exact: true }).fill("2026-11-01");
  await page.getByRole("combobox", { name: "Coding assessment progress", exact: true }).selectOption("Preparing");
  await page.getByLabel("Coding assessment link", { exact: true }).fill("https://example.com/assessment");
  await page.getByLabel("Portfolio or project link", { exact: true }).fill("https://github.com/alex/portfolio");
  await page.getByLabel("Preparation notes", { exact: true }).fill("Revise arrays and explain my final-year project.");
  const saving = page.waitForRequest(req => req.method() === "PATCH" && req.url().includes("/applications"));
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  expect((await saving).postDataJSON()).toMatchObject({ role_type: "Internship", tech_stack: ["React", "TypeScript", "C#"], application_deadline: "2026-11-01", assessment_status: "Preparing", portfolio_url: "https://github.com/alex/portfolio" });
  await expect(page.getByRole("heading", { name: "Tech stack & preparation", exact: true })).toBeVisible();
  await expect(page.getByText("Revise arrays and explain my final-year project.", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("link", { name: "View project" })).toHaveAttribute("href", "https://github.com/alex/portfolio");
  await page.goto(origin + `/applications/${id}/edit`);
  await expect(page.getByLabel("Required tech stack", { exact: true })).toHaveValue("React,TypeScript,C#");
  await expect(page.getByRole("combobox", { name: "Role type", exact: true })).toHaveValue("Internship");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: testInfo.outputPath("student-form.png"), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.goto(origin + "/applications");
  let filtering = page.waitForRequest(req => new URL(req.url()).searchParams.get("role_type") === "eq.Internship");
  await page.getByLabel("Filter by role type").selectOption("Internship");
  await filtering;
  filtering = page.waitForRequest(req => new URL(req.url()).searchParams.get("tech_stack")?.includes("C#"));
  await page.getByLabel("Filter by technology").selectOption("C#");
  await filtering;
  await expect(page).toHaveURL(/tech=C%23/);
  await page.getByRole("button", { name: "Clear filters", exact: true }).click();
  await expect(page.getByLabel("Filter by role type")).toHaveValue("");
  await expect(page.getByLabel("Filter by technology")).toHaveValue("");
  await page.goto(origin);
  await expect(page.locator(".student-focus")).toContainText("Acme");
  await expect(page.locator(".student-focus")).toContainText("Preparing");
  await expect(page.locator(".student-focus .deadline-overdue")).toContainText("Deadline passed");
  await page.locator(".student-tech-links").getByRole("link", { name: "React 1", exact: true }).click();
  await expect(page).toHaveURL(/tech=React/);
});
