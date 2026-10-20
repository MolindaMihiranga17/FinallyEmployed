import { useEffect, useState } from "react";
import {
  Link,
  Navigate,
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
  Plus,
  Search,
  Sparkles,
  Trash2,
  ArrowRight,
  ShieldCheck,
  FileText,
  PencilLine,
  SlidersHorizontal,
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
  roleTypes,
  type Application,
} from "./lib/applications";
import { ApplicationForm } from "./components/application-form";
import { TechTags } from "./components/tech-tags";
import { Button } from "./components/ui/button";
import { Dialog } from "./components/ui/dialog";
import { errorMessage } from "./lib/utils";
import {
  WorkspaceShell as Shell,
  Dashboard,
  BoardPage,
  CalendarPage,
  InsightsPage,
  useApplications,
} from "./components/workspace";

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
        Finally<span className="brand-light">Employed</span>
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
    <div className="auth-page login-page">
      <div className="auth-card">
        <Brand />
        <span className="eyebrow">YOUR NEXT CHAPTER</span>
        <h1>A clearer path to your next role.</h1>
        <p className="muted">
          Applications, interviews, and follow-ups. Everything you need to move
          your job search forward, in one place.
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
          <svg className="google-g" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.32 2.98-7.36Z"
            />
            <path
              fill="#34A853"
              d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.76-5.59-4.12H3.07v2.59A10 10 0 0 0 12 22Z"
            />
            <path
              fill="#FBBC05"
              d="M6.41 13.92a6 6 0 0 1 0-3.84V7.49H3.07a10 10 0 0 0 0 9.02l3.34-2.59Z"
            />
            <path
              fill="#EA4335"
              d="M12 5.96c1.47 0 2.79.51 3.82 1.51l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.93 5.49l3.34 2.59C7.2 7.72 9.4 5.96 12 5.96Z"
            />
          </svg>
          {busy ? "Connecting to Google…" : "Continue with Google"}
          <ArrowUpRight size={17} />
        </Button>
        <small className="muted">
          <ShieldCheck size={15} /> Your workspace is private. Your progress is
          yours.
        </small>
      </div>
      <div className="auth-decoration" aria-hidden="true">
        <span className="auth-label">
          <span className="live-dot" /> BUILT FOR YOUR NEXT MOVE
        </span>
        <p>
          Less keeping track.
          <br />
          <span>More moving forward.</span>
        </p>
        <div className="preview-journey">
          <div>
            <span className="preview-icon">
              <BriefcaseBusiness size={22} />
            </span>
            <span>
              <strong>Find your opportunity</strong>
              <small>Keep the roles that matter in one place.</small>
            </span>
            <Check size={18} />
          </div>
          <div>
            <span className="preview-icon">
              <CalendarDays size={22} />
            </span>
            <span>
              <strong>Make your next move</strong>
              <small>Know what’s next. Show up prepared.</small>
            </span>
            <ArrowRight size={18} />
          </div>
          <div>
            <span className="preview-icon">
              <Sparkles size={22} />
            </span>
            <span>
              <strong>Start a new chapter</strong>
              <small>Every step brings you closer.</small>
            </span>
          </div>
        </div>
        <span className="auth-bottom">
          A little structure. A lot more possibility.
        </span>
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
                    <TechTags tags={a.tech_stack} />
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
            <TechTags tags={a.tech_stack} />
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
  const roleType = roleTypes.includes(
    params.get("role") as (typeof roleTypes)[number],
  )
    ? params.get("role")!
    : "";
  const technology = (params.get("tech") ?? "").slice(0, 50);
  const all = useApplications();
  const technologies = [
    ...new Set(
      (all.data ?? [])
        .flatMap((row) => row.tech_stack ?? [])
        .concat(technology ? [technology] : []),
    ),
  ].sort((a, b) => a.localeCompare(b));
  const active = params.get("group") === "active";
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
      if (key === "status") next.delete("group");
      if (key === "group") next.delete("status");
      return next;
    });
  const query = useQuery({
    queryKey: [
      "applications",
      session!.user.id,
      { search, status, sort, page, active, roleType, technology },
    ],
    queryFn: () =>
      listApplications(session!.user.id, {
        search,
        status,
        sort,
        page,
        active,
        roleType,
        technology,
      }),
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
        eyebrow="YOUR OPPORTUNITIES"
        title="Your applications"
        subtitle="Manage your search, from first application to final offer."
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
        <div
          className="status-tabs"
          role="group"
          aria-label="Application stage"
        >
          <button
            aria-pressed={!status && !active}
            onClick={() => change("status", "")}
          >
            All applications
          </button>
          <button
            aria-pressed={active && !status}
            onClick={() => change("group", "active")}
          >
            In progress
          </button>
          {statuses.map((s) => (
            <button
              key={s}
              aria-pressed={status === s}
              onClick={() => change("status", s)}
            >
              {s}
            </button>
          ))}
        </div>
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
          <SlidersHorizontal
            size={17}
            className="filter-icon"
            aria-hidden="true"
          />
          <select
            aria-label="Sort applications"
            value={sort}
            onChange={(e) => change("sort", e.target.value)}
          >
            <option value="recent">Latest application</option>
            <option value="next">Next action date</option>
            <option value="company">Company A–Z</option>
          </select>
          <select
            aria-label="Filter by role type"
            value={roleType}
            onChange={(e) => change("role", e.target.value)}
          >
            <option value="">All role types</option>
            {roleTypes.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
          <select
            aria-label="Filter by technology"
            value={technology}
            onChange={(e) => change("tech", e.target.value)}
          >
            <option value="">All technologies</option>
            {technologies.map((tech) => (
              <option key={tech}>{tech}</option>
            ))}
          </select>
        </div>
        {(search || status || active || roleType || technology) && (
          <div className="filter-summary">
            <span>
              {active ? "In progress" : status || "All statuses"}
              {roleType && ` · ${roleType}`}
              {technology && ` · ${technology}`}
              {search && (
                <>
                  {" "}
                  · Results for <strong>“{search}”</strong>
                </>
              )}
            </span>
            <button
              onClick={() => {
                setDraft("");
                setParams(sort !== "recent" ? { sort } : {});
              }}
            >
              Clear filters
            </button>
          </div>
        )}
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
              <Empty
                filtered={
                  !!(search || status || active || roleType || technology)
                }
              />
            )}
            <div className="pagination">
              <span>
                {query.data.count
                  ? `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, query.data.count)} of ${query.data.count} ${query.data.count === 1 ? "application" : "applications"}`
                  : "0 applications"}
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
        eyebrow="APPLICATION WORKSPACE"
        title={id ? "Edit application" : "Add an opportunity"}
        subtitle={
          id
            ? "Keep your details and next steps up to date."
            : "Start with the essentials. Add more details as you go."
        }
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
          <Link to={`/applications/${id}/edit`}>
            <PencilLine size={16} />
            Edit application
          </Link>
        </Button>
      </PageHeading>
      <div className="detail-grid">
        <section className="panel detail-panel">
          <div className="panel-heading">
            <h2>
              <BriefcaseBusiness size={18} /> Opportunity details
            </h2>
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
          <div className="detail-block student-details">
            <h3>Tech stack & preparation</h3>
            <dl>
              <div>
                <dt>Role type</dt>
                <dd>{a.role_type ?? "Unspecified"}</dd>
              </div>
              <div>
                <dt>Application deadline</dt>
                <dd>{displayDate(a.application_deadline ?? null)}</dd>
              </div>
              <div className="span-2">
                <dt>Required technologies</dt>
                <dd>
                  {a.tech_stack?.length ? (
                    <TechTags tags={a.tech_stack} />
                  ) : (
                    "No technologies added yet."
                  )}
                </dd>
              </div>
              <div>
                <dt>Coding assessment</dt>
                <dd>{a.assessment_status ?? "Not started"}</dd>
              </div>
              <div>
                <dt>Assessment link</dt>
                <dd>
                  {a.assessment_url ? (
                    <a
                      className="text-link"
                      href={a.assessment_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open assessment <ArrowUpRight size={15} />
                    </a>
                  ) : (
                    "Not added"
                  )}
                </dd>
              </div>
              <div className="span-2">
                <dt>Portfolio or project</dt>
                <dd>
                  {a.portfolio_url ? (
                    <a
                      className="text-link"
                      href={a.portfolio_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View project <ArrowUpRight size={15} />
                    </a>
                  ) : (
                    "Not added"
                  )}
                </dd>
              </div>
            </dl>
            <h3>Preparation notes</h3>
            <p className="notes">
              {a.prep_notes || "Add topics to revise and projects to discuss."}
            </p>
          </div>
          <div className="detail-block next-action-block">
            <h3>
              <CalendarDays size={18} /> Next action
            </h3>
            <p>{a.next_action || "No next action added yet."}</p>
            {a.next_action_at && (
              <span className="action-date">
                <CalendarDays size={16} />
                {displayDate(a.next_action_at, true)}
              </span>
            )}
          </div>
          <div className="detail-block">
            <h3>
              <FileText size={18} /> Notes
            </h3>
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
              <p>A timeline of your application.</p>
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
        <Route path="board" element={<BoardPage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="insights" element={<InsightsPage />} />
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
