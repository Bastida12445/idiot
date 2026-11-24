import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  BrowserRouter,
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  Mail,
  Moon,
  ShieldCheck,
  Sun,
  Users,
} from "lucide-react";
import Lenis from "lenis";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { supabaseReady } from "./lib/supabase";
import { apiBaseUrl } from "./lib/api";
import { createUuid } from "./lib/uuid";
import { Button, InlineNotice, Loading } from "./components/UI";

const HomePage = lazy(() =>
  import("./pages/PublicSite").then((module) => ({ default: module.HomePage })),
);
const PublicLayout = lazy(() =>
  import("./pages/PublicSite").then((module) => ({
    default: module.PublicLayout,
  })),
);
const AboutPage = lazy(() =>
  import("./pages/PublicSite").then((module) => ({
    default: module.AboutPage,
  })),
);
const TeamPage = lazy(() =>
  import("./pages/PublicSite").then((module) => ({ default: module.TeamPage })),
);
const TeamDetailPage = lazy(() =>
  import("./pages/PublicSite").then((module) => ({
    default: module.TeamDetailPage,
  })),
);
const ServicesPage = lazy(() =>
  import("./pages/PublicSite").then((module) => ({
    default: module.ServicesPage,
  })),
);
const WorkPage = lazy(() =>
  import("./pages/PublicSite").then((module) => ({ default: module.WorkPage })),
);
const ProjectDetailPage = lazy(() =>
  import("./pages/PublicSite").then((module) => ({
    default: module.ProjectDetailPage,
  })),
);
const TestimonialsPage = lazy(() =>
  import("./pages/PublicSite").then((module) => ({
    default: module.TestimonialsPage,
  })),
);
const ContactPage = lazy(() =>
  import("./pages/PublicSite").then((module) => ({
    default: module.ContactPage,
  })),
);
const AdminLayout = lazy(() =>
  import("./pages/Admin").then((module) => ({ default: module.AdminLayout })),
);
const OverviewPage = lazy(() =>
  import("./pages/Admin").then((module) => ({ default: module.OverviewPage })),
);
const AccountPage = lazy(() =>
  import("./pages/Admin").then((module) => ({ default: module.AccountPage })),
);
const AnalyticsPage = lazy(() =>
  import("./pages/Admin").then((module) => ({ default: module.AnalyticsPage })),
);
const ContentManager = lazy(() =>
  import("./pages/Admin").then((module) => ({
    default: module.ContentManager,
  })),
);
const MessagesPage = lazy(() =>
  import("./pages/Admin").then((module) => ({ default: module.MessagesPage })),
);
const SettingsPage = lazy(() =>
  import("./pages/Admin").then((module) => ({ default: module.SettingsPage })),
);

function PageTracker() {
  const { pathname, search } = useLocation();
  const { session, isAdmin, loading } = useAuth();
  const previous = useRef("");
  useEffect(() => {
    if (
      loading ||
      !supabaseReady ||
      pathname.startsWith("/admin") ||
      pathname.startsWith("/login") ||
      pathname.startsWith("/auth/") ||
      isAdmin ||
      session
    )
      return;
    const visit = `${pathname}${search}`;
    if (previous.current === visit) return;
    previous.current = visit;
    try {
      let visitorId = localStorage.getItem("studio-visitor-id");
      if (!visitorId) {
        visitorId = createUuid();
        localStorage.setItem("studio-visitor-id", visitorId);
      }
      const eventId = createUuid();
      void fetch(`${apiBaseUrl}/api/analytics/track`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: eventId,
          visitor_id: visitorId,
          path: pathname,
        }),
        keepalive: true,
      }).catch(() => undefined);
    } catch {
      /* Analytics is optional when browser storage is unavailable. */
    }
  }, [pathname, search, session, isAdmin, loading]);
  return null;
}

function SmoothScroll() {
  const { pathname } = useLocation();
  useEffect(() => {
    if (
      pathname.startsWith("/admin") ||
      pathname.startsWith("/login") ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const lenis = new Lenis({
      duration: 1.05,
      smoothWheel: true,
      wheelMultiplier: 0.9,
    });
    let frame = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);
    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, [pathname]);
  return null;
}

function RequireAdmin() {
  const {
    loading,
    session,
    isAdmin,
    adminChecked,
    adminCheckError,
    adminCheckStatus,
    signOut,
  } = useAuth();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");
  if (loading || (session && !adminChecked))
    return <Loading label="Verifying administrator access" />;
  if (!session) return <Navigate to="/login" replace />;
  if (!isAdmin)
    return (
      <main className="auth-page auth-denied">
        <section className="auth-card auth-denied-card">
          <div className="auth-mark">
            <LockKeyhole size={21} />
          </div>
          <span className="eyebrow">ACCESS RESTRICTED</span>
          <h1>No administrator access</h1>
          <p>{adminCheckError || "Administrator access could not be verified."}</p>
          <div className="auth-denied-help">
            {adminCheckStatus === 403 ? (
              <>
                Run <code>npm run create-admin</code> in the project terminal
                and enter this same email. If prompted about an existing
                account, confirm the update. Then sign out and sign in again.
              </>
            ) : adminCheckStatus === null ? (
              "Check that the API is running, then allow the current website address in CLIENT_ORIGIN. Restart the API and Vite after changing .env."
            ) : (
              "Check the API server logs and confirm that the API and browser use the same Supabase project."
            )}
          </div>
          {signOutError && <InlineNotice tone="error">{signOutError}</InlineNotice>}
          <Button
            className="auth-submit"
            disabled={signingOut}
            onClick={() => {
              setSigningOut(true);
              setSignOutError("");
              void signOut()
                .then(() => navigate("/login", { replace: true }))
                .catch((reason: unknown) => {
                  setSignOutError(
                    reason instanceof Error ? reason.message : "Could not sign out.",
                  );
                })
                .finally(() => setSigningOut(false));
            }}
          >
            {signingOut ? "Signing out…" : "Sign out and use another account"}
          </Button>
          <Link to="/" className="auth-denied-home">
            Return to the public site
          </Link>
        </section>
      </main>
    );
  return <AdminLayout />;
}

function LoginPage() {
  const { session, signIn, resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [lightMode, setLightMode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [forgot, setForgot] = useState(false);
  if (session) return <Navigate to="/admin" replace />;
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    if (forgot) {
      if (!email.trim()) {
        setError("Enter your administrator email first.");
        setBusy(false);
        return;
      }
      try {
        await resetPassword(email.trim());
        setNotice(
          "If this email belongs to an administrator, password reset instructions have been sent.",
        );
      } catch (reason) {
        setError(
          reason instanceof Error
            ? reason.message
            : "Could not request a reset.",
        );
      } finally {
        setBusy(false);
      }
      return;
    }
    if (password.length < 8) {
      setError("Enter the password for your administrator account.");
      setBusy(false);
      return;
    }
    try {
      await signIn(email.trim(), password);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Sign in failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className={`auth-page ${lightMode ? "auth-light" : ""}`}>
      <div className="auth-galaxy" aria-hidden="true" />
      <div className="auth-aurora auth-aurora-one" />
      <div className="auth-aurora auth-aurora-two" />
      <div className="auth-grid" />

      <header className="auth-topbar">
        <Link to="/" className="auth-brand" aria-label="Go to home">
          <span className="auth-logo">
            <span />
            <span />
            <span />
          </span>
          <span className="auth-brand-name">
            STUDIO
            <small>THE DEV COLLECTIVE</small>
          </span>
        </Link>
        <div className="auth-theme-switch" aria-label="Theme preference">
          <button
            type="button"
            className={!lightMode ? "active" : ""}
            aria-label="Use dark theme"
            onClick={() => setLightMode(false)}
          >
            <Sun size={15} />
          </button>
          <button
            type="button"
            className={lightMode ? "active" : ""}
            aria-label="Use light theme"
            onClick={() => setLightMode(true)}
          >
            <Moon size={15} />
          </button>
        </div>
      </header>

      <section className="auth-layout">
        <div className="auth-story">
          <div className="auth-story-copy">
            <h1>
              Welcome <span>Back.</span>
            </h1>
            <p>Sign in to manage your projects,<br />team, and explore what’s next.</p>
            <div className="auth-feature-row" aria-label="Dashboard capabilities">
              <div className="auth-feature">
                <span><BriefcaseBusiness size={16} /></span>
                <p>Manage<br /><strong>Projects</strong></p>
              </div>
              <div className="auth-feature">
                <span><Users size={17} /></span>
                <p>Team<br /><strong>Collaboration</strong></p>
              </div>
              <div className="auth-feature">
                <span><BarChart3 size={17} /></span>
                <p>View<br /><strong>Analytics</strong></p>
              </div>
            </div>
          </div>

          <div className="auth-visual" aria-hidden="true">
            <div className="auth-orbit auth-orbit-one" />
            <div className="auth-orbit auth-orbit-two" />
            <div className="auth-building">
              <div className="building-top" />
              <div className="building-face building-left">
                {Array.from({ length: 12 }).map((_, index) => <i key={`l${index}`} />)}
              </div>
              <div className="building-face building-right">
                {Array.from({ length: 12 }).map((_, index) => <i key={`r${index}`} />)}
              </div>
            </div>
            <div className="auth-visual-glow" />
          </div>

          <div className="auth-secure">
            <ShieldCheck size={15} /> Secure &amp; Encrypted Access
          </div>
        </div>

        <section className="auth-card" aria-label="Administrator sign in">
          <div className="auth-mark" aria-hidden="true">
            <span className="auth-mark-logo">
              <span />
              <span />
              <span />
            </span>
          </div>
          <h2>{forgot ? "Account recovery" : "Administrator Access"}</h2>
          <p className="auth-card-copy">
            {forgot
              ? "A recovery email requires an inbox you can access. For test addresses, rerun npm run create-admin to set a new password."
              : "Use your admin login email and website password. The email does not need to be a real inbox."}
          </p>

          {!supabaseReady && (
            <InlineNotice tone="error">
              Supabase is not configured. Add the public project URL and
              publishable key to your environment before signing in.
            </InlineNotice>
          )}

          <form onSubmit={(event) => void submit(event)}>
            <label className="auth-field">
              <Mail size={18} />
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@studio.test"
                aria-label="Administrator email"
              />
            </label>
            {!forgot && (
              <label className="auth-field">
                <LockKeyhole size={18} />
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Password"
                  aria-label="Password"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((value) => !value)}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </label>
            )}

            {notice && <InlineNotice tone="success">{notice}</InlineNotice>}
            {error && <InlineNotice tone="error">{error}</InlineNotice>}

            {!forgot && (
              <div className="auth-options">
                <label className="auth-check">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(event) => setRemember(event.target.checked)}
                  />
                  <span><i /></span>
                  Remember me
                </label>
                <button
                  type="button"
                  className="auth-forgot"
                  onClick={() => {
                    setForgot(true);
                    setError("");
                    setNotice("");
                  }}
                >
                  Forgot password?
                </button>
              </div>
            )}

            <Button
              type="submit"
              className="auth-submit"
              disabled={busy || !supabaseReady}
            >
              {busy
                ? "Please wait…"
                : forgot
                  ? "Send recovery link"
                  : "Sign in securely"}
              {forgot ? <ArrowRight size={17} /> : <ArrowRight size={17} />}
            </Button>
          </form>

          {forgot && (
            <button
              type="button"
              className="auth-back"
              onClick={() => {
                setForgot(false);
                setError("");
                setNotice("");
              }}
            >
              <ArrowLeft size={14} /> Back to sign in
            </button>
          )}

          <p className="auth-footnote">
            <ShieldCheck size={14} />
            Authorized personnel only
          </p>
        </section>
      </section>
    </main>
  );
}

function ResetPasswordPage() {
  const { updatePassword } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
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
      setDone(true);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "The recovery link is invalid or expired.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-page auth-reset">
      <section className="auth-card">
        <Link to="/" className="auth-brand">
          <span className="brand-symbol">S.</span>
          <span>
            STUDIO <small>CONTROL ROOM</small>
          </span>
        </Link>
        <div className="auth-mark">
          <KeyRound size={20} />
        </div>
        <span className="eyebrow">ACCOUNT RECOVERY</span>
        <h1>{done ? "Password updated." : "Choose a new password."}</h1>
        {done ? (
          <>
            <p>
              Your password was changed. You can now sign in with your new
              credentials.
            </p>
            <Link className="button button-primary auth-submit" to="/login">
              Go to sign in <ArrowRight size={15} />
            </Link>
          </>
        ) : (
          <form onSubmit={(event) => void submit(event)}>
            <p>
              Use at least 12 characters with uppercase, lowercase, and a
              number.
            </p>
            <label className="form-field">
              <span>New password</span>
              <input
                type="password"
                autoComplete="new-password"
                minLength={12}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <label className="form-field">
              <span>Confirm new password</span>
              <input
                type="password"
                autoComplete="new-password"
                minLength={12}
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </label>
            {error && <InlineNotice tone="error">{error}</InlineNotice>}
            <Button className="auth-submit" type="submit" disabled={busy}>
              {busy ? "Updating…" : "Update password"} <ArrowRight size={15} />
            </Button>
          </form>
        )}
      </section>
    </main>
  );
}

function AppRoutes() {
  return (
    <>
      <PageTracker />
      <SmoothScroll />
      <Suspense
        fallback={
          <div className="route-loading">
            <Loading label="Preparing the studio" />
          </div>
        }
      >
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
          <Route path="/admin" element={<RequireAdmin />}>
            <Route index element={<OverviewPage />} />
            <Route
              path="projects"
              element={<ContentManager type="projects" />}
            />
            <Route
              path="services"
              element={<ContentManager type="services" />}
            />
            <Route path="team" element={<ContentManager type="team" />} />
            <Route
              path="testimonials"
              element={<ContentManager type="testimonials" />}
            />
            <Route path="messages" element={<MessagesPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="account" element={<AccountPage />} />
          </Route>
          <Route path="/" element={<PublicLayout />}>
            <Route index element={<HomePage />} />
            <Route path="about" element={<AboutPage />} />
            <Route path="team" element={<TeamPage />} />
            <Route path="team/:slug" element={<TeamDetailPage />} />
            <Route path="services" element={<ServicesPage />} />
            <Route path="work" element={<WorkPage />} />
            <Route path="work/:slug" element={<ProjectDetailPage />} />
            <Route path="testimonials" element={<TestimonialsPage />} />
            <Route path="contact" element={<ContactPage />} />
          </Route>
          <Route
            path="*"
            element={
              <main className="auth-page">
                <section className="auth-card">
                  <span className="eyebrow">404 / PAGE NOT FOUND</span>
                  <h1>That page isn’t here.</h1>
                  <Link to="/" className="arrow-link">
                    Back to home <ArrowRight size={15} />
                  </Link>
                </section>
              </main>
            }
          />
        </Routes>
      </Suspense>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
