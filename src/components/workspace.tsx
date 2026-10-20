import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type CSSProperties,
} from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Clock3,
  Columns3,
  GripVertical,
  LayoutDashboard,
  LogOut,
  Moon,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Sun,
  Target,
  UserRound,
  X,
} from "lucide-react";
import { useAuth } from "../auth";
import { accentColors, useTheme } from "../theme";
import {
  allApplications,
  completeNextAction,
  moveApplication,
} from "../lib/api";
import {
  displayDate,
  statuses,
  type Application,
  type ApplicationInput,
} from "../lib/applications";
import {
  dayKey,
  downloadCalendar,
  monthDays,
  pendingActions,
  readPreferences,
  searchInsights,
  type Preferences,
} from "../lib/workspace";
import { db } from "../lib/supabase";
import { errorMessage } from "../lib/utils";
import { Button } from "./ui/button";
import { Dialog } from "./ui/dialog";
import { TechTags } from "./tech-tags";

function StudentFocus({ rows }: { rows: Application[] }) {
  const today = dayKey(new Date());
  const deadlines = rows
    .filter((row) => row.status === "Saved" && row.application_deadline)
    .sort((a, b) =>
      a.application_deadline!.localeCompare(b.application_deadline!),
    )
    .slice(0, 4);
  const assessments = rows
    .filter(
      (row) =>
        !["Rejected", "Withdrawn"].includes(row.status) &&
        ["Preparing", "Scheduled"].includes(row.assessment_status),
    )
    .slice(0, 4);
  const technologies = new Map<string, { label: string; count: number }>();
  rows.forEach((row) =>
    (row.tech_stack ?? []).forEach((tag) => {
      const key = tag.toLowerCase();
      const current = technologies.get(key);
      technologies.set(key, {
        label: current?.label ?? tag,
        count: (current?.count ?? 0) + 1,
      });
    }),
  );
  const top = [...technologies.values()]
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, 6);
  return (
    <section className="panel student-focus">
      <CardTitle
        title="Your student career toolkit"
        subtitle="Plan your applications and prepare for technical interviews."
      />
      <div className="student-focus-grid">
        <div>
          <h3>Application deadlines</h3>
          <p className="student-caption">For opportunities you have saved.</p>
          {deadlines.length ? (
            deadlines.map((row) => (
              <Link
                className="student-focus-row"
                key={row.id}
                to={`/applications/${row.id}`}
              >
                <strong>{row.company}</strong>
                <span>{row.job_title}</span>
                <small
                  className={
                    row.application_deadline! < today ? "deadline-overdue" : ""
                  }
                >
                  {row.application_deadline! < today
                    ? "Deadline passed · "
                    : row.application_deadline === today
                      ? "Today · "
                      : ""}
                  {displayDate(row.application_deadline)}
                </small>
              </Link>
            ))
          ) : (
            <p className="student-empty">
              Add a deadline to a saved internship or graduate role.
            </p>
          )}
        </div>
        <div>
          <h3>Assessment preparation</h3>
          <p className="student-caption">
            Assessments marked Preparing or Scheduled.
          </p>
          {assessments.length ? (
            assessments.map((row) => (
              <Link
                className="student-focus-row"
                key={row.id}
                to={`/applications/${row.id}`}
              >
                <strong>{row.company}</strong>
                <span>{row.job_title}</span>
                <small>{row.assessment_status}</small>
              </Link>
            ))
          ) : (
            <p className="student-empty">
              Track a coding assessment and keep your revision notes with the
              role.
            </p>
          )}
        </div>
        <div>
          <h3>Technologies in your search</h3>
          <p className="student-caption">
            Frequency across your tracked opportunities.
          </p>
          {top.length ? (
            <div className="student-tech-links">
              {top.map((tech) => (
                <Link
                  key={tech.label}
                  to={`/applications?tech=${encodeURIComponent(tech.label)}`}
                >
                  <span>{tech.label}</span>
                  <strong>{tech.count}</strong>
                </Link>
              ))}
            </div>
          ) : (
            <p className="student-empty">
              Add each job’s required technologies to spot useful skills to
              practise.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

const WorkspaceContext = createContext<{
  preferences: Preferences;
  openSettings: () => void;
  notify: (text: string) => void;
}>({
  preferences: { goal: 5, motion: true },
  openSettings: () => {},
  notify: () => {},
});
export function useApplications() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ["applications", session!.user.id, "all"],
    queryFn: () => allApplications(session!.user.id),
  });
}
function ErrorBox({ error }: { error: unknown }) {
  return (
    <p className="error-box" role="alert">
      {errorMessage(error)}
    </p>
  );
}
function StatusBadge({ status }: { status: string }) {
  return (
    <span className={"badge status-" + status.toLowerCase()}>
      <span />
      {status}
    </span>
  );
}
function useRefresh() {
  const client = useQueryClient();
  return () =>
    Promise.all(
      ["applications", "application", "history"].map((key) =>
        client.invalidateQueries({ queryKey: [key] }),
      ),
    );
}
export function WorkspaceShell() {
  const { theme, resolvedTheme, setTheme, accent, setAccent } = useTheme();
  const [draftAccent, setDraftAccent] = useState(accent);
  const [draftTheme, setDraftTheme] = useState(theme);
  const { session } = useAuth();
  const user = session!.user;
  const { pathname } = useLocation();
  const [preferences, setPreferences] = useState(() =>
    readPreferences(user.id),
  );
  const [settings, setSettings] = useState(false);
  const [profile, setProfile] = useState(false);
  const [reminders, setReminders] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [draftGoal, setDraftGoal] = useState(String(preferences.goal));
  const [draftMotion, setDraftMotion] = useState(preferences.motion);
  const name =
    user.user_metadata.full_name ||
    user.email?.split("@")[0] ||
    "Your workspace";
  const query = useApplications();
  const tasks = pendingActions(query.data ?? []);
  useEffect(() => {
    document.documentElement.dataset.motion = preferences.motion ? "on" : "off";
    return () => {
      delete document.documentElement.dataset.motion;
    };
  }, [preferences.motion]);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 4500);
    return () => window.clearTimeout(timer);
  }, [notice]);
  const openSettings = () => {
    setDraftAccent(accent);
    setDraftTheme(theme);
    setDraftGoal(String(preferences.goal));
    setDraftMotion(preferences.motion);
    setError(null);
    setSettings(true);
  };
  return (
    <WorkspaceContext.Provider
      value={{ preferences, openSettings, notify: setNotice }}
    >
      <div className="app-shell">
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <header className="workspace-header">
          <Link to="/" className="brand">
            <span className="brand-icon">
              <BriefcaseBusiness size={20} />
            </span>
            <span>
              Finally<span className="brand-light">Employed</span>
            </span>
          </Link>
          <span className="workspace-caption">Your career, in motion.</span>
          <span className="workspace-date">
            {new Date().toLocaleDateString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </span>
        </header>
        <div className="workspace-surface">
          <div className="workspace-toolbar">
            <nav className="pill-nav" aria-label="Main navigation">
              <NavLink to="/" end>
                <LayoutDashboard size={16} />
                <span>Dashboard</span>
              </NavLink>
              <NavLink to="/applications">
                <BriefcaseBusiness size={16} />
                <span>Applications</span>
              </NavLink>
              <NavLink to="/board">
                <Columns3 size={16} />
                <span>Board</span>
              </NavLink>
              <NavLink to="/calendar">
                <CalendarDays size={16} />
                <span>Calendar</span>
              </NavLink>
              <NavLink to="/insights">
                <BarChart3 size={16} />
                <span>Insights</span>
              </NavLink>
            </nav>
            <div className="toolbar-actions">
              <button
                type="button"
                className="icon-button"
                aria-label={
                  resolvedTheme === "dark"
                    ? "Switch to light mode"
                    : "Switch to dark mode"
                }
                title={
                  resolvedTheme === "dark"
                    ? "Switch to light mode"
                    : "Switch to dark mode"
                }
                onClick={() => {
                  try {
                    setTheme(resolvedTheme === "dark" ? "light" : "dark");
                  } catch {
                    setNotice(
                      "Your browser could not save the appearance. Allow local storage and try again.",
                    );
                  }
                }}
              >
                {resolvedTheme === "dark" ? (
                  <Sun size={18} />
                ) : (
                  <Moon size={18} />
                )}
              </button>
              <button
                className="settings-button"
                aria-label="Settings"
                onClick={openSettings}
              >
                <Settings2 size={17} />
                <span>Settings</span>
              </button>
              <button
                className="icon-button reminder-button"
                aria-label="View follow-ups"
                onClick={() => setReminders(true)}
              >
                <Bell size={18} />
                {tasks.length > 0 && <span className="notification-dot" />}
              </button>
              <button
                className="icon-button"
                aria-label="Your account"
                onClick={() => {
                  setError(null);
                  setProfile(true);
                }}
              >
                <UserRound size={18} />
              </button>
            </div>
          </div>
          <main id="main-content" tabIndex={-1}>
            <div className="route-stage" key={pathname}>
              <Outlet />
            </div>
          </main>
          <footer>
            <span>
              FinallyEmployed<span className="footer-dot">·</span>A little
              structure. A lot of possibility.
            </span>
            <span>
              <ShieldCheck size={13} />
              Private by design
            </span>
          </footer>
        </div>
      </div>
      {notice && (
        <div className="toast" role="status">
          <CircleCheck size={18} />
          {notice}
          <button
            aria-label="Dismiss notification"
            onClick={() => setNotice("")}
          >
            <X size={15} />
          </button>
        </div>
      )}
      <Dialog
        open={settings}
        onOpenChange={setSettings}
        title="Make it your workspace"
        description="Choose your appearance, weekly target, and animations. Appearance stays on this browser; your target and animations are saved for your account."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const goal = Number(draftGoal);
            if (!Number.isInteger(goal) || goal < 1 || goal > 100) {
              setError(new Error("Choose a whole number from 1 to 100."));
              return;
            }
            const next = { goal, motion: draftMotion };
            try {
              setTheme(draftTheme);
              setAccent(draftAccent);
              localStorage.setItem(
                "finallyemployed:preferences:" + user.id,
                JSON.stringify(next),
              );
              setPreferences(next);
              setSettings(false);
              setNotice("Workspace preferences saved.");
            } catch {
              setError(
                new Error(
                  "Your browser could not save these settings. Allow local storage and try again.",
                ),
              );
            }
          }}
        >
          <fieldset className="theme-setting">
            <legend>Appearance</legend>
            <div className="theme-options">
              {(["light", "dark", "system"] as const).map((option) => (
                <label key={option}>
                  <input
                    type="radio"
                    name="appearance"
                    value={option}
                    checked={draftTheme === option}
                    onChange={() => setDraftTheme(option)}
                  />
                  <span>
                    {option === "system"
                      ? "Use device"
                      : option === "dark"
                        ? "Dark"
                        : "Light"}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className="theme-setting">
            <legend>Accent color</legend>
            <div className="accent-options">
              {accentColors.map((option) => (
                <label key={option.id}>
                  <input
                    type="radio"
                    name="accent"
                    value={option.id}
                    checked={draftAccent === option.id}
                    onChange={() => setDraftAccent(option.id)}
                  />
                  <span
                    className="accent-swatch"
                    style={{ backgroundColor: option.color }}
                    aria-hidden="true"
                  />
                  <span>{option.name}</span>
                </label>
              ))}
            </div>
            <p className="accent-help">
              Colors apply to buttons, highlights, and charts in both modes.
            </p>
          </fieldset>
          <label className="field setting-field">
            <span>Weekly application goal</span>
            <input
              type="number"
              min="1"
              max="100"
              required
              value={draftGoal}
              onChange={(e) => setDraftGoal(e.target.value)}
            />
            <small>Counts application dates from Monday through today.</small>
          </label>
          <label className="toggle-setting">
            <span>
              <strong>Interface animations</strong>
              <small>
                Your device’s reduced-motion preference always takes priority.
              </small>
            </span>
            <input
              type="checkbox"
              checked={draftMotion}
              onChange={(e) => setDraftMotion(e.target.checked)}
            />
          </label>
          {Boolean(error) && <ErrorBox error={error} />}
          <div className="form-actions">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSettings(false)}
            >
              Cancel
            </Button>
            <Button>Save preferences</Button>
          </div>
        </form>
      </Dialog>
      <Dialog
        open={profile}
        onOpenChange={setProfile}
        title="Your account"
        description="Your applications and next steps are visible only to you."
      >
        <div className="profile-summary">
          <span className="avatar">{name.slice(0, 1).toUpperCase()}</span>
          <div>
            <strong>{name}</strong>
            <small>{user.email}</small>
          </div>
          <ShieldCheck size={21} />
        </div>
        {Boolean(error) && <ErrorBox error={error} />}
        <Button
          variant="outline"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const { error } = await db().auth.signOut();
              if (error) throw error;
            } catch (e) {
              setError(e);
            } finally {
              setBusy(false);
            }
          }}
        >
          <LogOut size={16} />
          {busy ? "Signing out…" : "Sign out"}
        </Button>
      </Dialog>
      <Dialog
        open={reminders}
        onOpenChange={setReminders}
        title="Your follow-ups"
        description="Scheduled and unscheduled next actions for open opportunities."
      >
        {query.isPending ? (
          <p className="loading">Loading follow-ups…</p>
        ) : query.error ? (
          <ErrorBox error={query.error} />
        ) : (
          <div className="reminder-list">
            {tasks.length ? (
              tasks.map((row) => (
                <Link
                  key={row.id}
                  to={"/applications/" + row.id}
                  onClick={() => setReminders(false)}
                >
                  <CalendarDays size={19} />
                  <span>
                    <strong>{row.next_action}</strong>
                    <small>
                      {row.company} ·{" "}
                      {row.next_action_at
                        ? displayDate(row.next_action_at, true)
                        : "Not scheduled"}
                    </small>
                  </span>
                  <ArrowUpRight size={16} />
                </Link>
              ))
            ) : (
              <p className="muted">
                No follow-ups yet. Add a next action to an application to see it
                here.
              </p>
            )}
          </div>
        )}
      </Dialog>
    </WorkspaceContext.Provider>
  );
}
function AnimatedNumber({ value }: { value: number }) {
  const { preferences } = useContext(WorkspaceContext);
  const [display, setDisplay] = useState(0);
  const current = useRef(0);
  useEffect(() => {
    if (
      !preferences.motion ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setDisplay(value);
      current.current = value;
      return;
    }
    let frame = 0;
    const from = current.current;
    let start: number | null = null;
    const tick = (time: number) => {
      start ??= time;
      const progress = Math.min((time - start) / 450, 1);
      current.current = from + (value - from) * (1 - (1 - progress) ** 3);
      setDisplay(Math.round(current.current));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, preferences.motion]);
  return (
    <>
      <span aria-hidden="true">{display}</span>
      <span className="sr-only">{value}</span>
    </>
  );
}
export function WorkspaceHeading({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <span className="eyebrow">A LITTLE MORE POSSIBILITY</span>
        <h1>{title}</h1>
        <p className="muted">{subtitle}</p>
      </div>
      <div className="heading-actions">{children}</div>
    </div>
  );
}
function NewApplication() {
  return (
    <Button asChild>
      <Link to="/applications/new">
        <Plus size={17} />
        Add application
      </Link>
    </Button>
  );
}
function CardTitle({
  title,
  subtitle,
  link,
}: {
  title: string;
  subtitle?: string;
  link?: string;
}) {
  return (
    <div className="card-title">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {link && (
        <Link
          to={link}
          className="round-link"
          aria-label={"View " + title.toLowerCase()}
        >
          <ArrowUpRight size={17} />
        </Link>
      )}
    </div>
  );
}
function ActivityChart({ rows }: { rows: Application[] }) {
  const { activity } = searchInsights(rows);
  const max = Math.max(1, ...activity.map((day) => day.count));
  return (
    <div
      className="activity-chart"
      role="img"
      aria-label={
        "Applications in the last seven days: " +
        activity
          .map((day) => day.label + " " + day.date + ": " + day.count)
          .join(", ")
      }
    >
      {activity.map((day, i) => (
        <div
          className={"activity-day " + (i === 6 ? "current" : "")}
          key={day.date}
        >
          <span className="bar-value">{day.count}</span>
          <div className="activity-track">
            <span
              style={{
                height: Math.max(4, (day.count / max) * 100) + "%",
                animationDelay: i * 60 + "ms",
              }}
            />
          </div>
          <small>{day.label.slice(0, 1)}</small>
        </div>
      ))}
    </div>
  );
}
function GoalRing({ value, goal }: { value: number; goal: number }) {
  const percent = Math.min(100, Math.round((value / goal) * 100));
  return (
    <div
      className="goal-ring"
      role="img"
      aria-label={
        value + " of " + goal + " weekly applications, " + percent + " percent"
      }
    >
      <svg viewBox="0 0 160 160" aria-hidden="true">
        <circle className="ring-track" cx="80" cy="80" r="65" />
        <circle
          className="ring-fill"
          cx="80"
          cy="80"
          r="65"
          pathLength="100"
          strokeDasharray={percent + " 100"}
        />
      </svg>
      <div>
        <strong>
          <AnimatedNumber value={percent} />
          <span>%</span>
        </strong>
        <small>
          {value} of {goal} applications
        </small>
      </div>
    </div>
  );
}
function ActionTasks({ rows }: { rows: Application[] }) {
  const actions = pendingActions(rows);
  const refresh = useRefresh();
  const { notify } = useContext(WorkspaceContext);
  const [selected, setSelected] = useState<Application | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  return (
    <>
      <section className="tasks-card">
        <div className="card-title">
          <div>
            <span className="task-eyebrow">A LITTLE MOMENTUM</span>
            <h2>Your next moves</h2>
          </div>
          <span className="task-count">
            {actions.length.toString().padStart(2, "0")}
          </span>
        </div>
        <p className="task-intro">Small steps. Real progress.</p>
        <div className="task-list">
          {actions.slice(0, 5).map((row) => (
            <div className="task" key={row.id}>
              <Link
                className="task-icon"
                to={"/applications/" + row.id}
                aria-label={"Open " + row.company}
              >
                <BriefcaseBusiness size={18} />
              </Link>
              <Link to={"/applications/" + row.id}>
                <strong>{row.next_action}</strong>
                <span>{row.company}</span>
                <small
                  className={
                    row.next_action_at &&
                    new Date(row.next_action_at) < new Date()
                      ? "overdue"
                      : ""
                  }
                >
                  {row.next_action_at
                    ? displayDate(row.next_action_at, true)
                    : "Not scheduled"}
                </small>
              </Link>
              <button
                className="task-check"
                aria-label={
                  "Complete " + row.next_action + " at " + row.company
                }
                onClick={() => {
                  setSelected(row);
                  setError(null);
                }}
              >
                <Check size={13} />
              </button>
            </div>
          ))}
        </div>
        {!actions.length && (
          <div className="task-empty">
            <CircleCheck size={38} />
            <h3>Nothing on your list. Yet.</h3>
            <p>
              Add a next action to any opportunity.
              <br />
              We’ll keep it right here.
            </p>
          </div>
        )}
        <Link className="task-footer" to="/calendar">
          Open your calendar
          <ArrowRight size={16} />
        </Link>
      </section>
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!busy && !open) setSelected(null);
        }}
        title="Mark this next step complete?"
        description={
          selected
            ? selected.next_action +
              " at " +
              selected.company +
              ". This clears the current next action and its scheduled time. Add another next step whenever you’re ready."
            : ""
        }
      >
        {Boolean(error) && <ErrorBox error={error} />}
        <div className="form-actions">
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => setSelected(null)}
          >
            Keep next step
          </Button>
          <Button
            disabled={busy}
            onClick={async () => {
              if (!selected) return;
              setBusy(true);
              try {
                await completeNextAction(selected);
                await refresh();
                setSelected(null);
                notify("Next step completed. Keep that momentum.");
              } catch (e) {
                setError(e);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Saving…" : "Mark complete"}
          </Button>
        </div>
      </Dialog>
    </>
  );
}
export function CalendarPanel({
  rows,
  compact = false,
}: {
  rows: Application[];
  compact?: boolean;
}) {
  const [month, setMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [selected, setSelected] = useState(() => dayKey(new Date()));
  const events = pendingActions(rows).filter((row) => row.next_action_at);
  const days = monthDays(month);
  const selectedEvents = events.filter(
    (row) => dayKey(new Date(row.next_action_at!)) === selected,
  );
  const changeMonth = (offset: number) => {
    const next = new Date(month.getFullYear(), month.getMonth() + offset, 1);
    setMonth(next);
    setSelected(dayKey(next));
  };
  return (
    <section
      className={"calendar-panel panel " + (compact ? "compact-calendar" : "")}
    >
      <div className="calendar-heading">
        <div>
          <h2>
            {compact
              ? "Your calendar"
              : month.toLocaleDateString(undefined, {
                  month: "long",
                  year: "numeric",
                })}
          </h2>
          {compact && (
            <small>
              {month.toLocaleDateString(undefined, {
                month: "long",
                year: "numeric",
              })}
            </small>
          )}
        </div>
        <div className="calendar-controls">
          <button
            className="icon-button"
            aria-label="Previous month"
            onClick={() => changeMonth(-1)}
          >
            <ChevronLeft size={17} />
          </button>
          {!compact && (
            <>
              <input
                type="month"
                aria-label="Go to month"
                value={dayKey(month).slice(0, 7)}
                onChange={(e) => {
                  if (/^\d{4}-\d{2}$/.test(e.target.value)) {
                    const next = new Date(e.target.value + "-01T12:00:00");
                    setMonth(next);
                    setSelected(dayKey(next));
                  }
                }}
              />
              <button
                className="today-button"
                onClick={() => {
                  const now = new Date();
                  setMonth(new Date(now.getFullYear(), now.getMonth(), 1));
                  setSelected(dayKey(now));
                }}
              >
                Today
              </button>
            </>
          )}
          <button
            className="icon-button"
            aria-label="Next month"
            onClick={() => changeMonth(1)}
          >
            <ChevronRight size={17} />
          </button>
        </div>
      </div>
      <div className="calendar-grid" role="group" aria-label="Choose a date">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <span className="weekday" key={d}>
            {d}
          </span>
        ))}
        {days.map((date) => {
          const key = dayKey(date),
            count = events.filter(
              (row) => dayKey(new Date(row.next_action_at!)) === key,
            ).length;
          return (
            <button
              data-day={key}
              className={
                (date.getMonth() !== month.getMonth() ? "outside-month " : "") +
                (key === dayKey(new Date()) ? "is-today " : "")
              }
              key={key}
              aria-pressed={selected === key}
              aria-label={
                date.toLocaleDateString(undefined, { dateStyle: "full" }) +
                (count ? ", " + count + " scheduled" : "")
              }
              onClick={() => setSelected(key)}
            >
              <span>{date.getDate()}</span>
              {count > 0 && <i aria-hidden="true" />}
            </button>
          );
        })}
      </div>
      <div className="day-agenda">
        <div className="agenda-label">
          <span>
            {new Date(selected + "T12:00:00").toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
          </span>
          <span>{selectedEvents.length} scheduled</span>
        </div>
        {selectedEvents.length ? (
          selectedEvents.map((row) => (
            <Link
              className="agenda-event"
              to={"/applications/" + row.id}
              key={row.id}
            >
              <span className="event-time">
                {new Date(row.next_action_at!).toLocaleTimeString(undefined, {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              <div>
                <strong>{row.next_action}</strong>
                <small>
                  {row.company} · {row.job_title}
                </small>
              </div>
              <ArrowUpRight size={15} />
            </Link>
          ))
        ) : (
          <p className="agenda-empty">
            No plans for this day. A little breathing room.
          </p>
        )}
      </div>
    </section>
  );
}
export function Dashboard() {
  const query = useApplications();
  const { session } = useAuth();
  const { preferences, openSettings } = useContext(WorkspaceContext);
  const rows = query.data ?? [],
    insights = searchInsights(rows);
  const name = (
    session!.user.user_metadata.full_name ||
    session!.user.email?.split("@")[0] ||
    "there"
  ).split(" ")[0];
  return (
    <>
      <WorkspaceHeading
        title={"Welcome back, " + name + "."}
        subtitle="Big possibilities start with small, intentional moves."
      >
        <NewApplication />
      </WorkspaceHeading>
      {query.error ? (
        <ErrorBox error={query.error} />
      ) : query.isPending ? (
        <div className="loading" role="status">
          Loading your workspace…
        </div>
      ) : (
        <>
          <div className="dashboard-stats">
            {[
              {
                title: "Total opportunities",
                count: rows.length,
                icon: BriefcaseBusiness,
                to: "/applications",
              },
              {
                title: "Active applications",
                count: insights.active,
                icon: Target,
                to: "/applications?group=active",
              },
              {
                title: "Interviews",
                count: insights.interviews,
                icon: CalendarDays,
                to: "/applications?status=Interview",
              },
              {
                title: "Offers received",
                count: insights.offers,
                icon: Sparkles,
                to: "/applications?status=Offer",
              },
            ].map((item, index) => (
              <Link
                key={item.title}
                to={item.to}
                className="summary-stat"
                style={{ "--i": index } as CSSProperties}
              >
                <span className="summary-icon">
                  <item.icon size={20} />
                </span>
                <div>
                  <span>{item.title}</span>
                  <strong>
                    <AnimatedNumber value={item.count} />
                  </strong>
                </div>
                <ArrowUpRight size={16} />
              </Link>
            ))}
          </div>
          <div className="bento-grid">
            <section className="profile-card">
              <div className="profile-card-top">
                <span>YOUR NEXT CHAPTER</span>
                <Sparkles size={22} />
              </div>
              <div className="profile-monogram" aria-hidden="true">
                {name.slice(0, 1).toUpperCase()}
                <span>↗</span>
              </div>
              <div className="profile-card-bottom">
                <h2>{session!.user.user_metadata.full_name || name}</h2>
                <span>One opportunity at a time.</span>
                <Link to="/applications/new">
                  Make your next move
                  <ArrowUpRight size={16} />
                </Link>
              </div>
            </section>
            <section className="panel activity-card">
              <CardTitle
                title="Your momentum"
                subtitle="Applications · last 7 days"
                link="/insights"
              />
              <div className="activity-total">
                <strong>
                  <AnimatedNumber
                    value={insights.activity.reduce(
                      (sum, d) => sum + d.count,
                      0,
                    )}
                  />
                </strong>
                <span>steps forward</span>
              </div>
              <ActivityChart rows={rows} />
            </section>
            <section className="panel goal-card">
              <CardTitle title="Weekly focus" />
              <GoalRing value={insights.weekCount} goal={preferences.goal} />
              <button className="goal-edit" onClick={openSettings}>
                <Target size={15} />
                Set your weekly goal
                <ArrowUpRight size={14} />
              </button>
            </section>
            <ActionTasks rows={rows} />
            <section className="panel pipeline-card">
              <CardTitle title="In the pipeline" link="/board" />
              <div className="pipeline-list">
                {statuses.map((status) => (
                  <Link key={status} to={"/applications?status=" + status}>
                    <StatusBadge status={status} />
                    <strong>
                      {rows.filter((row) => row.status === status).length}
                    </strong>
                    <ArrowUpRight size={13} />
                  </Link>
                ))}
              </div>
            </section>
            <CalendarPanel rows={rows} compact />
          </div>
          <StudentFocus rows={rows} />
          <section className="panel recent-opportunities">
            <CardTitle
              title="Fresh possibilities"
              subtitle="Your most recently added opportunities."
              link="/applications"
            />
            {rows.length ? (
              <div className="recent-grid">
                {[...rows]
                  .sort((a, b) => b.created_at.localeCompare(a.created_at))
                  .slice(0, 3)
                  .map((row) => (
                    <Link key={row.id} to={"/applications/" + row.id}>
                      <span className="company-logo">
                        {row.company.slice(0, 1)}
                      </span>
                      <div>
                        <strong>{row.job_title}</strong>
                        <small>
                          {row.company} · {row.location || row.work_arrangement}
                        </small>
                      </div>
                      <StatusBadge status={row.status} />
                      <ArrowUpRight size={17} />
                    </Link>
                  ))}
              </div>
            ) : (
              <div className="empty">
                <h3>Room for your first opportunity.</h3>
                <p>
                  Add a role you’re excited about. We’ll help you keep it
                  moving.
                </p>
                <NewApplication />
              </div>
            )}
          </section>
        </>
      )}
    </>
  );
}
export function CalendarPage() {
  const query = useApplications();
  const rows = query.data ?? [];
  const events = pendingActions(rows).filter((row) => row.next_action_at);
  return (
    <>
      <WorkspaceHeading
        title="Make room for what’s next."
        subtitle="Your interviews and follow-ups, with a little more perspective."
      >
        <Button
          variant="outline"
          disabled={!events.length}
          onClick={() => downloadCalendar(rows)}
        >
          <ArrowDownToLine size={16} />
          Export calendar
        </Button>
        <NewApplication />
      </WorkspaceHeading>
      {query.error ? (
        <ErrorBox error={query.error} />
      ) : query.isPending ? (
        <div className="loading">Loading your calendar…</div>
      ) : (
        <div className="calendar-page-grid">
          <CalendarPanel rows={rows} />
          <ActionTasks rows={rows} />
        </div>
      )}
      <p className="page-footnote">
        Calendar export includes all scheduled next actions for open
        opportunities as one-hour events. Unscheduled next actions stay in your
        task list.
      </p>
    </>
  );
}
export function InsightsPage() {
  const query = useApplications();
  const rows = query.data ?? [];
  const stats = searchInsights(rows);
  const { preferences, openSettings } = useContext(WorkspaceContext);
  return (
    <>
      <WorkspaceHeading
        title="See how far you’ve come."
        subtitle="A thoughtful look at your search. Every step counts."
      >
        <Button variant="outline" onClick={openSettings}>
          <Settings2 size={16} />
          Adjust your goal
        </Button>
        <NewApplication />
      </WorkspaceHeading>
      {query.error ? (
        <ErrorBox error={query.error} />
      ) : query.isPending ? (
        <div className="loading">Loading insights…</div>
      ) : (
        <>
          <div className="insights-grid">
            <section className="panel insight-response">
              <CardTitle
                title="Response snapshot"
                subtitle="Based on current application stages."
              />
              <strong className="insight-number">
                <AnimatedNumber value={stats.responseRate} />%
              </strong>
              <p>
                Of submitted opportunities are currently in Screening,
                Interview, Offer, or Rejected.
              </p>
              <span>{stats.submitted} submitted opportunities</span>
            </section>
            <section className="panel">
              <CardTitle title="Weekly focus" />
              <GoalRing value={stats.weekCount} goal={preferences.goal} />
            </section>
            <section className="panel">
              <CardTitle
                title="Application activity"
                subtitle="The last seven days."
              />
              <ActivityChart rows={rows} />
              <p className="chart-footnote">
                Counts use your recorded application dates.
              </p>
            </section>
          </div>
          <section className="panel insights-status">
            <CardTitle
              title="Every stage tells a story"
              subtitle="Current distribution across all your opportunities."
            />
            <div className="status-distribution">
              {statuses.map((status) => {
                const count = rows.filter(
                  (row) => row.status === status,
                ).length;
                return (
                  <Link to={"/applications?status=" + status} key={status}>
                    <StatusBadge status={status} />
                    <div className="distribution-track">
                      <span
                        className={"status-" + status.toLowerCase()}
                        style={{
                          width: rows.length
                            ? (count / rows.length) * 100 + "%"
                            : "0%",
                        }}
                      />
                    </div>
                    <strong>{count}</strong>
                    <span>
                      {rows.length
                        ? Math.round((count / rows.length) * 100)
                        : 0}
                      %
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
          <p className="page-footnote">
            These are snapshots of your current records, not historical
            conversion rates. Saved opportunities are excluded from submitted
            totals.
          </p>
        </>
      )}
    </>
  );
}
export function BoardPage() {
  const query = useApplications();
  const refresh = useRefresh();
  const { notify } = useContext(WorkspaceContext);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [dragged, setDragged] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [pending, setPending] = useState<{
    application: Application;
    status: ApplicationInput["status"];
  } | null>(null);
  const [date, setDate] = useState("");
  const rows = (query.data ?? []).filter((row) =>
    (row.company + " " + row.job_title + " " + (row.tech_stack ?? []).join(" "))
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  async function move(
    row: Application,
    status: ApplicationInput["status"],
    appliedOn?: string,
  ) {
    if (status === row.status) return;
    if (!row.applied_on && status !== "Saved" && !appliedOn) {
      setPending({ application: row, status });
      setDate("");
      setError(null);
      return;
    }
    setSaving(row.id);
    setError(null);
    try {
      await moveApplication(row, status, appliedOn || row.applied_on || "");
      await refresh();
      setPending(null);
      notify(row.company + " moved to " + status + ".");
    } catch (e) {
      setError(e);
    } finally {
      setSaving(null);
    }
  }
  return (
    <>
      <WorkspaceHeading
        title="A little order. More momentum."
        subtitle="Move opportunities between stages. Drag a card or use its stage selector."
      >
        <NewApplication />
      </WorkspaceHeading>
      <div className="board-search">
        <Search size={18} />
        <input
          aria-label="Search board"
          placeholder="Find a company or role…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span>{rows.length} opportunities</span>
      </div>
      {query.error ? (
        <ErrorBox error={query.error} />
      ) : query.isPending ? (
        <div className="loading">Loading your board…</div>
      ) : (
        <>
          {Boolean(error) && !pending && <ErrorBox error={error} />}
          <div className="board-scroll">
            <div className="board-grid">
              {statuses.map((status) => (
                <section
                  className={
                    "board-column " + (hovered === status ? "drag-over" : "")
                  }
                  key={status}
                  aria-label={status + " applications"}
                  onDragOver={(e) => {
                    if (dragged && !saving && !pending) {
                      e.preventDefault();
                      setHovered(status);
                    }
                  }}
                  onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node))
                      setHovered(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setHovered(null);
                    const row = (query.data ?? []).find(
                      (a) => a.id === dragged,
                    );
                    setDragged(null);
                    if (row && !saving && !pending) void move(row, status);
                  }}
                >
                  <div className="board-column-heading">
                    <StatusBadge status={status} />
                    <span>
                      {rows.filter((row) => row.status === status).length}
                    </span>
                  </div>
                  <div className="board-cards">
                    {rows
                      .filter((row) => row.status === status)
                      .map((row) => (
                        <article
                          key={row.id}
                          className={
                            "board-card " +
                            (dragged === row.id ? "dragging" : "")
                          }
                          draggable={!saving && !pending}
                          onDragStart={(e) => {
                            e.dataTransfer.setData("text/plain", row.id);
                            e.dataTransfer.effectAllowed = "move";
                            setDragged(row.id);
                          }}
                          onDragEnd={() => {
                            setDragged(null);
                            setHovered(null);
                          }}
                        >
                          <div className="board-card-top">
                            <span className="company-logo">
                              {row.company.slice(0, 1)}
                            </span>
                            <GripVertical size={16} />
                          </div>
                          <Link to={"/applications/" + row.id}>
                            <h3>{row.job_title}</h3>
                            <p>{row.company}</p>
                          </Link>
                          <small>{row.location || row.work_arrangement}</small>
                          {row.role_type && row.role_type !== "Unspecified" && (
                            <small>{row.role_type}</small>
                          )}
                          <TechTags tags={row.tech_stack} />
                          {row.next_action && (
                            <div className="board-next">
                              <Clock3 size={13} />
                              <span>{row.next_action}</span>
                            </div>
                          )}
                          <label className="board-stage">
                            <span className="sr-only">
                              Stage for {row.job_title} at {row.company}
                            </span>
                            <select
                              value={row.status}
                              disabled={!!saving}
                              onChange={(e) =>
                                void move(
                                  row,
                                  e.target.value as ApplicationInput["status"],
                                )
                              }
                            >
                              {statuses.map((s) => (
                                <option key={s}>{s}</option>
                              ))}
                            </select>
                            {saving === row.id && (
                              <span
                                className="saving-dot"
                                aria-label="Saving"
                              />
                            )}
                          </label>
                        </article>
                      ))}
                    {!rows.some((row) => row.status === status) && (
                      <div className="board-empty">
                        A little room for possibility.
                      </div>
                    )}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </>
      )}
      <Dialog
        open={!!pending}
        onOpenChange={(open) => {
          if (!saving && !open) setPending(null);
        }}
        title="When did you apply?"
        description={
          pending
            ? "Moving " +
              pending.application.company +
              " to " +
              pending.status +
              " needs an application date. Choose the actual date so your insights stay accurate."
            : ""
        }
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (pending) void move(pending.application, pending.status, date);
          }}
        >
          <label className="field setting-field">
            <span>Application date</span>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          {Boolean(error) && <ErrorBox error={error} />}
          <div className="form-actions">
            <Button
              type="button"
              variant="outline"
              disabled={!!saving}
              onClick={() => setPending(null)}
            >
              Cancel
            </Button>
            <Button disabled={!!saving}>
              {saving ? "Moving…" : "Move application"}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
