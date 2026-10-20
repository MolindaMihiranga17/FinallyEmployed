import { test, expect, type Page } from "@playwright/test";
const origin = "http://127.0.0.1:4174";
const userId = "10000000-0000-4000-8000-000000000001";
const id = "20000000-0000-4000-8000-000000000001";
const row = {
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
async function signedIn(page: Page) {
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
        route.request().method() === "POST" ||
        route.request().method() === "PATCH"
      )
        return route.fulfill({
          status: 400,
          json: { message: "Test save failure: please retry" },
        });
      if (route.request().method() === "DELETE")
        return route.fulfill({ json: { id } });
      if (url.searchParams.has("id")) return route.fulfill({ json: row });
      return route.fulfill({
        json: [row],
        headers: { "content-range": "0-0/1" },
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
}) => {
  await page.goto(`${origin}/applications`);
  await expect(page).toHaveURL(/\/login/);
  await expect(
    page.getByRole("button", { name: "Continue with Google" }),
  ).toBeVisible();
  await page.goto(`${origin}/auth/callback?error_description=Access%20denied`);
  await expect(page.getByRole("alert")).toHaveText("Access denied");
  await expect(
    page.getByRole("link", { name: "Back to sign-in" }),
  ).toBeVisible();
});
test("dashboard, search, history, CSV export, and failed form save", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await signedIn(page);
  await page.goto(origin);
  await expect(
    page.getByRole("heading", { name: "Let’s make your next move, Alex." }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Applications", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Search company or job title" })
    .fill("Acme");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page).toHaveURL(/q=Acme/);
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
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Keep application" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("link", { name: "Edit application" }).click();
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
test("mobile layout and required-field validation", async ({ page }) => {
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
  await page.getByRole("link", { name: "Add application" }).click();
  await page.getByRole("button", { name: "Add application" }).click();
  await expect(page.getByText("Company is required")).toBeVisible();
  await expect(page.getByText("Job title is required")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
