// src/components/ui/index.tsx
//
// The shared vocabulary the screens are built from.
//
// These exist so that a card on Learn, a card on Challenge and a card in the
// Mentor Hub are literally the same component rather than three hand-rolled
// stacks of Tailwind that drift apart. Every colour choice here comes from the
// tokens in tailwind.config.ts — nothing in this file invents a shade.
"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Loader2 } from "lucide-react";

/* ------------------------------------------------------------------ tone --- */

/** The six meanings colour is allowed to carry in this app. */
export type Tone = "brand" | "mentor" | "spark" | "success" | "danger" | "info";

const TONE_SOLID: Record<Tone, string> = {
  brand: "bg-brand-600 text-white",
  mentor: "bg-mentor-600 text-white",
  spark: "bg-spark-700 text-white",
  success: "bg-success-600 text-white",
  danger: "bg-danger-600 text-white",
  info: "bg-info-600 text-white",
};

const TONE_SOFT: Record<Tone, string> = {
  brand: "bg-brand-50 text-brand-800 border-brand-100",
  mentor: "bg-mentor-50 text-mentor-800 border-mentor-100",
  spark: "bg-spark-50 text-spark-700 border-spark-100",
  success: "bg-success-50 text-success-800 border-success-100",
  danger: "bg-danger-50 text-danger-700 border-danger-100",
  info: "bg-info-50 text-info-700 border-info-100",
};

const TONE_ICON: Record<Tone, string> = {
  brand: "text-brand-600",
  mentor: "text-mentor-600",
  spark: "text-spark-600",
  success: "text-success-600",
  danger: "text-danger-600",
  info: "text-info-600",
};

const TONE_ACCENT_BAR: Record<Tone, string> = {
  brand: "bg-brand-600",
  mentor: "bg-mentor-600",
  spark: "bg-spark-600",
  success: "bg-success-600",
  danger: "bg-danger-600",
  info: "bg-info-600",
};

export const toneIcon = (t: Tone) => TONE_ICON[t];
export const toneSoft = (t: Tone) => TONE_SOFT[t];

/* ------------------------------------------------------------------ card --- */

export function Card({
  children,
  className = "",
  padded = true,
  accent,
  as: Tag = "div",
  "data-tour": dataTour,
}: {
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
  /** Draws a 3px rule along the top edge. Use it to say what a card is for. */
  accent?: Tone;
  as?: React.ElementType;
  /** Anchor name for the guided tour. Read by src/components/tour; it has no
   *  effect on the card itself and nothing else should key off it. */
  "data-tour"?: string;
}) {
  return (
    <Tag
      data-tour={dataTour}
      className={`bg-surface border border-line rounded-2xl shadow-card overflow-hidden ${className}`}
    >
      {accent && <div className={`h-[3px] w-full ${TONE_ACCENT_BAR[accent]}`} />}
      <div className={padded ? "p-5 sm:p-6" : ""}>{children}</div>
    </Tag>
  );
}

/** Card title + optional supporting line + optional right-hand control. */
export function SectionHeader({
  title,
  subtitle,
  icon: Icon,
  tone = "brand",
  right,
  className = "",
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ElementType;
  tone?: Tone;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-start justify-between gap-3 ${className}`}>
      <div className="flex items-start gap-2.5 min-w-0">
        {Icon && (
          <span
            className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${TONE_SOFT[tone]}`}
          >
            <Icon className={`w-4 h-4 ${TONE_ICON[tone]}`} />
          </span>
        )}
        <div className="min-w-0">
          <h2 className="text-base font-extrabold text-ink leading-tight">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs text-ink-muted mt-1 leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}

/* ---------------------------------------------------------------- button --- */

type ButtonProps = {
  children: React.ReactNode;
  tone?: Tone;
  variant?: "solid" | "soft" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: React.ElementType;
  iconRight?: React.ElementType;
  className?: string;
  full?: boolean;
};

const SIZE: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "px-3 py-1.5 text-xs gap-1.5 rounded-lg",
  md: "px-4 py-2.5 text-sm gap-2 rounded-xl",
  lg: "px-6 py-3.5 text-sm gap-2 rounded-xl",
};

function buttonClass({
  tone = "brand",
  variant = "solid",
  size = "md",
  full,
  className = "",
}: ButtonProps) {
  const outline: Record<Tone, string> = {
    brand: "border-brand-600 text-brand-700 hover:bg-brand-50",
    mentor: "border-mentor-600 text-mentor-700 hover:bg-mentor-50",
    spark: "border-spark-600 text-spark-700 hover:bg-spark-50",
    success: "border-success-600 text-success-700 hover:bg-success-50",
    danger: "border-danger-600 text-danger-700 hover:bg-danger-50",
    info: "border-info-600 text-info-700 hover:bg-info-50",
  };
  const solidHover: Record<Tone, string> = {
    brand: "hover:bg-brand-700",
    mentor: "hover:bg-mentor-700",
    spark: "hover:bg-spark-600",
    success: "hover:bg-success-700",
    danger: "hover:bg-danger-700",
    info: "hover:bg-info-700",
  };

  const look =
    variant === "solid"
      ? `${TONE_SOLID[tone]} ${solidHover[tone]} shadow-card`
      : variant === "soft"
      ? `${TONE_SOFT[tone]} border hover:brightness-[0.97]`
      : variant === "outline"
      ? `bg-surface border-2 ${outline[tone]}`
      : `text-ink-soft hover:bg-surface-sunken`;

  return `btn-press inline-flex items-center justify-center font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none ${
    SIZE[size]
  } ${look} ${full ? "w-full" : ""} ${className}`;
}

export function Button({
  children,
  tone = "brand",
  variant = "solid",
  size = "md",
  loading,
  icon: Icon,
  iconRight: IconRight,
  className,
  full,
  ...rest
}: ButtonProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      disabled={rest.disabled || loading}
      className={buttonClass({ children, tone, variant, size, full, className })}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        Icon && <Icon className="w-4 h-4" />
      )}
      <span>{children}</span>
      {IconRight && !loading && <IconRight className="w-4 h-4" />}
    </button>
  );
}

/**
 * Same look as Button, but navigates.
 *
 * Wraps next/link rather than a bare <a> so in-app routes stay client-side —
 * a plain anchor would full-reload the app and drop the auth state we just
 * waited on.
 */
export function LinkButton({
  children,
  href,
  tone = "brand",
  variant = "solid",
  size = "md",
  icon: Icon,
  iconRight: IconRight,
  className,
  full,
  ...rest
}: ButtonProps & { href: string } & Omit<
    React.AnchorHTMLAttributes<HTMLAnchorElement>,
    "href"
  >) {
  return (
    <Link
      href={href}
      {...rest}
      className={buttonClass({ children, tone, variant, size, full, className })}
    >
      {Icon && <Icon className="w-4 h-4" />}
      <span>{children}</span>
      {IconRight && <IconRight className="w-4 h-4" />}
    </Link>
  );
}

/* ----------------------------------------------------------------- badge --- */

export function Badge({
  children,
  tone = "brand",
  icon: Icon,
  solid = false,
  className = "",
}: {
  children: React.ReactNode;
  tone?: Tone;
  icon?: React.ElementType;
  solid?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold leading-none ${
        solid ? TONE_SOLID[tone] : `border ${TONE_SOFT[tone]}`
      } ${className}`}
    >
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {children}
    </span>
  );
}

/* -------------------------------------------------------------- progress --- */

export function ProgressBar({
  value,
  tone = "brand",
  size = "md",
  className = "",
  label,
}: {
  /** 0–100. Clamped, so a bad number can't blow out the layout. */
  value: number;
  tone?: Tone;
  size?: "sm" | "md";
  className?: string;
  label?: string;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value || 0)));
  return (
    <div
      className={`w-full bg-surface-sunken rounded-full overflow-hidden ${
        size === "sm" ? "h-1.5" : "h-2.5"
      } ${className}`}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className={`h-full rounded-full transition-[width] duration-500 ease-out ${TONE_ACCENT_BAR[tone]}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/* ------------------------------------------------------------ empty state --- */

export function EmptyState({
  icon: Icon,
  title,
  children,
  tone = "brand",
  action,
}: {
  icon: React.ElementType;
  title: string;
  children?: React.ReactNode;
  tone?: Tone;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-line-strong bg-surface-sunken px-5 py-8 text-center">
      <span
        className={`w-12 h-12 rounded-2xl border flex items-center justify-center mx-auto mb-3 ${TONE_SOFT[tone]}`}
      >
        <Icon className={`w-5 h-5 ${TONE_ICON[tone]}`} />
      </span>
      <p className="text-sm font-extrabold text-ink">{title}</p>
      {children && (
        <p className="text-xs text-ink-muted mt-1.5 max-w-sm mx-auto leading-relaxed">
          {children}
        </p>
      )}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ stat --- */

export function StatTile({
  label,
  value,
  icon: Icon,
  tone = "brand",
  hint,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ElementType;
  tone?: Tone;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-center gap-1.5 mb-2">
        {Icon && <Icon className={`w-3.5 h-3.5 ${TONE_ICON[tone]}`} />}
        <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
          {label}
        </span>
      </div>
      <p className="text-2xl font-black text-ink leading-none tabular-nums">
        {value}
      </p>
      {hint && <p className="text-[11px] text-ink-muted mt-1.5">{hint}</p>}
    </div>
  );
}

/* ---------------------------------------------------------------- avatar --- */

/**
 * The picture chosen at onboarding, or the first letter as a fallback.
 *
 * `avatar_url` is a path under /assets/avatars/ written by onboarding. Anything
 * unexpected falls back to the initial rather than rendering a broken image.
 */
export function Avatar({
  url,
  name,
  size = 40,
  ring = false,
  className = "",
}: {
  url?: string | null;
  name?: string | null;
  size?: number;
  ring?: boolean;
  className?: string;
}) {
  const initial = (name ?? "").trim().charAt(0).toUpperCase() || "D";
  const usable = typeof url === "string" && url.startsWith("/assets/avatars/");

  return (
    <span
      className={`relative inline-flex items-center justify-center rounded-full overflow-hidden shrink-0 bg-brand-100 ${
        ring ? "ring-4 ring-brand-100" : ""
      } ${className}`}
      style={{ width: size, height: size }}
    >
      {usable ? (
        <Image
          src={url as string}
          alt={name ? `${name}'s avatar` : "Avatar"}
          fill
          sizes={`${size}px`}
          // Avatars sit in the header and the nav bar — always on screen the
          // moment the page paints, so deferring them only buys a visible pop-in.
          loading="eager"
          className="object-cover"
        />
      ) : (
        <span
          className="font-black text-brand-700"
          style={{ fontSize: Math.round(size * 0.42) }}
        >
          {initial}
        </span>
      )}
    </span>
  );
}

/* --------------------------------------------------------------- loading --- */

export function PageLoader({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
      <Loader2 className="w-7 h-7 text-brand-600 animate-spin" />
      {label && (
        <p className="text-xs font-bold text-ink-muted uppercase tracking-wider">
          {label}
        </p>
      )}
    </div>
  );
}

/** Page title block used at the top of every tab. */
export function PageHeader({
  title,
  subtitle,
  right,
  "data-tour": dataTour,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
  /** Anchor name for the guided tour. See the note on Card. */
  "data-tour"?: string;
}) {
  return (
    <div
      data-tour={dataTour}
      className="flex flex-col sm:flex-row sm:items-end justify-between gap-3"
    >
      <div className="min-w-0">
        <h1 className="text-2xl sm:text-[26px] font-black text-ink tracking-tight leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-ink-muted mt-1 leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}
