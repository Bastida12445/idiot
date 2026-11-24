import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useParams,
} from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Check,
  Github,
  Globe2,
  Mail,
  Menu,
  Phone,
  X,
} from "lucide-react";
import { api, apiResult } from "../lib/api";
import { supabaseReady } from "../lib/supabase";
import type {
  Project,
  Service,
  TeamMember,
  Testimonial,
  WebsiteSettings,
} from "../types";
import {
  Button,
  EmptyState,
  ErrorState,
  Eyebrow,
  Loading,
  SectionTitle,
} from "../components/UI";

const defaultSettings: WebsiteSettings = {
  company_name: "The 3 idiots",
  tagline: "A small studio for ambitious digital ideas.",
  hero_headline: "Three minds. One vision. Limitless digital possibilities.",
  hero_description:
    "We transform ambitious ideas into thoughtful digital experiences through technology, creativity, and a little bit of obsession.",
  footer_text: "Independent minds. Shared ambition. Thoughtful work.",
};

function useRemote<T>(path: string, initial: T) {
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let active = true;
    if (!supabaseReady) {
      setLoading(false);
      setError(
        "Supabase is not configured. Copy .env.example to .env and add the project URL and publishable key.",
      );
      return () => {
        active = false;
      };
    }
    setLoading(true);
    setError("");
    void api<T>(path)
      .then((value) => {
        if (active) setData(value);
      })
      .catch((reason: unknown) => {
        if (active)
          setError(
            reason instanceof Error
              ? reason.message
              : "Could not load content.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [path, version]);
  return {
    data,
    loading,
    error,
    retry: () => setVersion((value) => value + 1),
  };
}

export function PublicLayout() {
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [settings, setSettings] = useState<WebsiteSettings>(defaultSettings);
  const [configError, setConfigError] = useState(false);
  useEffect(() => {
    let active = true;
    if (!supabaseReady) {
      setConfigError(true);
      return () => {
        active = false;
      };
    }
    void api<WebsiteSettings | null>("/settings")
      .then((value) => {
        if (active && value) setSettings({ ...defaultSettings, ...value });
      })
      .catch(() => {
        if (active) setConfigError(true);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [pathname]);
  useEffect(() => {
    document.title =
      settings.seo_title ||
      `${settings.company_name || "The 3 idiots"} — Digital work, thoughtfully made`;
    const meta = document.querySelector('meta[name="description"]');
    if (meta && settings.seo_description)
      meta.setAttribute("content", settings.seo_description);
  }, [settings]);
  const nav = [
    ["About", "/about"],
    ["Services", "/services"],
    ["Work", "/work"],
    ["Team", "/team"],
    ["Contact", "/contact"],
  ];
  return (
    <div className="site-shell">
      <header className="site-header">
        <Link to="/" className="brand" aria-label="Home">
          {settings.logo_url ? (
            <img src={settings.logo_url} alt="" />
          ) : (
            <span className="brand-symbol" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
          )}
          <span>{settings.company_name}</span>
        </Link>
        <nav
          className={`main-nav ${menuOpen ? "nav-open" : ""}`}
          aria-label="Main navigation"
        >
          {nav.map(([label, path]) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="header-actions">
          <Link className="nav-cta" to="/contact">
            Let’s talk <ArrowUpRight size={15} />
          </Link>
          <button
            className="menu-toggle"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
          >
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </header>
      {configError && (
        <div className="config-banner">
          Live studio content is unavailable. Configure Supabase and start the
          API to connect this site.
        </div>
      )}
      <main>
        <Outlet context={{ settings, updateSettings: setSettings }} />
      </main>
      <footer className="site-footer">
        <div className="footer-main">
          <div>
            <Link to="/" className="brand">
              <span className="brand-symbol" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <span>{settings.company_name}</span>
            </Link>
            <p>{settings.footer_text}</p>
          </div>
          <div className="footer-links">
            <span className="eyebrow">Explore</span>
            <Link to="/work">Selected work</Link>
            <Link to="/team">The team</Link>
            <Link to="/contact">Start a conversation</Link>
            <Link to="/login">The 3 idiots</Link>
          </div>
          <div className="footer-links">
            <span className="eyebrow">Connect</span>
            {settings.company_email && (
              <a href={`mailto:${settings.company_email}`}>
                {settings.company_email}
              </a>
            )}
            {settings.facebook_url && (
              <a href={settings.facebook_url} target="_blank" rel="noreferrer">
                Facebook <ArrowUpRight size={13} />
              </a>
            )}
            {settings.phone && (
              <a href={`tel:${settings.phone}`}>{settings.phone}</a>
            )}
            {settings.social_links?.map((link) => (
              <a
                key={`${link.label}-${link.url}`}
                href={link.url}
                target="_blank"
                rel="noreferrer"
              >
                {link.label} <ArrowUpRight size={13} />
              </a>
            ))}
          </div>
        </div>
        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} {settings.company_name}. Built with
            care.
          </span>
          <span>
            Independent by design <span className="mint-dot">●</span>
          </span>
        </div>
      </footer>
    </div>
  );
}

export function HomePage() {
  const { data: settingsData } = useRemote<WebsiteSettings | null>(
    "/settings",
    null,
  );
  const settings = { ...defaultSettings, ...(settingsData || {}) };
  const {
    data: services,
    loading: servicesLoading,
    error: serviceError,
  } = useRemote<Service[]>("/services", []);
  const {
    data: projects,
    loading: projectsLoading,
    error: projectError,
  } = useRemote<Project[]>("/projects?limit=6", []);
  const {
    data: members,
    loading: membersLoading,
    error: memberError,
  } = useRemote<TeamMember[]>("/team", []);
  const {
    data: testimonials,
    loading: testimonialsLoading,
    error: testimonialError,
  } = useRemote<Testimonial[]>("/testimonials", []);
  const location = useLocation();
  useEffect(() => {
    const heading = document.querySelector(".hero-title");
    if (
      !heading ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    import("gsap").then(({ gsap }) =>
      gsap.fromTo(
        heading,
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 1, ease: "power3.out" },
      ),
    );
  }, [location.pathname]);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let active = true;
    let revert: (() => void) | undefined;
    void Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(
      ([{ gsap }, { ScrollTrigger }]) => {
        if (!active) return;
        gsap.registerPlugin(ScrollTrigger);
        const context = gsap.context(() => {
          gsap.utils
            .toArray<HTMLElement>(".section-title, .intro-copy, .about-copy")
            .forEach((element) => {
              gsap.fromTo(
                element,
                { y: 18, opacity: 0 },
                {
                  y: 0,
                  opacity: 1,
                  duration: 0.65,
                  ease: "power2.out",
                  scrollTrigger: {
                    trigger: element,
                    start: "top 88%",
                    once: true,
                  },
                },
              );
            });
        });
        revert = () => context.revert();
      },
    );
    return () => {
      active = false;
      revert?.();
    };
  }, [services.length, projects.length, members.length]);
  return (
    <div>
      <section className="hero-section">
        <div className="hero-galaxy" aria-hidden="true" />
        <div className="hero-orb hero-orb-one" />
        <div className="hero-orb hero-orb-two" />
        <div className="hero-content">
          <Eyebrow>
            <span className="live-dot" /> INDEPENDENT DIGITAL STUDIO
          </Eyebrow>
          <h1 className="hero-title">
            {settings.hero_headline || defaultSettings.hero_headline}
          </h1>
          <p className="hero-copy">
            {settings.hero_description || defaultSettings.hero_description}
          </p>
          <div className="hero-buttons">
            <Link className="button button-primary" to="/work">
              Explore our work <ArrowRight size={17} />
            </Link>
            <Link className="button button-quiet" to="/team">
              Meet the team <ArrowDownRight size={16} />
            </Link>
          </div>
          <div className="hero-note">
            <span className="hero-note-line" /> WE DESIGN, BUILD & SHIP DIGITAL
            PRODUCTS
          </div>
        </div>
        <div className="hero-index">
          <span>01 — 03</span>
          <span>SCROLL TO EXPLORE ↓</span>
        </div>
      </section>
      <section className="section home-intro">
        <div className="intro-label">
          <Eyebrow>SMALL BY CHOICE</Eyebrow>
          <span className="section-index">01 / 04</span>
        </div>
        <div className="intro-copy">
          <h2>
            Good work happens when <em>different minds</em> build together.
          </h2>
          <p>
            We bring design thinking, engineering craft, and a healthy curiosity
            to every challenge. Fewer handoffs. More ownership. Better outcomes.
          </p>
          <Link className="arrow-link" to="/about">
            Get to know us <ArrowRight size={15} />
          </Link>
        </div>
      </section>
      <section className="section section-border">
        <SectionTitle
          label="WHAT WE DO"
          title="From first sketch to final pixel."
          copy="A focused set of capabilities to help turn a promising idea into a product people love to use."
          action={
            <Link className="arrow-link" to="/services">
              All services <ArrowRight size={15} />
            </Link>
          }
        />
        {servicesLoading ? (
          <Loading label="Loading services" />
        ) : serviceError ? (
          <ErrorState message={serviceError} />
        ) : services.length ? (
          <div className="service-grid">
            {services.slice(0, 4).map((service, i) => (
              <motion.article
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="service-card"
                key={service.id}
              >
                <span className="card-number">0{i + 1}</span>
                <div className="service-icon">
                  {service.icon === "code"
                    ? "{ }"
                    : service.icon === "layout"
                      ? "▤"
                      : "✳"}
                </div>
                <h3>{service.title}</h3>
                <p>{service.description}</p>
                <span className="service-category">{service.category}</span>
              </motion.article>
            ))}
          </div>
        ) : (
          <EmptyState title="Our services are taking shape">
            The team will publish its capabilities here soon.
          </EmptyState>
        )}
      </section>
      <section className="section section-dark">
        <SectionTitle
          label="SELECTED WORK"
          title="Thoughtfully made. Purposefully useful."
          copy="A growing collection of digital work from our studio."
          action={
            <Link className="arrow-link" to="/work">
              Explore all work <ArrowRight size={15} />
            </Link>
          }
        />
        {projectsLoading ? (
          <Loading label="Loading projects" />
        ) : projectError ? (
          <ErrorState message={projectError} />
        ) : projects.length ? (
          <div className="project-grid">
            {[...projects]
              .sort((a, b) => Number(b.featured) - Number(a.featured))
              .slice(0, 4)
              .map((project, i) => (
                <ProjectCard key={project.id} project={project} index={i} />
              ))}
          </div>
        ) : (
          <EmptyState title="No projects published yet">
            New work will appear here as it is shared.
          </EmptyState>
        )}
      </section>
      <section className="section section-border">
        <SectionTitle
          label="THE PEOPLE"
          title="Three perspectives. One tight-knit team."
          copy="A small, hands-on team invested in making the details matter."
          action={
            <Link className="arrow-link" to="/team">
              Meet everyone <ArrowRight size={15} />
            </Link>
          }
        />
        {membersLoading ? (
          <Loading label="Loading team" />
        ) : memberError ? (
          <ErrorState message={memberError} />
        ) : members.length ? (
          <div className="team-grid">
            {members.slice(0, 3).map((person) => (
              <TeamCard key={person.id} person={person} />
            ))}
          </div>
        ) : (
          <EmptyState title="A team profile is on the way">
            Our people will introduce themselves here soon.
          </EmptyState>
        )}
      </section>
      <section className="section testimonial-band">
        <div>
          <Eyebrow>GOOD WORDS, REAL PEOPLE</Eyebrow>
          <h2>
            What it’s like
            <br />
            to work together.
          </h2>
          <Link to="/testimonials" className="arrow-link">
            Read all testimonials <ArrowRight size={15} />
          </Link>
        </div>
        <div className="testimonial-preview">
          {testimonialsLoading ? (
            <Loading label="Loading testimonials" />
          ) : testimonialError ? (
            <ErrorState message={testimonialError} />
          ) : testimonials.length ? (
            <TestimonialCard testimonial={testimonials[0]} />
          ) : (
            <div className="quote-empty">
              “The best partnerships start with a conversation.”
              <span>We look forward to earning our first review.</span>
            </div>
          )}
        </div>
      </section>
      <ContactCta settings={settings} />
    </div>
  );
}

function ProjectCard({
  project,
  index = 0,
}: {
  project: Project;
  index?: number;
}) {
  return (
    <motion.article
      className={`project-card project-card-${index % 2}`}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.45, delay: (index % 2) * 0.08 }}
    >
      <Link to={`/work/${project.slug}`} className="project-image">
        {project.cover_image ? (
          <img src={project.cover_image} alt={project.title} loading="lazy" />
        ) : (
          <div className="image-placeholder">
            <span>{project.category}</span>
            <i>✳</i>
          </div>
        )}
        <span className="project-arrow">
          <ArrowUpRight size={19} />
        </span>
      </Link>
      <div className="project-meta">
        <span>{project.category}</span>
        {project.completed_at && (
          <span>{new Date(project.completed_at).getFullYear()}</span>
        )}
      </div>
      <Link className="project-name" to={`/work/${project.slug}`}>
        {project.title}
      </Link>
      <p>{project.short_description}</p>
    </motion.article>
  );
}
function TeamCard({ person }: { person: TeamMember }) {
  return (
    <Link to={`/team/${person.slug}`} className="team-card">
      {person.photo_url ? (
        <img src={person.photo_url} alt={person.full_name} loading="lazy" />
      ) : (
        <div className="team-photo-placeholder">
          <span>
            {person.full_name
              .split(" ")
              .map((part) => part[0])
              .slice(0, 2)
              .join("")}
          </span>
        </div>
      )}
      <div>
        <h3>
          {person.full_name}
          <ArrowUpRight size={15} />
        </h3>
        <p>{person.title}</p>
      </div>
      <div className="skill-list">
        {person.skills?.slice(0, 3).map((skill) => (
          <span key={skill}>{skill}</span>
        ))}
      </div>
    </Link>
  );
}
function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <article className="testimonial-card">
      <div className="stars">
        {"★".repeat(testimonial.rating)}
        <span>{"★".repeat(5 - testimonial.rating)}</span>
      </div>
      <blockquote>“{testimonial.message}”</blockquote>
      <div className="testimonial-author">
        {testimonial.photo_url ? (
          <img src={testimonial.photo_url} alt="" />
        ) : (
          <span className="avatar-initial">{testimonial.client_name[0]}</span>
        )}
        <div>
          <strong>{testimonial.client_name}</strong>
          <small>Client</small>
        </div>
      </div>
    </article>
  );
}
function ContactCta({ settings }: { settings: WebsiteSettings }) {
  return (
    <section className="contact-cta">
      <div>
        <Eyebrow>HAVE SOMETHING IN MIND?</Eyebrow>
        <h2>
          Let’s make it
          <br />
          <em>matter.</em>
        </h2>
      </div>
      <div className="cta-right">
        <p>
          Tell us what you’re imagining. We’ll bring curious minds and honest
          advice to the conversation.
        </p>
        <Link to="/contact" className="button button-light">
          Start a conversation <ArrowUpRight size={16} />
        </Link>
        {settings.company_email && (
          <a className="cta-email" href={`mailto:${settings.company_email}`}>
            {settings.company_email}
          </a>
        )}
      </div>
    </section>
  );
}

function PageIntro({
  label,
  title,
  text,
}: {
  label: string;
  title: string;
  text: string;
}) {
  return (
    <section className="page-intro">
      <Eyebrow>{label}</Eyebrow>
      <h1>{title}</h1>
      <p>{text}</p>
    </section>
  );
}
function DataState<T>({
  loading,
  error,
  data,
  emptyTitle,
  children,
}: {
  loading: boolean;
  error: string;
  data: T[];
  emptyTitle: string;
  children: (data: T[]) => ReactNode;
}) {
  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} />;
  if (!data.length)
    return (
      <EmptyState title={emptyTitle}>
        There is no published content to show yet.
      </EmptyState>
    );
  return <>{children(data)}</>;
}

export function AboutPage() {
  const { data: settings } = useRemote<WebsiteSettings | null>(
    "/settings",
    null,
  );
  const { data: team, loading, error } = useRemote<TeamMember[]>("/team", []);
  const values = settings?.values || [];
  return (
    <>
      <PageIntro
        label="A LITTLE ABOUT US"
        title="Built on good questions, better collaboration."
        text={
          settings?.tagline ||
          "We are a close-knit team making useful digital experiences with care, clarity, and a genuine love for the craft."
        }
      />
      <section className="section about-story">
        <div className="about-aside">
          <Eyebrow>OUR STORY</Eyebrow>
          <span>EST. TO MAKE IT BETTER</span>
        </div>
        <div className="about-copy">
          <h2>
            {settings?.story ||
              "We believe the best digital work comes from teams that care deeply about the problem, not just the pixels. We are a small independent studio by choice: curious, collaborative, and close to the work."}
          </h2>
          <p>
            We bring product thinking, design craft, and engineering together
            from day one. The result is a thoughtful process, clearer decisions,
            and digital products made to last.
          </p>
        </div>
      </section>
      <section className="section about-pillars">
        <div className="pillar">
          <Eyebrow>01 / MISSION</Eyebrow>
          <h3>Why we show up.</h3>
          <p>
            {settings?.mission ||
              "Make thoughtful digital products that solve real problems and leave people better off."}
          </p>
        </div>
        <div className="pillar">
          <Eyebrow>02 / VISION</Eyebrow>
          <h3>Where we’re headed.</h3>
          <p>
            {settings?.vision ||
              "A more human digital world, shaped by creative collaboration and technology used with purpose."}
          </p>
        </div>
        <div className="pillar">
          <Eyebrow>03 / VALUES</Eyebrow>
          <h3>How we work.</h3>
          <div className="value-list">
            {values.length
              ? values.map((value) => (
                  <span key={value}>
                    <Check size={14} />
                    {value}
                  </span>
                ))
              : [
                  "Thoughtful craft",
                  "Open collaboration",
                  "Honest communication",
                ].map((value) => (
                  <span key={value}>
                    <Check size={14} />
                    {value}
                  </span>
                ))}
          </div>
        </div>
      </section>
      <section className="section">
        <SectionTitle
          label="THE STUDIO"
          title="Three points of view, in one room."
        />
        <DataState
          loading={loading}
          error={error}
          data={team}
          emptyTitle="Meet the team"
        >
          {(people) => (
            <div className="team-grid">
              {people.map((person) => (
                <TeamCard key={person.id} person={person} />
              ))}
            </div>
          )}
        </DataState>
      </section>
      <section className="section tech-strip">
        <Eyebrow>OUR APPROACH</Eyebrow>
        <div>
          Listen first <i>✳</i> Build together <i>✳</i> Sweat the details{" "}
          <i>✳</i> Keep it human
        </div>
      </section>
    </>
  );
}

export function TeamPage() {
  const { data, loading, error } = useRemote<TeamMember[]>("/team", []);
  return (
    <>
      <PageIntro
        label="THE PEOPLE"
        title="Small team. Shared ownership."
        text="Three individual perspectives, working together from first conversation to final handoff."
      />
      <section className="section">
        <DataState
          loading={loading}
          error={error}
          data={data}
          emptyTitle="Team profiles coming soon"
        >
          {(people) => (
            <div className="team-grid team-grid-large">
              {people.map((person) => (
                <TeamCard key={person.id} person={person} />
              ))}
            </div>
          )}
        </DataState>
      </section>
      <ContactCta settings={defaultSettings} />
    </>
  );
}
export function TeamDetailPage() {
  const { slug = "" } = useParams();
  const { data, loading, error } = useRemote<TeamMember[]>("/team", []);
  const person = data.find((member) => member.slug === slug);
  if (loading) return <Loading />;
  if (error) return <PageError message={error} />;
  if (!person)
    return <PageError message="That team profile could not be found." />;
  return (
    <section className="profile-detail section">
      <Link to="/team" className="back-link">
        ← Back to the team
      </Link>
      <div className="profile-layout">
        {person.photo_url ? (
          <img
            className="profile-photo"
            src={person.photo_url}
            alt={person.full_name}
          />
        ) : (
          <div className="profile-photo team-photo-placeholder">
            <span>{person.full_name[0]}</span>
          </div>
        )}
        <div>
          <Eyebrow>{person.title}</Eyebrow>
          <h1>{person.full_name}</h1>
          <p className="profile-bio">{person.bio}</p>
          <p className="specialization">{person.specialization}</p>
          <div className="skill-list skill-list-lg">
            {person.skills?.map((skill) => (
              <span key={skill}>{skill}</span>
            ))}
          </div>
          {person.education && (
            <p className="education">
              <strong>Education</strong>
              {person.education}
            </p>
          )}
          <div className="social-row">
            {person.email && (
              <a href={`mailto:${person.email}`}>
                <Mail size={17} />
                Email
              </a>
            )}
            {person.phone && (
              <a href={`tel:${person.phone}`}>
                <Phone size={17} />
                Call
              </a>
            )}
            {person.github_url && (
              <a href={person.github_url} target="_blank" rel="noreferrer">
                <Github size={17} />
                GitHub
              </a>
            )}
            {person.facebook_url && (
              <a href={person.facebook_url} target="_blank" rel="noreferrer">
                <Globe2 size={17} />
                Facebook
              </a>
            )}
            {person.linkedin_url && (
              <a href={person.linkedin_url} target="_blank" rel="noreferrer">
                LinkedIn <ArrowUpRight size={15} />
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export function ServicesPage() {
  const { data, loading, error } = useRemote<Service[]>("/services", []);
  return (
    <>
      <PageIntro
        label="WHAT WE DO"
        title="Useful ideas, made real."
        text="Our skills span the whole journey — from exploring what’s possible to building the product that makes it happen."
      />
      <section className="section">
        <DataState
          loading={loading}
          error={error}
          data={data}
          emptyTitle="Services are coming soon"
        >
          {(services) => (
            <div className="service-grid service-grid-large">
              {services.map((service, index) => (
                <article className="service-card" key={service.id}>
                  <span className="card-number">0{index + 1}</span>
                  <div className="service-icon">
                    {service.icon === "code" ? "{ }" : "✳"}
                  </div>
                  <h3>{service.title}</h3>
                  <p>{service.description}</p>
                  <span className="service-category">{service.category}</span>
                  {service.image_url && (
                    <img
                      className="service-thumb"
                      src={service.image_url}
                      alt=""
                      loading="lazy"
                    />
                  )}
                </article>
              ))}
            </div>
          )}
        </DataState>
      </section>
      <ContactCta settings={defaultSettings} />
    </>
  );
}

export function WorkPage() {
  const { data: categories } = useRemote<string[]>("/projects/categories", []);
  const [category, setCategory] = useState("All work");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [projects, setProjects] = useState<Project[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const pageSize = 9;
  const params = new URLSearchParams({
    page: String(page),
    limit: String(pageSize),
  });
  if (category !== "All work") params.set("category", category);
  if (search.trim()) params.set("q", search.trim());
  const queryPath = `/projects?${params.toString()}`;
  useEffect(() => {
    let active = true;
    if (!supabaseReady) {
      setLoading(false);
      setError(
        "Supabase is not configured. Copy .env.example to .env and add the project URL and publishable key.",
      );
      return () => {
        active = false;
      };
    }
    setLoading(true);
    setError("");
    void apiResult<Project[]>(queryPath)
      .then((response) => {
        if (active) {
          setProjects(response.data);
          setTotal(response.total ?? response.data.length);
        }
      })
      .catch((reason: unknown) => {
        if (active)
          setError(
            reason instanceof Error
              ? reason.message
              : "Could not load projects.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [queryPath]);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  function changeCategory(value: string) {
    setCategory(value);
    setPage(1);
  }
  function changeSearch(value: string) {
    setSearch(value);
    setPage(1);
  }
  return (
    <>
      <PageIntro
        label="SELECTED WORK"
        title="Ideas with a little more intention."
        text="Every project is an opportunity to make a useful thing, solve a meaningful problem, and learn something along the way."
      />
      <section className="section">
        <div className="filter-toolbar">
          <div className="filter-pills">
            {["All work", ...categories].map((item) => (
              <button
                key={item}
                className={category === item ? "filter-active" : ""}
                onClick={() => changeCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <input
            aria-label="Search projects"
            className="search-input"
            placeholder="Search projects…"
            value={search}
            onChange={(event) => changeSearch(event.target.value)}
          />
        </div>
        {loading ? (
          <Loading label="Loading projects" />
        ) : error ? (
          <ErrorState message={error} />
        ) : projects.length ? (
          <>
            <div className="project-grid">
              {projects.map((project, index) => (
                <ProjectCard key={project.id} project={project} index={index} />
              ))}
            </div>
            {pageCount > 1 && (
              <div className="project-pagination">
                <button
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  disabled={page === 1}
                >
                  ← Previous
                </button>
                <span>
                  Page {page} of {pageCount} · {total} projects
                </span>
                <button
                  onClick={() =>
                    setPage((value) => Math.min(pageCount, value + 1))
                  }
                  disabled={page === pageCount}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        ) : (
          <EmptyState
            title={total ? "No matching projects" : "Work in progress"}
          >
            There are no published projects matching those filters.
          </EmptyState>
        )}
      </section>
    </>
  );
}
export function ProjectDetailPage() {
  const { slug = "" } = useParams();
  const {
    data: project,
    loading,
    error,
  } = useRemote<Project | null>(
    `/projects/slug/${encodeURIComponent(slug)}`,
    null,
  );
  const { data: members } = useRemote<TeamMember[]>("/team", []);
  if (loading) return <Loading />;
  if (error) return <PageError message={error} />;
  if (!project) return <PageError message="That project could not be found." />;
  const owner = members.find((member) => member.id === project.owner_member_id);
  const contributors = members.filter((member) =>
    project.contributing_member_ids?.includes(member.id),
  );
  return (
    <section className="section project-detail">
      <Link to="/work" className="back-link">
        ← Back to selected work
      </Link>
      <Eyebrow>
        {project.category}{" "}
        {project.completed_at &&
          ` / ${new Date(project.completed_at).getFullYear()}`}
      </Eyebrow>
      <h1>{project.title}</h1>
      <p className="project-detail-intro">{project.short_description}</p>
      {project.cover_image && (
        <img
          className="detail-cover"
          src={project.cover_image}
          alt={project.title}
        />
      )}
      {project.gallery?.length > 0 && (
        <div className="gallery-grid">
          {project.gallery.map((image, index) => (
            <img
              src={image}
              alt={`${project.title} gallery ${index + 1}`}
              key={image}
              loading="lazy"
            />
          ))}
        </div>
      )}
      <div className="detail-body">
        <p>{project.description || project.short_description}</p>
        <div>
          <Eyebrow>BUILT WITH</Eyebrow>
          <div className="skill-list">
            {project.technologies?.map((tech) => (
              <span key={tech}>{tech}</span>
            ))}
          </div>
          {(owner || contributors.length > 0) && (
            <div className="project-team">
              <Eyebrow>PROJECT TEAM</Eyebrow>
              {owner && <span>Owner · {owner.full_name}</span>}
              {contributors.map((member) => (
                <span key={member.id}>{member.full_name}</span>
              ))}
            </div>
          )}
          <div className="social-row">
            {project.github_url && (
              <a href={project.github_url} target="_blank" rel="noreferrer">
                <Github size={17} />
                Source code
              </a>
            )}
            {project.live_url && (
              <a href={project.live_url} target="_blank" rel="noreferrer">
                <Globe2 size={17} />
                Live experience <ArrowUpRight size={13} />
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export function TestimonialsPage() {
  const { data, loading, error } = useRemote<Testimonial[]>(
    "/testimonials",
    [],
  );
  const [formState, setFormState] = useState({
    client_name: "",
    email: "",
    rating: "5",
    message: "",
  });
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [formError, setFormError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    setSending(true);
    setFormError("");
    setMessage("");
    try {
      await api("/testimonials", {
        method: "POST",
        body: JSON.stringify({
          ...formState,
          rating: Number(formState.rating),
        }),
      });
      setMessage("Thank you — your testimonial is waiting for team review.");
      setFormState({ client_name: "", email: "", rating: "5", message: "" });
    } catch (reason) {
      setFormError(
        reason instanceof Error
          ? reason.message
          : "Could not submit your testimonial.",
      );
    } finally {
      setSending(false);
    }
  }
  return (
    <>
      <PageIntro
        label="KIND WORDS"
        title="Good work is a team sport."
        text="A few words from people who trusted us with something important."
      />
      <section className="section testimonial-list-section">
        <DataState
          loading={loading}
          error={error}
          data={data}
          emptyTitle="Your words could be first"
        >
          {(items) => (
            <div className="testimonial-list">
              {items.map((item) => (
                <TestimonialCard key={item.id} testimonial={item} />
              ))}
            </div>
          )}
        </DataState>
      </section>
      <section className="section testimonial-form-section">
        <div>
          <Eyebrow>LEAVE A NOTE</Eyebrow>
          <h2>
            Worked together?
            <br />
            We’d love to hear.
          </h2>
          <p>
            Testimonials are reviewed before appearing on the site. Your email
            stays private.
          </p>
        </div>
        <form className="form-card" onSubmit={(event) => void submit(event)}>
          <Field label="Your name">
            <input
              required
              minLength={2}
              maxLength={100}
              value={formState.client_name}
              onChange={(e) =>
                setFormState({ ...formState, client_name: e.target.value })
              }
            />
          </Field>
          <Field label="Email (optional)">
            <input
              type="email"
              maxLength={254}
              value={formState.email}
              onChange={(e) =>
                setFormState({ ...formState, email: e.target.value })
              }
            />
          </Field>
          <Field label="Your rating">
            <select
              value={formState.rating}
              onChange={(e) =>
                setFormState({ ...formState, rating: e.target.value })
              }
            >
              {[5, 4, 3, 2, 1].map((rating) => (
                <option key={rating} value={rating}>
                  {rating} / 5
                </option>
              ))}
            </select>
          </Field>
          <Field label="Your experience">
            <textarea
              required
              minLength={10}
              maxLength={2000}
              rows={5}
              value={formState.message}
              onChange={(e) =>
                setFormState({ ...formState, message: e.target.value })
              }
            />
          </Field>
          {message && <p className="form-success">{message}</p>}
          {formError && <p className="form-error">{formError}</p>}
          <Button type="submit" disabled={sending}>
            {sending ? "Sending…" : "Send testimonial"} <ArrowRight size={15} />
          </Button>
        </form>
      </section>
    </>
  );
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="form-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function ContactPage() {
  const { data: settingsData } = useRemote<WebsiteSettings | null>(
    "/settings",
    null,
  );
  const settings = { ...defaultSettings, ...(settingsData || {}) };
  const {
    data: members,
    loading: membersLoading,
    error: memberError,
  } = useRemote<TeamMember[]>("/team", []);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSent(false);
    try {
      await api("/contact", { method: "POST", body: JSON.stringify(form) });
      setSent(true);
      setForm({ full_name: "", email: "", subject: "", message: "" });
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "We could not send your message.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageIntro
        label="GET IN TOUCH"
        title="Let’s start with a conversation."
        text="Tell us what you’re thinking about. There’s no pitch deck required — just the beginning of a good conversation."
      />
      <section className="section contact-layout">
        <div className="contact-details">
          <Eyebrow>DIRECT LINE</Eyebrow>
          <h2>
            Reach out
            <br />
            your way.
          </h2>
          {settings.company_email && (
            <a href={`mailto:${settings.company_email}`}>
              <Mail size={18} />
              <span>
                <small>EMAIL</small>
                {settings.company_email}
              </span>
              <ArrowUpRight size={16} />
            </a>
          )}
          {settings.phone && (
            <a href={`tel:${settings.phone}`}>
              <Phone size={18} />
              <span>
                <small>PHONE</small>
                {settings.phone}
              </span>
              <ArrowUpRight size={16} />
            </a>
          )}
          {settings.facebook_url && (
            <a href={settings.facebook_url} target="_blank" rel="noreferrer">
              <Globe2 size={18} />
              <span>
                <small>FACEBOOK</small>Say hello on Facebook
              </span>
              <ArrowUpRight size={16} />
            </a>
          )}
          <p className="privacy-note">
            We use anonymous, first-party page-view analytics to understand
            which parts of this site are useful. No fingerprints or raw IP
            addresses are stored.
          </p>
        </div>
        <form
          className="form-card contact-form"
          onSubmit={(event) => void submit(event)}
        >
          <Eyebrow>OR SEND A NOTE</Eyebrow>
          <Field label="Your name">
            <input
              required
              minLength={2}
              maxLength={100}
              autoComplete="name"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            />
          </Field>
          <Field label="Email address">
            <input
              required
              type="email"
              maxLength={254}
              autoComplete="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Field>
          <Field label="Subject">
            <input
              required
              minLength={3}
              maxLength={160}
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
            />
          </Field>
          <Field label="What’s on your mind?">
            <textarea
              required
              minLength={10}
              maxLength={5000}
              rows={6}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
            />
          </Field>
          {sent && (
            <p className="form-success">
              Your message is in. Thanks for getting in touch.
            </p>
          )}
          {error && <p className="form-error">{error}</p>}
          <Button type="submit" disabled={busy}>
            {busy ? "Sending…" : "Send message"} <ArrowRight size={15} />
          </Button>
        </form>
      </section>
      <section className="section contact-team">
        <SectionTitle
          label="MEET YOUR COLLABORATORS"
          title="Good people, easy to reach."
        />
        <DataState
          loading={membersLoading}
          error={memberError}
          data={members}
          emptyTitle="Team details are coming soon"
        >
          {(people) => (
            <div className="contact-team-grid">
              {people.map((person) => (
                <div className="contact-person" key={person.id}>
                  <strong>{person.full_name}</strong>
                  <span>{person.title}</span>
                  <div>
                    {person.email && (
                      <a href={`mailto:${person.email}`}>Email</a>
                    )}
                    {person.phone && <a href={`tel:${person.phone}`}>Call</a>}
                    {person.facebook_url && (
                      <a
                        href={person.facebook_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Facebook
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DataState>
      </section>
    </>
  );
}

function PageError({ message }: { message: string }) {
  return (
    <section className="section">
      <ErrorState message={message} />
    </section>
  );
}
