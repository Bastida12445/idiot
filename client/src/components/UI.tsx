import { AlertCircle, ArrowRight, LoaderCircle, RefreshCw } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export function Button({
  children,
  className = "",
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "quiet" | "danger";
}) {
  return (
    <button className={`button button-${variant} ${className}`} {...props}>
      {children}
    </button>
  );
}
export function Loading({ label = "Loading" }: { label?: string }) {
  return (
    <div className="state-box" role="status">
      <LoaderCircle className="spin" size={19} />
      <span>{label}…</span>
    </div>
  );
}
export function ErrorState({
  message,
  retry,
}: {
  message: string;
  retry?: () => void;
}) {
  return (
    <div className="state-box error-state">
      <AlertCircle size={19} />
      <span>{message}</span>
      {retry && (
        <button className="text-button" onClick={retry}>
          <RefreshCw size={14} /> Retry
        </button>
      )}
    </div>
  );
}
export function EmptyState({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-mark">✳</span>
      <h3>{title}</h3>
      {children && <p>{children}</p>}
    </div>
  );
}
export function Eyebrow({ children }: { children: ReactNode }) {
  return <span className="eyebrow">{children}</span>;
}
export function SectionTitle({
  label,
  title,
  copy,
  action,
}: {
  label: string;
  title: string;
  copy?: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-title">
      <div>
        <Eyebrow>{label}</Eyebrow>
        <h2>{title}</h2>
        {copy && <p>{copy}</p>}
      </div>
      {action}
    </div>
  );
}
export function ArrowLink({
  to,
  children,
}: {
  to: string;
  children: ReactNode;
}) {
  return (
    <a className="arrow-link" href={to}>
      {children}
      <ArrowRight size={16} />
    </a>
  );
}
export function InlineNotice({
  children,
  tone = "info",
}: {
  children: ReactNode;
  tone?: "info" | "success" | "error";
}) {
  return (
    <div className={`notice notice-${tone}`} role="status">
      {children}
    </div>
  );
}
