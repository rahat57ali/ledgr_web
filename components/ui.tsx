"use client";

import React from "react";
import { cn } from "@/lib/utils";

export function PageTitle({
  title,
  subtitle,
  eyebrow = "Ledgr",
  action,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="font-inter text-xs font-bold uppercase tracking-[0.28em] text-[var(--text-muted)]">{eyebrow}</p>
        <h1 className="font-outfit text-3xl font-extrabold text-[var(--text-primary)]">{title}</h1>
        {subtitle ? <p className="font-inter mt-1 text-sm font-medium text-[var(--text-secondary)]">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(function Card(
  {
    className,
    children,
    ...props
  },
  ref,
) {
  return (
    <div
      ref={ref}
      {...props}
      className={cn(
        "rounded-[28px] border bg-[var(--card-bg)] p-5 shadow-[var(--shadow)] transition-colors",
        className,
      )}
    >
      {children}
    </div>
  );
});

export function Pill({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-[var(--border-soft)] bg-[color:rgba(255,255,255,0.04)] px-3 py-1 font-inter text-xs font-bold uppercase tracking-[0.2em]",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "h-12 w-full rounded-2xl border bg-[var(--surface-bg)] px-4 font-inter text-sm font-medium text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus-visible:border-[var(--accent)]",
        className,
      )}
    />
  );
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "min-h-28 w-full rounded-2xl border bg-[var(--surface-bg)] px-4 py-3 font-inter text-sm font-medium text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus-visible:border-[var(--accent)]",
        className,
      )}
    />
  );
}

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "h-12 w-full rounded-2xl border bg-[var(--surface-bg)] px-4 font-inter text-sm font-medium text-[var(--text-primary)] focus-visible:border-[var(--accent)]",
        className,
      )}
    >
      {children}
    </select>
  );
}

export function Button({
  className,
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex h-12 items-center justify-center rounded-2xl px-5 font-outfit text-sm font-extrabold transition focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--page-bg)] disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-[var(--text-primary)] text-[var(--page-bg)]",
        variant === "secondary" && "border bg-[var(--surface-bg)] text-[var(--text-primary)]",
        variant === "ghost" && "text-[var(--text-primary)]",
        variant === "danger" && "bg-[var(--danger)] text-white",
        className,
      )}
    />
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <Card className="flex min-h-60 items-center justify-center text-center">
      <div className="max-w-sm">
        <h3 className="font-outfit text-xl font-extrabold text-[var(--text-primary)]">{title}</h3>
        <p className="font-inter mt-2 text-sm font-medium leading-6 text-[var(--text-secondary)]">{description}</p>
        {action ? <div className="mt-5">{action}</div> : null}
      </div>
    </Card>
  );
}
