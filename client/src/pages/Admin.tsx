import { useEffect, useState, type FormEvent } from "react";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { Line } from "react-chartjs-2";
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from "chart.js";
import {
  Activity,
  ArrowUpRight,
  Bell,
  BriefcaseBusiness,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  FolderKanban,
  ImagePlus,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  MessageSquare,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Star,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../lib/api";
import { supabase } from "../lib/supabase";
import { createUuid } from "../lib/uuid";
import {
  Button,
  EmptyState,
  ErrorState,
  Eyebrow,
  Loading,
} from "../components/UI";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
  Filler,
);
type Row = Record<string, unknown> & { id?: string; created_at?: string };

const links = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/admin/projects", label: "Projects", icon: FolderKanban },
  { to: "/admin/services", label: "Services", icon: BriefcaseBusiness },
  { to: "/admin/team", label: "Team members", icon: Users },
  { to: "/admin/testimonials", label: "Testimonials", icon: Star },
  { to: "/admin/messages", label: "Messages", icon: MessageSquare },
  { to: "/admin/analytics", label: "Visitor analytics", icon: Activity },
  { to: "/admin/settings", label: "Website settings", icon: Settings },
  { to: "/admin/account", label: "Account settings", icon: ShieldCheck },
];

export function AdminLayout() {
  const { session, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);
  async function logout() {
    await signOut();
    navigate("/login");
  }
  return (
    <div className="admin-shell">
      <aside className={`admin-sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <Link to="/" className="admin-brand">
          <span className="brand-symbol">S.</span>
          <span>
            STUDIO <small>CONTROL ROOM</small>
          </span>
        </Link>
        <div className="sidebar-label">WORKSPACE</div>
        <nav className="admin-nav">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => (isActive ? "admin-nav-active" : "")}
            >
              <Icon size={17} />
              {label}
              {label === "Messages" && (
                <UnreadBadge token={session?.access_token} />
              )}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="admin-identity">
            <span className="admin-avatar">
              {session?.user.email?.[0]?.toUpperCase() || "A"}
            </span>
            <div>
              <strong>{session?.user.email}</strong>
              <small>Administrator</small>
            </div>
          </div>
          <button onClick={() => void logout()} className="sidebar-logout">
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </aside>
      {sidebarOpen && (
        <button
          className="sidebar-scrim"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close navigation"
        />
      )}
      <div className="admin-main">
        <header className="admin-topbar">
          <button
            className="admin-menu-toggle"
            onClick={() => setSidebarOpen((open) => !open)}
            aria-label="Toggle menu"
          >
            <Menu size={19} />
          </button>
          <span className="admin-breadcrumb">
            Workspace <ChevronRight size={14} />
            <strong>
              {links.find((item) => item.to === location.pathname)?.label ||
                location.pathname.split("/").pop()?.replace("-", " ") ||
                "Overview"}
            </strong>
          </span>
          <div className="topbar-right">
            <span className="secure-label">
              <span className="live-dot" /> SECURE SESSION
            </span>
            <button
              className="icon-button"
              title="Messages"
              onClick={() => navigate("/admin/messages")}
            >
              <Bell size={17} />
            </button>
            <span className="admin-avatar small">
              {session?.user.email?.[0]?.toUpperCase() || "A"}
            </span>
          </div>
        </header>
        <main className="admin-content">
          <Outlet />
        </main>
        <footer className="admin-footer">
          Studio control room <span>•</span> Analytics use Asia/Manila time
        </footer>
      </div>
    </div>
  );
}

function UnreadBadge({ token }: { token?: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!token) return;
    void api<Row[]>("/messages?unread=true", {}, token)
      .then((rows) => setCount(rows.length))
      .catch(() => undefined);
  }, [token]);
  return count > 0 ? (
    <span className="nav-count">{count > 9 ? "9+" : count}</span>
  ) : null;
}

function useAdminData<T>(path: string) {
  const { session } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadId, reload] = useState(0);
  const refresh = () => reload((value) => value + 1);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    void api<T>(path, {}, session?.access_token)
      .then((value) => {
        if (active) setData(value);
      })
      .catch((reason: unknown) => {
        if (active)
          setError(
            reason instanceof Error ? reason.message : "Could not load data.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [path, session?.access_token, reloadId]);
  return { data, loading, error, refresh };
}

export function OverviewPage() {
  const {
    data: stats,
    loading,
    error,
    refresh,
  } = useAdminData<Record<string, number>>("/analytics/overview");
  const { data: analytics, loading: chartLoading } = useAdminData<{
    series: { label: string; views: number; visitors: number }[];
    pages: { path: string; views: number }[];
  }>("/analytics/visitors?range=7d");
  const { data: messages } = useAdminData<Row[]>("/messages?unread=true");
  const counts = [
    {
      label: "Total page views",
      value: stats?.totalVisits,
      icon: Activity,
      note: "All recorded public views",
    },
    {
      label: "Unique browsers",
      value: stats?.uniqueVisitors,
      icon: Users,
      note: "Estimated, not individual people",
    },
    {
      label: "Today’s visits",
      value: stats?.todayVisits,
      icon: ArrowUpRight,
      note: "Asia/Manila calendar day",
    },
    {
      label: "This month",
      value: stats?.monthVisits,
      icon: Activity,
      note: "Asia/Manila calendar month",
    },
    {
      label: "Projects",
      value: stats?.totalProjects,
      icon: FolderKanban,
      note: "All project records",
    },
    {
      label: "Published services",
      value: stats?.publishedServices,
      icon: BriefcaseBusiness,
      note: "Visible to visitors",
    },
    {
      label: "Approved testimonials",
      value: stats?.approvedTestimonials,
      icon: Star,
      note: "Approved for publication",
    },
    {
      label: "Unread messages",
      value: stats?.unreadMessages,
      icon: Mail,
      note: "Awaiting your attention",
    },
  ];
  return (
    <div className="admin-page">
      <div className="admin-page-heading">
        <div>
          <Eyebrow>MONDAY, YOUR STUDIO AT A GLANCE</Eyebrow>
          <h1>
            Overview<span className="heading-period">.</span>
          </h1>
          <p>Real-time signals from the work you put into the world.</p>
        </div>
        <button className="outline-button" onClick={refresh}>
          <RefreshCw size={15} /> Refresh data
        </button>
      </div>
      {error ? (
        <ErrorState message={error} retry={refresh} />
      ) : loading ? (
        <Loading label="Loading actual Supabase records" />
      ) : (
        <div className="metric-grid">
          {counts.map((item, index) => (
            <div
              className={`metric-card metric-card-${index}`}
              key={item.label}
            >
              <div className="metric-top">
                <span>{item.label}</span>
                <item.icon size={16} />
              </div>
              <strong>{item.value?.toLocaleString() ?? "—"}</strong>
              <small>{item.note}</small>
            </div>
          ))}
        </div>
      )}
      <div className="dashboard-grid">
        <section className="admin-panel chart-panel">
          <div className="panel-heading">
            <div>
              <Eyebrow>LAST 7 DAYS</Eyebrow>
              <h2>Public traffic</h2>
            </div>
            <span className="live-pill">
              <i /> REAL DATA
            </span>
          </div>
          {chartLoading ? (
            <Loading />
          ) : analytics?.series?.length ? (
            <div className="chart-wrap">
              <Line
                data={{
                  labels: analytics.series.map((point) => point.label),
                  datasets: [
                    {
                      label: "Page views",
                      data: analytics.series.map((point) => point.views),
                      borderColor: "#a998ff",
                      backgroundColor: "rgba(169,152,255,.12)",
                      fill: true,
                      tension: 0.38,
                      pointRadius: 2,
                      pointHoverRadius: 5,
                    },
                    {
                      label: "Unique browsers",
                      data: analytics.series.map((point) => point.visitors),
                      borderColor: "#9ae7c7",
                      backgroundColor: "rgba(154,231,199,.08)",
                      fill: true,
                      tension: 0.38,
                      pointRadius: 2,
                      pointHoverRadius: 5,
                    },
                  ],
                }}
                options={chartOptions}
              />
            </div>
          ) : (
            <EmptyState title="No page views recorded">
              Visitors will appear here after analytics is configured and real
              traffic reaches the site.
            </EmptyState>
          )}
        </section>
        <section className="admin-panel page-list-panel">
          <div className="panel-heading">
            <div>
              <Eyebrow>WHAT PEOPLE EXPLORE</Eyebrow>
              <h2>Top pages</h2>
            </div>
            <Link to="/admin/analytics" className="arrow-link">
              Details <ArrowUpRight size={13} />
            </Link>
          </div>
          {analytics?.pages?.length ? (
            analytics.pages.slice(0, 6).map((page) => (
              <div className="page-rank" key={page.path}>
                <span className="page-rank-icon">↗</span>
                <span>{page.path}</span>
                <strong>{page.views}</strong>
              </div>
            ))
          ) : (
            <EmptyState title="No pages to rank">
              Recorded public views appear here.
            </EmptyState>
          )}
        </section>
      </div>
      <div className="dashboard-grid dashboard-bottom">
        <section className="admin-panel">
          <div className="panel-heading">
            <div>
              <Eyebrow>YOUR NEXT STEP</Eyebrow>
              <h2>Studio checklist</h2>
            </div>
          </div>
          <div className="checklist">
            <Link to="/admin/projects">
              <span className="checklist-icon">
                <FolderKanban size={16} />
              </span>
              <div>
                <strong>Share a project</strong>
                <small>Show visitors the work you’re proud of.</small>
              </div>
              <ArrowUpRight size={15} />
            </Link>
            <Link to="/admin/team">
              <span className="checklist-icon">
                <Users size={16} />
              </span>
              <div>
                <strong>Introduce the team</strong>
                <small>Complete your three profile pages.</small>
              </div>
              <ArrowUpRight size={15} />
            </Link>
            <Link to="/admin/settings">
              <span className="checklist-icon">
                <Settings size={16} />
              </span>
              <div>
                <strong>Personalize your studio</strong>
                <small>Set your name, story, and contact details.</small>
              </div>
              <ArrowUpRight size={15} />
            </Link>
          </div>
        </section>
        <section className="admin-panel">
          <div className="panel-heading">
            <div>
              <Eyebrow>INBOX</Eyebrow>
              <h2>Unread messages</h2>
            </div>
            <Link to="/admin/messages" className="arrow-link">
              Open inbox <ArrowUpRight size={13} />
            </Link>
          </div>
          {messages?.length ? (
            messages.slice(0, 4).map((message) => (
              <Link
                className="inbox-preview"
                to="/admin/messages"
                key={String(message.id)}
              >
                <span className="message-dot" />
                <span>
                  <strong>{String(message.full_name)}</strong>
                  <small>{String(message.subject)}</small>
                </span>
                <time>{formatDate(message.created_at)}</time>
              </Link>
            ))
          ) : (
            <EmptyState title="You’re all caught up">
              New client inquiries will land here.
            </EmptyState>
          )}
        </section>
      </div>
      <div className="privacy-disclaimer">
        <CircleHelp size={15} /> Visitor totals use pseudonymized, first-party
        browser IDs. Unique visitors are estimates, not confirmed individual
        people. No raw IP address is retained.
      </div>
    </div>
  );
}
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: "bottom" as const,
      labels: {
        color: "#a6a7b0",
        usePointStyle: true,
        boxWidth: 7,
        padding: 18,
      },
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { color: "#777985", maxRotation: 0, autoSkip: true },
    },
    y: {
      beginAtZero: true,
      grid: { color: "rgba(255,255,255,.06)" },
      ticks: { color: "#777985", precision: 0 },
    },
  },
};
function formatDate(value: unknown) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(String(value)));
}

type FieldKind =
  | "text"
  | "textarea"
  | "email"
  | "url"
  | "date"
  | "number"
  | "boolean"
  | "array"
  | "image"
  | "gallery"
  | "status";
interface FieldDefinition {
  key: string;
  label: string;
  kind?: FieldKind;
  required?: boolean;
  bucket?: string;
  hint?: string;
}
const fieldsByType: Record<string, FieldDefinition[]> = {
  projects: [
    { key: "title", label: "Project title", required: true },
    {
      key: "slug",
      label: "URL slug",
      required: true,
      hint: "Lowercase words separated by hyphens.",
    },
    {
      key: "short_description",
      label: "Short description",
      kind: "textarea",
      required: true,
    },
    { key: "description", label: "Full project story", kind: "textarea" },
    { key: "category", label: "Category", required: true },
    {
      key: "cover_image",
      label: "Cover image",
      kind: "image",
      bucket: "project-images",
    },
    {
      key: "gallery",
      label: "Project gallery images",
      kind: "gallery",
      bucket: "project-images",
    },
    { key: "technologies", label: "Technologies", kind: "array" },
    {
      key: "owner_member_id",
      label: "Project owner member ID",
      hint: "Copy the member ID from Team management; leave blank if not assigned.",
    },
    {
      key: "contributing_member_ids",
      label: "Contributing member IDs",
      kind: "array",
    },
    { key: "completed_at", label: "Completion date", kind: "date" },
    { key: "github_url", label: "GitHub URL", kind: "url" },
    { key: "live_url", label: "Live project URL", kind: "url" },
    { key: "featured", label: "Featured project", kind: "boolean" },
    { key: "published", label: "Publish publicly", kind: "boolean" },
  ],
  services: [
    { key: "title", label: "Service name", required: true },
    { key: "category", label: "Category", required: true },
    {
      key: "description",
      label: "Description",
      kind: "textarea",
      required: true,
    },
    {
      key: "icon",
      label: "Icon key",
      hint: "Examples: code, layout, sparkles",
    },
    {
      key: "image_url",
      label: "Service image",
      kind: "image",
      bucket: "service-images",
    },
    { key: "sort_order", label: "Sort order", kind: "number" },
    { key: "published", label: "Publish publicly", kind: "boolean" },
  ],
  team: [
    { key: "full_name", label: "Full name", required: true },
    { key: "slug", label: "Profile URL slug", required: true },
    { key: "title", label: "Professional title", required: true },
    { key: "specialization", label: "Specialization" },
    { key: "bio", label: "Biography", kind: "textarea" },
    {
      key: "photo_url",
      label: "Profile photo",
      kind: "image",
      bucket: "team-images",
    },
    { key: "skills", label: "Skills", kind: "array" },
    { key: "education", label: "Education", kind: "textarea" },
    { key: "email", label: "Contact email", kind: "email" },
    { key: "phone", label: "Mobile number" },
    { key: "facebook_url", label: "Facebook URL", kind: "url" },
    { key: "github_url", label: "GitHub URL", kind: "url" },
    { key: "linkedin_url", label: "LinkedIn URL", kind: "url" },
    {
      key: "auth_user_id",
      label: "Linked admin user UUID",
      hint: "Optional: links this profile to its corresponding Supabase admin account.",
    },
    { key: "active", label: "Show profile publicly", kind: "boolean" },
    { key: "sort_order", label: "Display order", kind: "number" },
  ],
  testimonials: [
    { key: "client_name", label: "Client name", required: true },
    { key: "rating", label: "Rating (1–5)", kind: "number", required: true },
    { key: "message", label: "Testimonial", kind: "textarea", required: true },
    {
      key: "photo_url",
      label: "Client photo",
      kind: "image",
      bucket: "testimonial-images",
    },
    { key: "status", label: "Moderation status", kind: "status" },
  ],
};

const displayKeys: Record<string, string[]> = {
  projects: ["title", "category", "featured", "published", "created_at"],
  services: ["title", "category", "published", "sort_order"],
  team: ["full_name", "title", "active", "id"],
  testimonials: ["client_name", "rating", "status", "created_at"],
};
const configByRoute: Record<
  string,
  { heading: string; plural: string; singular: string; endpoint: string }
> = {
  projects: {
    heading: "Projects",
    plural: "projects",
    singular: "project",
    endpoint: "/projects",
  },
  services: {
    heading: "Services",
    plural: "services",
    singular: "service",
    endpoint: "/services",
  },
  team: {
    heading: "Team members",
    plural: "team members",
    singular: "team member",
    endpoint: "/team",
  },
  testimonials: {
    heading: "Testimonials",
    plural: "testimonials",
    singular: "testimonial",
    endpoint: "/testimonials",
  },
};

export function ContentManager({
  type,
}: {
  type: "projects" | "services" | "team" | "testimonials";
}) {
  const conf = configByRoute[type];
  const fields = fieldsByType[type];
  const { session } = useAuth();
  const [moderation, setModeration] = useState("all");
  const path = `${conf.endpoint}?all=true&limit=100${type === "testimonials" && moderation !== "all" ? `&status=${moderation}` : ""}`;
  const { data, loading, error, refresh } = useAdminData<Row[]>(path);
  const rows = data || [];
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [editor, setEditor] = useState<Row | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [failure, setFailure] = useState("");
  const filtered = rows.filter((row) =>
    `${row.title || row.full_name || row.client_name || ""} ${row.category || ""} ${row.status || ""}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const pageSize = 8;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editor || !session) return;
    setSaving(true);
    setFailure("");
    setNotice("");
    const formData = new FormData(event.currentTarget);
    const values: Record<string, unknown> = {};
    for (const field of fields) {
      let value: unknown = formData.get(field.key);
      if (field.kind === "boolean") value = value === "on";
      else if (field.kind === "array" || field.kind === "gallery")
        value = String(value || "")
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean);
      else if (field.kind === "number")
        value = value === "" ? undefined : Number(value);
      else if (typeof value === "string") value = value.trim();
      if (
        value === "" &&
        ["owner_member_id", "auth_user_id"].includes(field.key)
      )
        value = null;
      if (value !== undefined) values[field.key] = value;
    }
    try {
      const path = editor.id ? `${conf.endpoint}/${editor.id}` : conf.endpoint;
      await api(
        path,
        { method: editor.id ? "PUT" : "POST", body: JSON.stringify(values) },
        session.access_token,
      );
      setNotice(
        `${conf.singular[0].toUpperCase()}${conf.singular.slice(1)} saved.`,
      );
      setEditor(null);
      refresh();
    } catch (reason) {
      setFailure(
        reason instanceof Error
          ? reason.message
          : "Could not save this record.",
      );
    } finally {
      setSaving(false);
    }
  }
  async function remove(row: Row) {
    const name = String(
      row.title || row.full_name || row.client_name || conf.singular,
    );
    if (
      !session ||
      !window.confirm(`Permanently delete “${name}”? This cannot be undone.`)
    )
      return;
    try {
      await api(
        `${conf.endpoint}/${row.id}`,
        { method: "DELETE" },
        session.access_token,
      );
      refresh();
      setNotice(`${conf.singular} deleted.`);
    } catch (reason) {
      setFailure(reason instanceof Error ? reason.message : "Delete failed.");
    }
  }
  async function moderate(id: string, action: "approve" | "reject") {
    if (!session) return;
    try {
      if (action === "approve")
        await api(
          `/testimonials/${id}/approve`,
          { method: "POST" },
          session.access_token,
        );
      else
        await api(
          `/testimonials/${id}`,
          { method: "PUT", body: JSON.stringify({ status: "rejected" }) },
          session.access_token,
        );
      refresh();
    } catch (reason) {
      setFailure(
        reason instanceof Error
          ? reason.message
          : "Could not update moderation status.",
      );
    }
  }
  const canCreate = type !== "testimonials";
  return (
    <div className="admin-page">
      <div className="admin-page-heading">
        <div>
          <Eyebrow>CONTENT WORKSPACE</Eyebrow>
          <h1>
            {conf.heading}
            <span className="heading-period">.</span>
          </h1>
          <p>Manage the content that shapes your public studio.</p>
        </div>
        {canCreate && (
          <Button
            onClick={() => {
              setEditor({});
              setFailure("");
            }}
          >
            <Plus size={16} /> Add {conf.singular}
          </Button>
        )}
      </div>
      {notice && (
        <div className="admin-notice">
          <Check size={15} />
          {notice}
          <button onClick={() => setNotice("")}>
            <X size={14} />
          </button>
        </div>
      )}
      {failure && (
        <div className="admin-alert">
          {failure}
          <button onClick={() => setFailure("")}>
            <X size={14} />
          </button>
        </div>
      )}
      {type === "team" && rows.length < 3 && (
        <div className="privacy-disclaimer">
          <Users size={15} /> Add up to three real profiles. The public team
          page only includes active profiles; no placeholder members are
          generated.
        </div>
      )}
      <section className="admin-panel table-panel">
        <div className="table-toolbar">
          <div>
            <Eyebrow>LIVE RECORDS</Eyebrow>
            <h2>
              {rows.length} {conf.plural}
            </h2>
          </div>
          <div className="manager-tools">
            {type === "testimonials" && (
              <select
                value={moderation}
                onChange={(event) => setModeration(event.target.value)}
              >
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            )}
            <label className="admin-search">
              <Search size={16} />
              <input
                aria-label={`Search ${conf.plural}`}
                placeholder="Search records…"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
              />
            </label>
          </div>
        </div>
        {loading ? (
          <Loading label={`Loading ${conf.plural}`} />
        ) : error ? (
          <ErrorState message={error} retry={refresh} />
        ) : !rows.length ? (
          <EmptyState title={`No ${conf.plural} yet`}>
            Create the first record to publish real studio content.
          </EmptyState>
        ) : (
          <>
            <div className="table-scroll">
              <table className="admin-table">
                <thead>
                  <tr>
                    {displayKeys[type].map((key) => (
                      <th key={key}>{key.replaceAll("_", " ")}</th>
                    ))}
                    <th className="actions-heading">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((row) => (
                    <tr key={String(row.id)}>
                      {displayKeys[type].map((key) => (
                        <td key={key}>{renderCell(row[key], key)}</td>
                      ))}
                      <td>
                        <div className="table-actions">
                          {type === "testimonials" &&
                            row.status === "pending" && (
                              <>
                                <button
                                  className="approve-action"
                                  onClick={() =>
                                    void moderate(String(row.id), "approve")
                                  }
                                  title="Approve"
                                >
                                  <Check size={15} />
                                </button>
                                <button
                                  className="reject-action"
                                  onClick={() =>
                                    void moderate(String(row.id), "reject")
                                  }
                                  title="Reject"
                                >
                                  <X size={15} />
                                </button>
                              </>
                            )}
                          <button
                            onClick={() => {
                              setEditor(row);
                              setFailure("");
                            }}
                            title="Edit"
                          >
                            <Pencil size={15} />
                          </button>
                          {type !== "team" && (
                            <button
                              className="delete-action"
                              onClick={() => void remove(row)}
                              title="Delete"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="table-pagination">
              <span>
                Showing {Math.min(filtered.length, (page - 1) * pageSize + 1)}–
                {Math.min(filtered.length, page * pageSize)} of{" "}
                {filtered.length}
              </span>
              <div>
                <button
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft size={16} />
                </button>
                <span>
                  {page} / {pageCount}
                </span>
                <button
                  onClick={() =>
                    setPage((value) => Math.min(pageCount, value + 1))
                  }
                  disabled={page === pageCount}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </section>
      {editor && (
        <EditorModal
          title={`${editor.id ? "Edit" : "Add"} ${conf.singular}`}
          fields={fields}
          row={editor}
          busy={saving}
          error={failure}
          onClose={() => setEditor(null)}
          onSubmit={save}
        />
      )}
    </div>
  );
}
function renderCell(value: unknown, key: string) {
  if (typeof value === "boolean")
    return (
      <span className={`status-chip ${value ? "status-live" : "status-muted"}`}>
        {value ? (key === "featured" ? "Featured" : "Active") : "Draft"}
      </span>
    );
  if (key === "rating")
    return (
      <span className="stars">
        {"★".repeat(Number(value) || 0)}
        <span>{"★".repeat(5 - (Number(value) || 0))}</span>
      </span>
    );
  if (key === "status")
    return (
      <span className={`status-chip status-${String(value)}`}>
        {String(value)}
      </span>
    );
  if (key === "created_at") return formatDate(value);
  return String(value ?? "—");
}

function EditorModal({
  title,
  fields,
  row,
  busy,
  error,
  onClose,
  onSubmit,
}: {
  title: string;
  fields: FieldDefinition[];
  row: Row;
  busy: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form className="editor-modal" onSubmit={onSubmit}>
        <header>
          <div>
            <Eyebrow>STUDIO CONTENT</Eyebrow>
            <h2>{title}</h2>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </header>
        <div className="editor-fields">
          {fields.map((field) => (
            <EditorField key={field.key} field={field} row={row} />
          ))}
        </div>
        {error && <p className="form-error">{error}</p>}
        <footer>
          <button type="button" className="outline-button" onClick={onClose}>
            Cancel
          </button>
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save changes"}
            <Check size={15} />
          </Button>
        </footer>
      </form>
    </div>
  );
}
function EditorField({ field, row }: { field: FieldDefinition; row: Row }) {
  const value = row[field.key];
  const boolean = field.kind === "boolean";
  if (field.kind === "image")
    return <MediaField field={field} current={String(value || "")} />;
  if (field.kind === "gallery")
    return (
      <MediaGalleryField
        field={field}
        current={Array.isArray(value) ? value.map(String) : []}
      />
    );
  if (boolean)
    return (
      <label className="toggle-field">
        <span>
          <strong>{field.label}</strong>
          <small>
            Control whether this content appears on the public site.
          </small>
        </span>
        <input
          type="checkbox"
          name={field.key}
          defaultChecked={Boolean(value)}
        />
        <i />
      </label>
    );
  const placeholder =
    field.kind === "array" ? "One entry per line" : field.hint || "";
  const formattedValue = Array.isArray(value)
    ? value
        .map((item) =>
          typeof item === "object" &&
          item !== null &&
          "label" in item &&
          "url" in item
            ? `${String(item.label)} | ${String(item.url)}`
            : String(item),
        )
        .join("\n")
    : String(value ?? "");
  return (
    <label className="form-field">
      <span>
        {field.label}
        {field.required && <i> *</i>}
      </span>
      {field.kind === "textarea" || field.kind === "array" ? (
        <textarea
          name={field.key}
          required={field.required}
          maxLength={field.kind === "array" ? 10000 : 12000}
          rows={field.kind === "array" ? 3 : 4}
          defaultValue={formattedValue}
          placeholder={placeholder}
        />
      ) : field.kind === "status" ? (
        <select name={field.key} defaultValue={String(value || "pending")}>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      ) : (
        <input
          name={field.key}
          type={field.kind === "date" ? "date" : field.kind || "text"}
          required={field.required}
          maxLength={500}
          defaultValue={value == null ? "" : String(value)}
          placeholder={placeholder}
        />
      )}
      {field.hint && field.kind !== "text" && <small>{field.hint}</small>}
    </label>
  );
}
function MediaField({
  field,
  current,
}: {
  field: FieldDefinition;
  current: string;
}) {
  const { session } = useAuth();
  const [url, setUrl] = useState(current);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function upload(file?: File) {
    setError("");
    if (!file || !supabase || !session) return;
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/avif"];
    const extension = file.name.split(".").pop()?.toLowerCase() || "";
    if (
      !allowed.includes(file.type) ||
      !["jpg", "jpeg", "png", "webp", "avif"].includes(extension) ||
      file.size > 5 * 1024 * 1024
    ) {
      setError("Choose a matching JPG, PNG, WebP or AVIF image up to 5 MB.");
      return;
    }
    setBusy(true);
    try {
      const path = `${createUuid()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from(field.bucket || "project-images")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage
        .from(field.bucket || "project-images")
        .getPublicUrl(path);
      setUrl(data.publicUrl);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Image upload failed.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!url || !session) return;
    const bucket = field.bucket || "project-images";
    const marker = `/storage/v1/object/public/${bucket}/`;
    const at = url.indexOf(marker);
    if (at >= 0) {
      setBusy(true);
      setError("");
      try {
        const path = decodeURIComponent(
          url.slice(at + marker.length).split("?")[0],
        );
        await api(
          "/storage",
          { method: "POST", body: JSON.stringify({ bucket, path }) },
          session.access_token,
        );
      } catch (reason) {
        setError(
          reason instanceof Error
            ? reason.message
            : "Could not remove the stored image.",
        );
        setBusy(false);
        return;
      } finally {
        setBusy(false);
      }
    }
    setUrl("");
  }
  return (
    <div className="media-field">
      <input type="hidden" name={field.key} value={url} />
      <div className="media-field-title">
        {field.label}
        <small>Up to 5 MB · JPG, PNG, WebP, AVIF</small>
      </div>
      {url && <img src={url} alt="Image preview" className="media-preview" />}
      <label className="upload-button">
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          disabled={busy}
          onChange={(event) => void upload(event.target.files?.[0])}
        />
        {busy ? (
          <>
            <span className="spin">◌</span> Uploading…
          </>
        ) : (
          <>
            <ImagePlus size={15} /> {url ? "Replace image" : "Choose image"}
          </>
        )}
      </label>
      {url && (
        <button
          type="button"
          className="remove-image"
          disabled={busy}
          onClick={() => void remove()}
        >
          {busy ? "Removing…" : "Remove image"}
        </button>
      )}
      {error && <small className="form-error">{error}</small>}
    </div>
  );
}

function MediaGalleryField({
  field,
  current,
}: {
  field: FieldDefinition;
  current: string[];
}) {
  const { session } = useAuth();
  const [urls, setUrls] = useState(current);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const bucket = field.bucket || "project-images";
  async function upload(files: FileList | null) {
    if (!files || !supabase || !session) return;
    setError("");
    const accepted = Array.from(files);
    for (const file of accepted) {
      const extension = file.name.split(".").pop()?.toLowerCase() || "";
      if (
        !["image/jpeg", "image/png", "image/webp", "image/avif"].includes(
          file.type,
        ) ||
        !["jpg", "jpeg", "png", "webp", "avif"].includes(extension) ||
        file.size > 5 * 1024 * 1024
      ) {
        setError(
          `${file.name}: choose a matching JPG, PNG, WebP or AVIF image up to 5 MB.`,
        );
        return;
      }
    }
    setBusy(true);
    try {
      const uploaded: string[] = [];
      for (const file of accepted) {
        const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${createUuid()}.${extension}`;
        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(path, file, { contentType: file.type, upsert: false });
        if (uploadError) throw uploadError;
        uploaded.push(
          supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl,
        );
      }
      setUrls((previous) => [...previous, ...uploaded]);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Gallery upload failed.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function removeImage(url: string) {
    if (!session) return;
    const marker = `/storage/v1/object/public/${bucket}/`;
    const at = url.indexOf(marker);
    if (at >= 0) {
      setBusy(true);
      setError("");
      try {
        const path = decodeURIComponent(
          url.slice(at + marker.length).split("?")[0],
        );
        await api(
          "/storage",
          { method: "POST", body: JSON.stringify({ bucket, path }) },
          session.access_token,
        );
      } catch (reason) {
        setError(
          reason instanceof Error
            ? reason.message
            : "Could not remove the image.",
        );
        setBusy(false);
        return;
      } finally {
        setBusy(false);
      }
    }
    setUrls((previous) => previous.filter((item) => item !== url));
  }
  return (
    <div className="media-field gallery-media-field">
      <input type="hidden" name={field.key} value={urls.join("\n")} />
      <div className="media-field-title">
        {field.label}
        <small>Select multiple images · 5 MB each · JPG, PNG, WebP, AVIF</small>
      </div>
      <div className="gallery-previews">
        {urls.map((url) => (
          <div className="gallery-preview" key={url}>
            <img src={url} alt="Project gallery preview" />
            <button
              type="button"
              onClick={() => void removeImage(url)}
              disabled={busy}
              aria-label="Remove gallery image"
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>
      <label className="upload-button">
        <input
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/avif"
          disabled={busy}
          onChange={(event) => void upload(event.target.files)}
        />
        {busy ? (
          "Uploading…"
        ) : (
          <>
            <ImagePlus size={15} /> Add gallery images
          </>
        )}
      </label>
      {error && <small className="form-error">{error}</small>}
    </div>
  );
}

export function MessagesPage() {
  const { session } = useAuth();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<Row | null>(null);
  const path = `/messages?${new URLSearchParams({ ...(query ? { q: query } : {}), ...(filter === "unread" ? { unread: "true" } : filter === "read" ? { unread: "false" } : {}) }).toString()}`;
  const { data, loading, error, refresh } = useAdminData<Row[]>(path);
  async function update(row: Row, is_read: boolean) {
    if (!session) return;
    try {
      await api(
        `/messages/${row.id}`,
        { method: "PUT", body: JSON.stringify({ is_read }) },
        session.access_token,
      );
      refresh();
      if (selected?.id === row.id) setSelected({ ...selected, is_read });
    } catch {
      /* The list remains intact; refresh exposes the server state. */
    }
  }
  async function remove(row: Row) {
    if (
      !session ||
      !window.confirm(`Delete the inquiry from ${row.full_name}?`)
    )
      return;
    try {
      await api(
        `/messages/${row.id}`,
        { method: "DELETE" },
        session.access_token,
      );
      setSelected(null);
      refresh();
    } catch {
      /* Keep the item visible when the server rejects the change. */
    }
  }
  async function retry(row: Row) {
    if (!session) return;
    try {
      await api(
        `/messages/${row.id}/retry-email`,
        { method: "POST" },
        session.access_token,
      );
      refresh();
    } catch (reason) {
      window.alert(reason instanceof Error ? reason.message : "Retry failed.");
      refresh();
    }
  }
  const rows = data || [];
  return (
    <div className="admin-page">
      <div className="admin-page-heading">
        <div>
          <Eyebrow>CLIENT INBOX</Eyebrow>
          <h1>
            Messages<span className="heading-period">.</span>
          </h1>
          <p>Every inquiry, all in one place.</p>
        </div>
        <span className="inbox-count">
          {rows.filter((row) => !row.is_read).length} unread
        </span>
      </div>
      <section className="admin-panel message-panel">
        <div className="message-toolbar">
          <label className="admin-search">
            <Search size={16} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, email or subject…"
            />
          </label>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All messages</option>
            <option value="unread">Unread</option>
            <option value="read">Read</option>
          </select>
        </div>
        {loading ? (
          <Loading label="Loading inbox" />
        ) : error ? (
          <ErrorState message={error} retry={refresh} />
        ) : rows.length ? (
          <div className="message-list">
            {rows.map((row) => (
              <button
                className={`message-row ${!row.is_read ? "message-unread" : ""}`}
                key={String(row.id)}
                onClick={() => {
                  setSelected(row);
                  void update(row, true);
                }}
              >
                <span className="message-indicator" />
                <span className="message-sender">
                  <strong>{String(row.full_name)}</strong>
                  <small>{String(row.email)}</small>
                </span>
                <span className="message-content">
                  <strong>{String(row.subject)}</strong>
                  <small>{String(row.message).slice(0, 90)}</small>
                </span>
                <span
                  className={`mail-status mail-${String(row.email_status)}`}
                >
                  {String(row.email_status)}
                </span>
                <time>{formatDate(row.created_at)}</time>
              </button>
            ))}
          </div>
        ) : (
          <EmptyState title="No messages yet">
            Client inquiries sent through the public contact form appear here.
          </EmptyState>
        )}
      </section>
      {selected && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelected(null);
          }}
        >
          <section className="message-detail-modal">
            <header>
              <div>
                <Eyebrow>INQUIRY DETAILS</Eyebrow>
                <button
                  className="icon-button"
                  onClick={() => setSelected(null)}
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>
              <h2>{String(selected.subject)}</h2>
              <p>
                {String(selected.full_name)} ·{" "}
                <a href={`mailto:${selected.email}`}>
                  {String(selected.email)}
                </a>{" "}
                · {formatDate(selected.created_at)}
              </p>
            </header>
            <article>{String(selected.message)}</article>
            <div className="mail-status-row">
              <span
                className={`mail-status mail-${String(selected.email_status)}`}
              >
                Notification {String(selected.email_status)}
              </span>
              {selected.email_error != null && (
                <small>{String(selected.email_error)}</small>
              )}
            </div>
            <footer>
              {selected.email_status !== "sent" && (
                <button
                  className="outline-button"
                  onClick={() => void retry(selected)}
                >
                  <RefreshCw size={14} /> Retry notification
                </button>
              )}
              <button
                className="outline-button"
                onClick={() => void update(selected, !selected.is_read)}
              >
                {selected.is_read ? "Mark unread" : "Mark read"}
              </button>
              <Button variant="danger" onClick={() => void remove(selected)}>
                <Trash2 size={14} /> Delete
              </Button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}

export function AnalyticsPage() {
  const [range, setRange] = useState("30d");
  const { data, loading, error, refresh } = useAdminData<{
    totalViews: number;
    uniqueVisitors: number;
    series: { label: string; views: number; visitors: number }[];
    pages: { path: string; views: number }[];
    recent: { path: string; created_at: string }[];
    timezone: string;
  }>(`/analytics/visitors?range=${range}`);
  return (
    <div className="admin-page">
      <div className="admin-page-heading">
        <div>
          <Eyebrow>PRIVACY-CONSCIOUS VISITOR ANALYTICS</Eyebrow>
          <h1>
            Analytics<span className="heading-period">.</span>
          </h1>
          <p>
            Actual anonymous public page-view records, reported in Asia/Manila
            time.
          </p>
        </div>
        <select
          className="range-select"
          value={range}
          onChange={(e) => setRange(e.target.value)}
        >
          <option value="today">Today</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="12m">Last 12 months</option>
        </select>
      </div>
      {loading ? (
        <Loading label="Calculating actual visitor records" />
      ) : error ? (
        <ErrorState message={error} retry={refresh} />
      ) : (
        data && (
          <>
            <div className="metric-grid metric-grid-small">
              <div className="metric-card">
                <div className="metric-top">
                  Page views
                  <Activity size={16} />
                </div>
                <strong>{data.totalViews.toLocaleString()}</strong>
                <small>For selected reporting window</small>
              </div>
              <div className="metric-card">
                <div className="metric-top">
                  Estimated distinct browsers
                  <Users size={16} />
                </div>
                <strong>{data.uniqueVisitors.toLocaleString()}</strong>
                <small>Hashed first-party identifiers</small>
              </div>
              <div className="metric-card">
                <div className="metric-top">
                  Reporting timezone
                  <GlobeIcon size={16} />
                </div>
                <strong className="metric-text">{data.timezone}</strong>
                <small>All report date boundaries</small>
              </div>
            </div>
            <div className="dashboard-grid">
              <section className="admin-panel chart-panel">
                <div className="panel-heading">
                  <div>
                    <Eyebrow>SELECTED PERIOD</Eyebrow>
                    <h2>Visits over time</h2>
                  </div>
                </div>
                {data.series.length ? (
                  <div className="chart-wrap">
                    <Line
                      data={{
                        labels: data.series.map((item) => item.label),
                        datasets: [
                          {
                            label: "Page views",
                            data: data.series.map((item) => item.views),
                            borderColor: "#a998ff",
                            backgroundColor: "rgba(169,152,255,.13)",
                            fill: true,
                            tension: 0.35,
                          },
                          {
                            label: "Unique browsers",
                            data: data.series.map((item) => item.visitors),
                            borderColor: "#9ae7c7",
                            backgroundColor: "rgba(154,231,199,.08)",
                            fill: true,
                            tension: 0.35,
                          },
                        ],
                      }}
                      options={chartOptions}
                    />
                  </div>
                ) : (
                  <EmptyState title="No traffic in this date range">
                    Page views are reported only after visitor tracking is
                    configured.
                  </EmptyState>
                )}
              </section>
              <section className="admin-panel page-list-panel">
                <div className="panel-heading">
                  <div>
                    <Eyebrow>BY DESTINATION</Eyebrow>
                    <h2>Most visited pages</h2>
                  </div>
                </div>
                {data.pages.length ? (
                  <div className="top-pages">
                    {data.pages.map((item, index) => (
                      <div className="top-page-row" key={item.path}>
                        <span>{String(index + 1).padStart(2, "0")}</span>
                        <strong>{item.path}</strong>
                        <b>{item.views}</b>
                        <div
                          style={{
                            width: `${Math.min(100, (item.views / Math.max(data.pages[0].views, 1)) * 100)}%`,
                          }}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState title="No page data yet">
                    Views will be ranked after real visitors arrive.
                  </EmptyState>
                )}
              </section>
            </div>
            <section className="admin-panel recent-activity">
              <div className="panel-heading">
                <div>
                  <Eyebrow>RECENT ACTIVITY</Eyebrow>
                  <h2>Recent public page views</h2>
                </div>
                <span className="privacy-pill">
                  <ShieldCheck size={14} /> Visitor hashes omitted
                </span>
              </div>
              {data.recent.length ? (
                <div className="recent-view-list">
                  {data.recent.map((visit, index) => (
                    <div key={`${visit.created_at}-${index}`}>
                      <span className="activity-route">↗</span>
                      <code>{visit.path}</code>
                      <time>
                        {new Intl.DateTimeFormat("en", {
                          timeZone: "Asia/Manila",
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(visit.created_at))}
                      </time>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState title="No recent views">
                  Public page views will appear here after the site receives
                  visitors.
                </EmptyState>
              )}
            </section>
            <div className="privacy-disclaimer">
              <ShieldCheck size={15} /> Anonymous IDs are HMAC-pseudonymized
              server-side. Raw IP addresses, fingerprints, and admin dashboard
              page views are not stored. Browser-based unique visitor figures
              are estimates only.
            </div>
          </>
        )
      )}
    </div>
  );
}
function GlobeIcon({ size = 16 }: { size?: number }) {
  return <Activity size={size} />;
}

const settingsFields: FieldDefinition[] = [
  { key: "company_name", label: "Company name", required: true },
  { key: "tagline", label: "Tagline" },
  { key: "hero_headline", label: "Home headline", kind: "textarea" },
  { key: "hero_description", label: "Home introduction", kind: "textarea" },
  { key: "logo_url", label: "Logo image URL", kind: "url" },
  { key: "company_email", label: "Company email", kind: "email" },
  { key: "facebook_url", label: "Facebook page", kind: "url" },
  { key: "phone", label: "Company phone" },
  {
    key: "social_links",
    label: "Additional social links (label | URL, one per line)",
    kind: "array",
  },
  { key: "footer_text", label: "Footer line", kind: "textarea" },
  { key: "seo_title", label: "SEO title" },
  { key: "seo_description", label: "SEO description", kind: "textarea" },
  { key: "story", label: "Company story", kind: "textarea" },
  { key: "mission", label: "Mission", kind: "textarea" },
  { key: "vision", label: "Vision", kind: "textarea" },
  { key: "values", label: "Values (one per line)", kind: "array" },
];
export function SettingsPage() {
  const { session } = useAuth();
  const { data, loading, error, refresh } = useAdminData<Row | null>(
    "/settings",
  );
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [failure, setFailure] = useState("");
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    setSaving(true);
    setFailure("");
    setNotice("");
    const form = new FormData(event.currentTarget);
    const values: Record<string, unknown> = {};
    for (const field of settingsFields) {
      const value = String(form.get(field.key) || "").trim();
      if (field.key === "social_links") {
        values[field.key] = value
          .split("\n")
          .map((line) => {
            const [label, url] = line.split("|").map((part) => part.trim());
            return label && url ? { label, url } : null;
          })
          .filter(
            (item): item is { label: string; url: string } => item !== null,
          );
      } else {
        values[field.key] =
          field.kind === "array"
            ? value
                .split("\n")
                .map((item) => item.trim())
                .filter(Boolean)
            : value;
      }
    }
    try {
      await api(
        "/settings",
        { method: "PUT", body: JSON.stringify(values) },
        session.access_token,
      );
      setNotice(
        "Website settings updated. Changes are live on the public site.",
      );
      refresh();
    } catch (reason) {
      setFailure(
        reason instanceof Error ? reason.message : "Could not save settings.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="admin-page">
      <div className="admin-page-heading">
        <div>
          <Eyebrow>MAKE IT YOURS</Eyebrow>
          <h1>
            Website settings<span className="heading-period">.</span>
          </h1>
          <p>
            Your name, voice, social links, and SEO details power the public
            site.
          </p>
        </div>
      </div>
      {loading ? (
        <Loading label="Loading settings" />
      ) : error ? (
        <ErrorState message={error} retry={refresh} />
      ) : (
        <form
          className="admin-panel settings-form"
          onSubmit={(event) => void save(event)}
        >
          <div className="settings-form-intro">
            <span className="settings-icon">
              <Settings size={20} />
            </span>
            <div>
              <h2>Studio identity</h2>
              <p>Leave contact details blank to hide those links publicly.</p>
            </div>
          </div>
          <div className="settings-fields">
            {settingsFields.map((field) => (
              <EditorField key={field.key} field={field} row={data || {}} />
            ))}
          </div>
          {notice && (
            <div className="admin-notice">
              <Check size={15} />
              {notice}
            </div>
          )}
          {failure && <div className="admin-alert">{failure}</div>}
          <div className="settings-save">
            <span>All changes apply to the live public website.</span>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save settings"}
              <Check size={15} />
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

export function AccountPage() {
  const { session, updatePassword, resetPassword } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function update(event: FormEvent) {
    event.preventDefault();
    setNotice("");
    setError("");
    if (
      password.length < 12 ||
      !/[a-z]/.test(password) ||
      !/[A-Z]/.test(password) ||
      !/\d/.test(password)
    ) {
      setError(
        "Use at least 12 characters with uppercase, lowercase, and a number.",
      );
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await updatePassword(password);
      setPassword("");
      setConfirm("");
      setNotice("Password updated securely.");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Could not update your password.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function sendReset() {
    if (!session?.user.email) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await resetPassword(session.user.email);
      setNotice(`Password reset instructions sent to ${session.user.email}.`);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Could not send reset email.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="admin-page">
      <div className="admin-page-heading">
        <div>
          <Eyebrow>SECURE ACCESS</Eyebrow>
          <h1>
            Account settings<span className="heading-period">.</span>
          </h1>
          <p>Your administrator account and authentication controls.</p>
        </div>
      </div>
      <div className="account-grid">
        <section className="admin-panel account-panel">
          <div className="account-large-avatar">
            {session?.user.email?.[0]?.toUpperCase() || "A"}
          </div>
          <Eyebrow>AUTHENTICATED ADMIN</Eyebrow>
          <h2>{session?.user.email}</h2>
          <p>
            This account uses the shared administrator role. All three
            provisioned administrators have equal content permissions.
          </p>
          <div className="account-status">
            <ShieldCheck size={17} /> Verified through Supabase Auth
          </div>
          <button
            className="outline-button"
            onClick={() => void sendReset()}
            disabled={busy}
          >
            <Mail size={15} /> Email me a password reset
          </button>
        </section>
        <form
          className="admin-panel account-panel password-panel"
          onSubmit={(event) => void update(event)}
        >
          <Eyebrow>CHANGE PASSWORD</Eyebrow>
          <h2>Keep your account secure.</h2>
          <p>Use 12+ characters and include mixed case and a number.</p>
          <label className="form-field">
            <span>New password</span>
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={12}
              required
            />
          </label>
          <label className="form-field">
            <span>Confirm new password</span>
            <input
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              minLength={12}
              required
            />
          </label>
          {notice && <p className="form-success">{notice}</p>}
          {error && <p className="form-error">{error}</p>}
          <Button type="submit" disabled={busy}>
            {busy ? "Updating…" : "Update password"}
          </Button>
        </form>
      </div>
    </div>
  );
}
