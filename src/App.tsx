import { useEffect, useState } from "react";
import {
  Link,
  NavLink,
  Navigate,
  Outlet,
  Route,
  Routes,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  LayoutDashboard,
  LogOut,
  Plus,
  Search,
  Sparkles,
  Target,
  Trash2,
} from "lucide-react";
import { Protected, useAuth } from "./auth";
import { configured, db } from "./lib/supabase";
import {
  allApplications,
  deleteApplication,
  getApplication,
  history,
  listApplications,
  PAGE_SIZE,
  saveApplication,
} from "./lib/api";
import {
  displayDate,
  downloadCsv,
  statuses,
  type Application,
} from "./lib/applications";
import { ApplicationForm } from "./components/application-form";
import { Button } from "./components/ui/button";
import { Dialog } from "./components/ui/dialog";
import { errorMessage } from "./lib/utils";

function ErrorMessage({ error }: { error: unknown }) {
  return (
    <p className="error-box" role="alert">
      {errorMessage(error)}
    </p>
  );
}
function Badge({ status }: { status: string }) {
  return (
    <span className={`badge status-${status.toLowerCase()}`}>
      <span />
      {status}
    </span>
  );
}
function Brand() {
  return (
    <Link to="/" className="brand">
      <span className="brand-icon">
        <BriefcaseBusiness size={21} />
      </span>
      <span>
        finally<span className="brand-light">employed</span>
        <span className="brand-dot">.</span>
      </span>
    </Link>
  );
}
function Setup() {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <Brand />
        <span className="eyebrow">LET’S GET YOU CONNECTED</span>
        <h1>Your next chapter starts here.</h1>
        <p className="muted">
          The app is ready for your Supabase backend. Connect it to start saving
          applications securely.
        </p>
        <ol className="setup-list">
          <li>Create a free Supabase project.</li>
          <li>
            Run <code>supabase/migrations/202610200001_initial.sql</code> in its
            SQL Editor.
          </li>
          <li>Enable Google under Authentication → Sign In / Providers.</li>
          <li>
            Copy <code>.env.example</code> to <code>.env.local</code> and add
            your project URL and publishable key.
          </li>
          <li>
            Restart <code>npm run dev</code>.
          </li>
        </ol>
        <p className="notice">
          <CircleHelp size={18} /> README.md includes the full Google OAuth
          setup. Never put a service-role key or Google client secret in the
          frontend.
        </p>
      </div>
    </div>
  );
}
function Login() {
  const { session, loading, error } = useAuth();
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  if (loading)
    return <div className="full-message">Restoring your session…</div>;
  if (session) return <Navigate to="/" replace />;
  return (
    <div className="auth-page">
      <div className="auth-card">
        <Brand />
        <span className="eyebrow">
          A LITTLE ORGANIZATION. A LOT OF POSSIBILITY.
        </span>
        <h1>Your next chapter starts here.</h1>
        <p className="muted">
          Keep every opportunity, interview, and next step in one calm
          workspace. Make room for the job that’s right for you.
        </p>
        <div className="login-features">
          <span>
            <Check size={17} /> Track every application
          </span>
          <span>
            <Check size={17} /> Stay on top of interviews
          </span>
          <span>
            <Check size={17} /> Keep your search private
          </span>
        </div>
        {(failure || error) && (
          <ErrorMessage error={new Error(failure || error!)} />
        )}
        <Button
          className="google-button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setFailure("");
            try {
              const { error } = await db().auth.signInWithOAuth({
                provider: "google",
                options: {
                  redirectTo: `${window.location.origin}/auth/callback`,
                },
              });
              if (error) throw error;
            } catch (e) {
              setFailure(e instanceof Error ? e.message : "Sign-in failed");
              setBusy(false);
            }
          }}
        >
          <span className="google-g">G</span>
          {busy ? "Connecting to Google…" : "Continue with Google"}
          <ArrowUpRight size={17} />
        </Button>
        <small className="muted">
          Your applications are visible only to you.
        </small>
      </div>
      <div className="auth-decoration">
        <Sparkles size={32} />
        <p>
          Small steps.
          <br />
          New possibilities.
        </p>
        <span>YOUR JOB SEARCH, WITH A LITTLE MORE CLARITY.</span>
      </div>
    </div>
  );
}
function Callback() {
  const { session, loading, error } = useAuth();
  const params = new URLSearchParams(window.location.search);
  const fragment = new URLSearchParams(window.location.hash.slice(1));
  const failure =
    params.get("error_description") ||
    fragment.get("error_description") ||
    error;
  if (loading)
    return (
      <div className="full-message" role="status">
        Completing sign-in…
      </div>
    );
  if (failure || !session)
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>Couldn’t finish sign-in</h1>
          <ErrorMessage
            error={
              new Error(
                failure ||
                  "Your sign-in link expired or was opened in a different browser. Please try again.",
              )
            }
          />
          <Button asChild>
            <Link to="/login">Back to sign-in</Link>
          </Button>
        </div>
      </div>
    );
  return <Navigate to="/" replace />;
}
function Shell() {
  const { session } = useAuth();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const email = session?.user.email ?? "Your account";
  const name = session?.user.user_metadata.full_name || email.split("@")[0];
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />
        <div className="nav-label">YOUR WORKSPACE</div>
        <nav>
          <NavLink to="/" end>
            <LayoutDashboard size={19} />
            Overview
          </NavLink>
          <NavLink to="/applications">
            <BriefcaseBusiness size={19} />
            Applications
          </NavLink>
        </nav>
        <div className="sidebar-note">
          <span className="note-icon">
            <Sparkles size={21} />
          </span>
          <h3>Keep showing up.</h3>
          <p>Every application is a step toward your next chapter.</p>
        </div>
        <div className="account">
          <div className="avatar">{String(name).slice(0, 1).toUpperCase()}</div>
          <div className="account-name">
            <strong>{name}</strong>
            <small title={email}>{email}</small>
          </div>
          <button
            aria-label="Sign out"
            title="Sign out"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              const { error } = await db().auth.signOut();
              if (error) setError(error.message);
              setBusy(false);
            }}
          >
            <LogOut size={18} />
          </button>
        </div>
        {error && <ErrorMessage error={new Error(error)} />}
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span>
            <span className="live-dot" />
            Your next chapter, in progress
          </span>
          <span className="today">
            {new Intl.DateTimeFormat(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
            }).format(new Date())}
          </span>
        </header>
        <main>
          <Outlet />
        </main>
        <footer>
          One opportunity at a time.
          <span>
            Made for your next move <ArrowUpRight size={13} />
          </span>
        </footer>
      </div>
    </div>
  );
}
function useAll() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ["applications", session!.user.id, "all"],
    queryFn: () => allApplications(session!.user.id),
  });
}
function PageHeading({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p className="muted">{subtitle}</p>
      </div>
      <div className="heading-actions">{children}</div>
    </div>
  );
}
function AddButton() {
  return (
    <Button asChild>
      <Link to="/applications/new">
        <Plus size={17} />
        Add application
      </Link>
    </Button>
  );
}
function Empty({ filtered = false }: { filtered?: boolean }) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <BriefcaseBusiness size={27} />
      </span>
      <h3>{filtered ? "No matching opportunities" : "Make your first move"}</h3>
      <p>
        {filtered
          ? "Try a different search or status filter."
          : "Add an opportunity and give your job search a home."}
      </p>
      {!filtered && <AddButton />}
    </div>
  );
}
function Dashboard() {
  const { data, isPending, error } = useAll();
  const { session } = useAuth();
  const name = (session?.user.user_metadata.full_name || "").split(" ")[0];
  const rows = data ?? [];
  const active = rows.filter((a) =>
    ["Applied", "Screening", "Interview"].includes(a.status),
  );
  const upcoming = rows
    .filter(
      (a) => a.next_action_at && !["Rejected", "Withdrawn"].includes(a.status),
    )
    .sort((a, b) => a.next_action_at!.localeCompare(b.next_action_at!))
    .slice(0, 5);
  const recent = [...rows]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 5);
  return (
    <>
      <PageHeading
        eyebrow="YOUR JOB SEARCH, AT A GLANCE"
        title={`Let’s make your next move${name ? `, ${name}` : ""}.`}
        subtitle="A little clarity for the opportunities ahead."
      >
        <AddButton />
      </PageHeading>
      {error ? (
        <ErrorMessage error={error} />
      ) : isPending ? (
        <div className="panel loading" role="status">
          Loading your overview…
        </div>
      ) : (
        <>
          <div className="stats-grid">
            {[
              {
                label: "Total opportunities",
                value: rows.length,
                icon: BriefcaseBusiness,
                detail: "Every possibility counts",
                color: "green",
              },
              {
                label: "Active applications",
                value: active.length,
                icon: Target,
                detail: "Your next chapter in motion",
                color: "blue",
              },
              {
                label: "Interviews",
                value: rows.filter((a) => a.status === "Interview").length,
                icon: CalendarDays,
                detail: "A chance to tell your story",
                color: "amber",
              },
              {
                label: "Offers received",
                value: rows.filter((a) => a.status === "Offer").length,
                icon: Sparkles,
                detail: "Something worth celebrating",
                color: "purple",
              },
            ].map((item) => (
              <div className="stat-card" key={item.label}>
                <div>
                  <span>{item.label}</span>
                  <span className={`stat-icon ${item.color}`}>
                    <item.icon size={19} />
                  </span>
                </div>
                <strong>{item.value.toString().padStart(2, "0")}</strong>
                <small>{item.detail}</small>
              </div>
            ))}
          </div>
          <div className="dashboard-grid">
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Your application journey</h2>
                  <p>See where your opportunities stand.</p>
                </div>
                <span className="subtle-tag">{rows.length} total</span>
              </div>
              <div className="journey">
                {statuses.map((status) => {
                  const count = rows.filter((a) => a.status === status).length;
                  return (
                    <div className="journey-row" key={status}>
                      <Badge status={status} />
                      <div className="progress-track">
                        <div
                          className={`progress-fill status-${status.toLowerCase()}`}
                          style={{
                            width: `${rows.length ? (count / rows.length) * 100 : 0}%`,
                          }}
                        />
                      </div>
                      <strong>{count}</strong>
                    </div>
                  );
                })}
              </div>
            </section>
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Up next</h2>
                  <p>Your interviews and follow-ups.</p>
                </div>
                <CalendarDays size={20} className="muted" />
              </div>
              {upcoming.length ? (
                <div className="upcoming-list">
                  {upcoming.map((a) => (
                    <Link
                      key={a.id}
                      to={`/applications/${a.id}`}
                      className="upcoming"
                    >
                      <span className="calendar-tile">
                        {new Date(a.next_action_at!).toLocaleDateString(
                          undefined,
                          { month: "short" },
                        )}
                        <strong>{new Date(a.next_action_at!).getDate()}</strong>
                      </span>
                      <div>
                        <strong>{a.next_action}</strong>
                        <span>
                          {a.company} · {a.job_title}
                        </span>
                        <small
                          className={
                            new Date(a.next_action_at!) < new Date()
                              ? "overdue"
                              : ""
                          }
                        >
                          {displayDate(a.next_action_at, true)}
                        </small>
                      </div>
                      <ArrowUpRight size={17} />
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="small-empty">
                  <CalendarDays size={28} />
                  <h3>A little breathing room</h3>
                  <p>
                    Add a next action to an application
                    <br />
                    and it’ll appear here.
                  </p>
                </div>
              )}
            </section>
          </div>
          <section className="panel recent-panel">
            <div className="panel-heading">
              <div>
                <h2>Recently added</h2>
                <p>The latest possibilities on your radar.</p>
              </div>
              <Link to="/applications" className="text-link">
                View all <ArrowUpRight size={16} />
              </Link>
            </div>
            {recent.length ? <ApplicationTable rows={recent} /> : <Empty />}
          </section>
        </>
      )}
    </>
  );
}
function ApplicationTable({ rows }: { rows: Application[] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Opportunity</th>
            <th>Status</th>
            <th>Applied</th>
            <th>Next action</th>
            <th>
              <span className="sr-only">Open</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => (
            <tr key={a.id}>
              <td>
                <Link to={`/applications/${a.id}`} className="opportunity">
                  <span className="company-logo">
                    {a.company.slice(0, 1).toUpperCase()}
                  </span>
                  <span>
                    <strong>{a.job_title}</strong>
                    <small>
                      {a.company}
                      {a.location ? ` · ${a.location}` : ""}
                    </small>
                  </span>
                </Link>
              </td>
              <td>
                <Badge status={a.status} />
              </td>
              <td className="date-cell">{displayDate(a.applied_on)}</td>
              <td className="next-cell">
                <span>{a.next_action || "—"}</span>
                {a.next_action_at && (
                  <small>{displayDate(a.next_action_at, true)}</small>
                )}
              </td>
              <td>
                <Link
                  aria-label={`View ${a.job_title} at ${a.company}`}
                  to={`/applications/${a.id}`}
                  className="row-arrow"
                >
                  <ArrowUpRight size={18} />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mobile-cards">
        {rows.map((a) => (
          <Link key={a.id} to={`/applications/${a.id}`}>
            <div>
              <strong>{a.job_title}</strong>
              <ArrowUpRight size={17} />
            </div>
            <p>
              {a.company} {a.location && `· ${a.location}`}
            </p>
            <Badge status={a.status} />
            <small>Applied {displayDate(a.applied_on)}</small>
            {a.next_action && (
              <p>
                {a.next_action}
                {a.next_action_at
                  ? ` · ${displayDate(a.next_action_at, true)}`
                  : ""}
              </p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
function Applications() {
  const { session } = useAuth();
  const [params, setParams] = useSearchParams();
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<unknown>(null);
  const search = params.get("q") || "";
  const status = statuses.includes(
    params.get("status") as (typeof statuses)[number],
  )
    ? params.get("status")!
    : "";
  const sort = ["recent", "next", "company"].includes(params.get("sort") || "")
    ? params.get("sort")!
    : "recent";
  const requestedPage = Number(params.get("page"));
  const page =
    Number.isSafeInteger(requestedPage) && requestedPage > 0
      ? requestedPage
      : 1;
  const [draft, setDraft] = useState(search);
  useEffect(() => {
    setDraft(search);
  }, [search]);
  const change = (key: string, value: string) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value);
      else next.delete(key);
      if (key !== "page") next.delete("page");
      return next;
    });
  const query = useQuery({
    queryKey: [
      "applications",
      session!.user.id,
      { search, status, sort, page },
    ],
    queryFn: () =>
      listApplications(session!.user.id, { search, status, sort, page }),
  });
  const totalPages = Math.max(
    1,
    Math.ceil((query.data?.count ?? 0) / PAGE_SIZE),
  );
  useEffect(() => {
    if (query.data && page > totalPages)
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set("page", String(totalPages));
          return next;
        },
        { replace: true },
      );
  }, [query.data, page, totalPages, setParams]);
  return (
    <>
      <PageHeading
        eyebrow="EVERY OPPORTUNITY, ONE PLACE"
        title="Your applications"
        subtitle="Keep track of where you’ve been and where you’re headed."
      >
        <Button
          variant="outline"
          disabled={exporting}
          onClick={async () => {
            setExporting(true);
            setExportError(null);
            try {
              downloadCsv(await allApplications(session!.user.id));
            } catch (e) {
              setExportError(e);
            } finally {
              setExporting(false);
            }
          }}
        >
          <ArrowDownToLine size={16} />
          {exporting ? "Exporting…" : "Export all CSV"}
        </Button>
        <AddButton />
      </PageHeading>
      {Boolean(exportError) && <ErrorMessage error={exportError} />}
      <section className="panel">
        <div className="filters">
          <form
            className="search-form"
            onSubmit={(e) => {
              e.preventDefault();
              change("q", draft);
            }}
          >
            <Search size={18} />
            <input
              aria-label="Search company or job title"
              placeholder="Search company or job title…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
            <Button size="sm" variant="ghost">
              Search
            </Button>
          </form>
          <select
            aria-label="Filter by status"
            value={status}
            onChange={(e) => change("status", e.target.value)}
          >
            <option value="">All statuses</option>
            {statuses.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select
            aria-label="Sort applications"
            value={sort}
            onChange={(e) => change("sort", e.target.value)}
          >
            <option value="recent">Latest application</option>
            <option value="next">Next action date</option>
            <option value="company">Company A–Z</option>
          </select>
        </div>
        {query.error ? (
          <ErrorMessage error={query.error} />
        ) : query.isPending ? (
          <div className="loading" role="status">
            Loading applications…
          </div>
        ) : (
          <>
            {query.data.rows.length ? (
              <ApplicationTable rows={query.data.rows} />
            ) : (
              <Empty filtered={!!(search || status)} />
            )}
            <div className="pagination">
              <span>
                {query.data.count} opportunit
                {query.data.count === 1 ? "y" : "ies"}
                {query.isFetching && " · Refreshing…"}
              </span>
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => change("page", String(page - 1))}
                >
                  <ChevronLeft size={16} />
                  <span className="sr-only">Previous page</span>
                </Button>
                <span>
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => change("page", String(page + 1))}
                >
                  <ChevronRight size={16} />
                  <span className="sr-only">Next page</span>
                </Button>
              </div>
            </div>
          </>
        )}
      </section>
    </>
  );
}
function Editor() {
  const { id } = useParams();
  const { session } = useAuth();
  const cache = useQueryClient();
  const navigate = useNavigate();
  const query = useQuery({
    queryKey: ["application", session!.user.id, id],
    queryFn: () => getApplication(id!, session!.user.id),
    enabled: !!id,
  });
  return (
    <>
      <Link
        className="back-link"
        to={id ? `/applications/${id}` : "/applications"}
      >
        <ArrowLeft size={16} />
        Back to {id ? "application" : "applications"}
      </Link>
      <PageHeading
        eyebrow="MAKE ROOM FOR POSSIBILITY"
        title={id ? "Edit application" : "A new opportunity"}
        subtitle="Capture the details now. Your future self will thank you."
      />
      <section className="panel editor-panel">
        {id && query.isPending ? (
          <p role="status">Loading application…</p>
        ) : query.error ? (
          <ErrorMessage error={query.error} />
        ) : (
          <ApplicationForm
            application={query.data}
            onCancel={() =>
              navigate(id ? `/applications/${id}` : "/applications")
            }
            onSave={async (values) => {
              const saved = await saveApplication(values, session!.user.id, id);
              await Promise.all([
                cache.invalidateQueries({ queryKey: ["applications"] }),
                cache.invalidateQueries({ queryKey: ["application"] }),
                cache.invalidateQueries({ queryKey: ["history"] }),
              ]);
              navigate(`/applications/${saved.id}`);
            }}
          />
        )}
      </section>
    </>
  );
}
function Details() {
  const { id } = useParams();
  const { session } = useAuth();
  const cache = useQueryClient();
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const query = useQuery({
    queryKey: ["application", session!.user.id, id],
    queryFn: () => getApplication(id!, session!.user.id),
  });
  const events = useQuery({
    queryKey: ["history", session!.user.id, id],
    queryFn: () => history(id!),
    enabled: !!query.data,
  });
  if (query.isPending)
    return (
      <div className="panel loading" role="status">
        Loading opportunity…
      </div>
    );
  if (query.error || !query.data)
    return (
      <>
        <Link to="/applications" className="back-link">
          ← Back to applications
        </Link>
        <ErrorMessage error={query.error} />
      </>
    );
  const a = query.data;
  return (
    <>
      <Link className="back-link" to="/applications">
        <ArrowLeft size={16} />
        Back to applications
      </Link>
      <PageHeading
        eyebrow={a.company}
        title={a.job_title}
        subtitle={
          [
            a.location,
            a.work_arrangement !== "Unspecified" ? a.work_arrangement : "",
          ]
            .filter(Boolean)
            .join(" · ") || "Your next possibility"
        }
      >
        <Button variant="outline" onClick={() => setConfirm(true)}>
          <Trash2 size={16} />
          Delete
        </Button>
        <Button asChild>
          <Link to={`/applications/${id}/edit`}>Edit application</Link>
        </Button>
      </PageHeading>
      <div className="detail-grid">
        <section className="panel detail-panel">
          <div className="panel-heading">
            <h2>Opportunity details</h2>
            <Badge status={a.status} />
          </div>
          <dl>
            <div>
              <dt>Company</dt>
              <dd>{a.company}</dd>
            </div>
            <div>
              <dt>Applied on</dt>
              <dd>{displayDate(a.applied_on)}</dd>
            </div>
            <div>
              <dt>Job posting</dt>
              <dd>
                {a.job_url ? (
                  <a
                    className="text-link"
                    href={a.job_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View posting <ArrowUpRight size={15} />
                  </a>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div>
              <dt>Last updated</dt>
              <dd>{displayDate(a.updated_at, true)}</dd>
            </div>
          </dl>
          <div className="detail-block">
            <h3>Next action</h3>
            <p>{a.next_action || "No next action added yet."}</p>
            {a.next_action_at && (
              <span className="action-date">
                <CalendarDays size={16} />
                {displayDate(a.next_action_at, true)}
              </span>
            )}
          </div>
          <div className="detail-block">
            <h3>Notes</h3>
            <p className="notes">
              {a.notes ||
                "A space for contacts, interview prep, and things to remember."}
            </p>
          </div>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Status history</h2>
              <p>Every step of the journey.</p>
            </div>
          </div>
          {events.error ? (
            <ErrorMessage error={events.error} />
          ) : events.isPending ? (
            <p className="loading">Loading history…</p>
          ) : (
            <ol className="timeline">
              {events.data.map((e) => (
                <li key={e.id}>
                  <span className="timeline-dot" />
                  <strong>
                    {e.old_status
                      ? `${e.old_status} → ${e.new_status}`
                      : `Added as ${e.new_status}`}
                  </strong>
                  <small>{displayDate(e.changed_at, true)}</small>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
      <Dialog
        open={confirm}
        onOpenChange={(open) => {
          if (!deleting) setConfirm(open);
        }}
        title="Delete this application?"
        description={`This permanently deletes ${a.job_title} at ${a.company}, including its status history.`}
      >
        {Boolean(error) && <ErrorMessage error={error} />}
        <div className="form-actions">
          <Button
            variant="outline"
            disabled={deleting}
            onClick={() => setConfirm(false)}
          >
            Keep application
          </Button>
          <Button
            variant="destructive"
            disabled={deleting}
            onClick={async () => {
              setDeleting(true);
              setError(null);
              try {
                await deleteApplication(a.id, session!.user.id);
                await cache.invalidateQueries({ queryKey: ["applications"] });
                cache.removeQueries({
                  queryKey: ["application", session!.user.id, id],
                });
                cache.removeQueries({
                  queryKey: ["history", session!.user.id, id],
                });
                navigate("/applications");
              } catch (e) {
                setError(e);
                setDeleting(false);
              }
            }}
          >
            {deleting ? "Deleting…" : "Delete application"}
          </Button>
        </div>
      </Dialog>
    </>
  );
}
export default function App() {
  if (!configured) return <Setup />;
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/auth/callback" element={<Callback />} />
      <Route
        element={
          <Protected>
            <Shell />
          </Protected>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="applications" element={<Applications />} />
        <Route path="applications/new" element={<Editor />} />
        <Route path="applications/:id" element={<Details />} />
        <Route path="applications/:id/edit" element={<Editor />} />
        <Route
          path="*"
          element={
            <div className="empty">
              <h1>Page not found</h1>
              <Button asChild>
                <Link to="/">Back to overview</Link>
              </Button>
            </div>
          }
        />
      </Route>
    </Routes>
  );
}
