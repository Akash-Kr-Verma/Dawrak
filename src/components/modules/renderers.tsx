// src/components/modules/renderers.tsx
//
// One renderer per static (non-interactive) format. Each one reads the module's
// content_blocks and render_spec — nothing is hardcoded per module, so adding
// an eleventh phishing module means adding a row, not a component.
//
// Structural only. The visual pass against the HTML prototype comes next.
"use client";

import React from "react";
import {
  AssetSlot,
  Bubble,
  ChatHeader,
  FakeAddressBar,
} from "./primitives";
import type { ModuleScreen } from "@/types/modules";

type Blocks = Record<string, any>;

export interface RendererProps {
  screen: ModuleScreen;
  blocks: Blocks;
  /** Tokens are already resolved by the runner. */
}

// ---------------------------------------------------------------------------
// M01 — sms_plus_landing_page
// ---------------------------------------------------------------------------

export function SmsThreadScreen({ screen, blocks }: RendererProps) {
  const p = (screen.props ?? {}) as any;
  return (
    <div className="bg-white">
      {/* Sender shows as a NAME, not a number. Alphanumeric sender IDs are
          trivially spoofable — that is the point, not an oversight. */}
      <ChatHeader title={blocks.sender_id} subtitle={p.systemLine || "Text Message"} />
      <div className="py-4 space-y-3">
        <div className="text-center text-[10px] text-slate-400">{p.timestamp}</div>
        <Bubble>{blocks.sms_body}</Bubble>
      </div>
    </div>
  );
}

export function BrowserLoginScreen({ screen, blocks }: RendererProps) {
  const p = (screen.props ?? {}) as any;
  const fields: string[] = blocks.form_labels ?? p.fields ?? [];
  return (
    <div className="bg-white">
      <FakeAddressBar url={blocks.address_bar} />
      <div className="p-6 space-y-5">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black">
            {String(blocks.sender_id ?? "P").slice(0, 1)}
          </div>
          <span className="text-sm font-black text-slate-900">{blocks.sender_id}</span>
        </div>
        <div className="space-y-3">
          {fields.map((f) => (
            <div key={f}>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                {f}
              </label>
              {/* readOnly: this form goes nowhere and holds nothing. */}
              <input
                readOnly
                value=""
                placeholder=""
                aria-label={`${f} (simulated, disabled)`}
                className="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50 text-sm"
              />
            </div>
          ))}
        </div>
        <button
          type="button"
          disabled
          className="w-full py-3 bg-indigo-600 text-white text-sm font-bold rounded-lg opacity-90 cursor-default"
        >
          {blocks.button}
        </button>
        <p className="text-[10px] text-slate-400 text-center">{blocks.footer}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// M02 — marketplace_listing
// ---------------------------------------------------------------------------

export function MarketplaceListingScreen({ screen, blocks }: RendererProps) {
  const p = (screen.props ?? {}) as any;
  const seller = blocks.seller_card ?? {};
  return (
    <div className="bg-white text-slate-900">
      <AssetSlot slot="photo_1 … photo_4" label="4-photo carousel" aspect="aspect-[4/3]" />
      <div className="flex items-center justify-center gap-1.5 py-2">
        {Array.from({ length: p.photoCount ?? 4 }).map((_, i) => (
          <span
            key={i}
            className={`h-1.5 w-1.5 rounded-full ${i === 0 ? "bg-slate-700" : "bg-slate-300"}`}
          />
        ))}
      </div>
      <div className="px-4 pb-4 space-y-3">
        <h3 className="text-[20px] font-semibold leading-snug">{blocks.title}</h3>
        <div className="text-[22px] font-bold">{blocks.price}</div>
        <div className="text-[13px] text-slate-500">{blocks.meta}</div>
        <span className="inline-block px-2.5 py-1 bg-slate-100 rounded-full text-[11px] font-medium">
          {blocks.condition}
        </span>
        <button
          type="button"
          disabled
          className="w-full py-2.5 bg-blue-600 text-white text-sm font-bold rounded-lg cursor-default"
        >
          Message
        </button>

        <hr className="border-slate-200" />
        <p className="text-[15px] leading-relaxed whitespace-pre-wrap">
          {blocks.description}
        </p>
        <hr className="border-slate-200" />

        {/* Seller card, location block and footer are three of the six green
            flags. They are not decoration — don't cut them. */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-300 shrink-0" />
          <div className="min-w-0">
            <div className="text-[15px] font-semibold truncate">{seller.name}</div>
            <div className="text-[13px] text-slate-500">{seller.joined}</div>
            <div className="text-[13px] text-slate-500">{seller.rating}</div>
          </div>
        </div>

        <div className="rounded-lg overflow-hidden border border-slate-200">
          <AssetSlot slot="map tile" aspect="aspect-[16/7]" />
          <div className="px-3 py-1.5 text-[11px] text-slate-500">
            {p.locationCaption}
          </div>
        </div>

        <p className="text-[12px] text-slate-500">{blocks.footer}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// M04 — social_post_plus_donation_page
// ---------------------------------------------------------------------------

export function SocialFeedCardScreen({ screen, blocks }: RendererProps) {
  const p = (screen.props ?? {}) as any;
  const comments: any[] = blocks.comments ?? [];
  return (
    <div className="bg-white text-slate-900">
      <div className="p-3 flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-full bg-slate-300 shrink-0" />
        <div className="min-w-0">
          {/* The ✅ is typed into the NAME. It is not a platform badge. */}
          <div className="text-sm font-bold truncate">{blocks.page_name}</div>
          <div className="text-[11px] text-slate-500">{p.sponsoredLabel}</div>
        </div>
      </div>
      <p className="px-3 pb-3 text-[13px] leading-relaxed whitespace-pre-wrap">
        {blocks.post_text}
      </p>
      <AssetSlot slot="hero_image" label="no identifiable faces" aspect="aspect-[4/3]" />
      <div className="px-3 py-2 flex items-center justify-between text-[11px] text-slate-500 border-b border-slate-100">
        <span>{p.reactions} reactions</span>
        <span>{p.shares} shares · {comments.length} comments</span>
      </div>
      <div className="px-3 py-2 space-y-2">
        {comments.map((c, i) => (
          <div key={i} className="flex items-start gap-2">
            <div className="w-6 h-6 rounded-full bg-slate-200 shrink-0" />
            <div className="bg-slate-100 rounded-2xl px-3 py-1.5 text-[12px]">
              {c.text ?? c}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DonationPageScreen({ screen, blocks }: RendererProps) {
  const p = (screen.props ?? {}) as any;
  const pct = Math.round(((p.progressRaised ?? 0) / (p.progressGoal ?? 1)) * 100);
  const options: string[] = blocks.payment_options ?? [];
  return (
    <div className="bg-white text-slate-900">
      <AssetSlot slot="hero_image" aspect="aspect-[16/9]" />
      <div className="p-4 space-y-4">
        <h3 className="text-lg font-black">{blocks.donation_headline}</h3>
        <div className="space-y-1.5">
          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
            <div className="bg-rose-500 h-full" style={{ width: `${pct}%` }} />
          </div>
          <div className="text-[12px] font-bold text-slate-700">{blocks.progress}</div>
        </div>

        {/* Every option is irreversible and untraceable. No card. No
            recognized platform. This is the whole module. */}
        <div className="space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Choose payment method
          </div>
          {options.map((o) => (
            <button
              key={o}
              type="button"
              disabled
              className="w-full py-2.5 border border-slate-300 rounded-lg text-sm font-semibold cursor-default"
            >
              {o}
            </button>
          ))}
        </div>

        <div className="pt-3 border-t border-slate-100 text-[10px] text-slate-400">
          {blocks.footer}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// M05 — dm_plus_portal
// ---------------------------------------------------------------------------

export function MessagingGroupScreen({ screen, blocks }: RendererProps) {
  const p = (screen.props ?? {}) as any;
  const replies: string[] = blocks.group_replies ?? blocks.replies ?? [];

  // Module 06 reuses this renderer for the family group; it has a single
  // forwarded message rather than an admin post.
  const isForward = Boolean(blocks.forwarded_message);

  return (
    <div className="bg-white">
      <ChatHeader
        title={p.groupName ?? blocks.group_name ?? "Group"}
        subtitle={
          typeof p.memberCount === "number"
            ? `${p.memberCount} members`
            : p.memberCount
        }
      />
      <div className="py-3 space-y-3">
        {isForward ? (
          <Bubble label={p.forwardedManyTimesLabel ? "↪ Forwarded many times" : undefined}>
            <span className="font-mono text-[12px]">{blocks.forwarded_message}</span>
            <div className="mt-2">
              <AssetSlot slot="img_lemons" aspect="aspect-[4/3]" degraded />
            </div>
          </Bubble>
        ) : (
          <>
            <Bubble label={p.adminBadge}>
              {blocks.admin_message}
              {p.hasForwardedPdfThumb && (
                <div className="mt-2">
                  <AssetSlot slot="pdf_thumb" label="acceptance letter" aspect="aspect-[3/4]" />
                </div>
              )}
            </Bubble>
          </>
        )}

        {replies.map((r, i) => (
          <Bubble key={i}>{typeof r === "string" ? r : (r as any).text}</Bubble>
        ))}

        {blocks.admin_reply_to_fee_question && (
          <Bubble label={p.adminBadge}>{blocks.admin_reply_to_fee_question}</Bubble>
        )}
      </div>
    </div>
  );
}

export function InstitutionalPortalScreen({ screen, blocks }: RendererProps) {
  const p = (screen.props ?? {}) as any;
  const uploads: string[] = blocks.portal_uploads ?? p.uploadBlock ?? [];
  return (
    <div className="bg-white text-slate-900">
      <FakeAddressBar url={p.addressBar} />
      <div className="bg-blue-900 text-white px-4 py-3 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded bg-white/20 shrink-0" />
        <span className="font-serif text-sm font-bold">{blocks.portal_headline ? "Scholarship Portal" : "Portal"}</span>
      </div>
      <div className="px-4 py-2 text-[10px] text-slate-500 border-b border-slate-200">
        Home / Applications / Results
      </div>
      <div className="p-4 space-y-4 text-[13px]">
        <p className="font-semibold leading-snug">{blocks.portal_headline}</p>
        <p className="text-slate-700">{blocks.portal_award}</p>

        {/* The ask. A scholarship gives you money; charging you inverts the
            entire relationship. */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1.5">
          <p className="font-bold text-amber-900">{blocks.portal_fee}</p>
          <p className="text-[12px] text-amber-800">{blocks.portal_beneficiary}</p>
        </div>

        <div className="space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Required documents
          </div>
          {uploads.map((u) => (
            <div
              key={u}
              className="border border-dashed border-slate-300 rounded-lg px-3 py-2.5 text-[12px] text-slate-600"
            >
              Upload: {u}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// M07 — social_post_with_chart
// ---------------------------------------------------------------------------

/**
 * The chart is built as SVG in-app rather than shipped as an image, so the
 * truncated axis is exact and it localizes. The deception is precise and
 * intentional: y starts at 1, there is no axis title, no units, no source.
 */
export function CommunityPostWithChartScreen({ screen, blocks }: RendererProps) {
  const p = (screen.props ?? {}) as any;
  const chart = p.chart ?? {};
  const bars: Array<{ label: string; value: number }> = chart.bars ?? [];
  const yStart: number = chart.yAxisStart ?? 0;
  const [zoomed, setZoomed] = React.useState(false);

  const max = Math.max(...bars.map((b) => b.value), yStart + 1);
  const height = (v: number) => ((v - yStart) / (max - yStart)) * 100;

  return (
    <div className="bg-white text-slate-900">
      <ChatHeader title={p.groupHeader} subtitle={p.groupMembers} />
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-slate-300" />
          <span className="text-[11px] text-slate-500">{p.postAge}</span>
        </div>

        <p className="text-[15px] font-black leading-snug whitespace-pre-wrap">
          {blocks.headline}
        </p>

        <div className="border border-slate-200 rounded-lg p-3">
          <div className="text-[11px] font-bold text-slate-700 mb-2">
            {chart.title}
          </div>
          <svg viewBox="0 0 200 120" className="w-full h-32" role="img" aria-label="Two-bar chart with a truncated y-axis">
            {bars.map((b, i) => {
              const h = height(b.value);
              return (
                <g key={b.label}>
                  <rect
                    x={40 + i * 70}
                    y={110 - h}
                    width="44"
                    height={h}
                    className="fill-red-500"
                  />
                  <text x={62 + i * 70} y={118} textAnchor="middle" className="fill-slate-500 text-[8px]">
                    {b.label}
                  </text>
                </g>
              );
            })}
            {/* Heavy upward arrow overlaid. */}
            <path d="M55 95 L145 25" stroke="#dc2626" strokeWidth="3" />
            <path d="M145 25 l-14 2 l7 9 z" fill="#dc2626" />
            {/* Axis line only — no title, no units, no labels. */}
            <line x1="30" y1="110" x2="190" y2="110" stroke="#cbd5e1" strokeWidth="1" />
          </svg>

          {/* Legible if you look for it, invisible if you don't. It must be
              ACTUALLY readable when enlarged — the lesson is "you didn't
              look", not "you couldn't look". */}
          <button
            type="button"
            onClick={() => setZoomed((z) => !z)}
            className={`w-full text-left mt-1 transition-all ${
              zoomed
                ? "text-[12px] text-slate-800 bg-amber-50 p-2 rounded"
                : "text-[9px] text-slate-400"
            }`}
          >
            <span className="whitespace-pre-wrap">{blocks.small_print}</span>
            {!zoomed && <span className="ml-1 underline">(tap to enlarge)</span>}
          </button>
        </div>

        <div className="text-[11px] text-slate-500">
          {p.engagement?.shares} shares · {p.engagement?.comments} comments
        </div>
        <div className="bg-slate-100 rounded-lg px-3 py-2 text-[12px]">
          {blocks.top_comment}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// M10 — group_chat
// ---------------------------------------------------------------------------

export function GroupChatScreen({ screen, blocks }: RendererProps) {
  const p = (screen.props ?? {}) as any;
  const thread: any[] = blocks.thread ?? [];
  return (
    <div className="bg-white flex flex-col min-h-[460px]">
      <ChatHeader title={p.header} subtitle={p.participants} />

      {/* Pinning makes the offer read as the group's official position. */}
      {p.pinnedBanner && (
        <div className="bg-amber-50 border-b border-amber-200 px-3 py-2.5">
          <div className="text-[13px] whitespace-pre-wrap text-amber-950">
            {blocks.pinned_message}
          </div>
        </div>
      )}

      <div className="flex-1 py-3 space-y-3">
        {thread.map((m, i) => (
          <React.Fragment key={i}>
            <Bubble time={m.time}>
              {m.image && (
                <div className="mb-1.5">
                  <AssetSlot slot={m.image} label="payout screenshot" aspect="aspect-[4/3]" />
                </div>
              )}
              {m.text}
            </Bubble>
            {m.adminReply && <Bubble label="Admin">{m.adminReply}</Bubble>}
          </React.Fragment>
        ))}

        {blocks.latest_highlighted && (
          <div className="px-3">
            <div className="bg-rose-50 border border-rose-200 rounded-xl px-3.5 py-2.5 text-[13px] font-semibold text-rose-900">
              {blocks.latest_highlighted}
            </div>
          </div>
        )}
      </div>

      {/* A "community" where only one person may speak is not a community. */}
      {p.composerDisabled && (
        <div className="border-t border-slate-200 bg-slate-100 px-4 py-3 text-center text-[11px] text-slate-500 italic">
          {blocks.composer ?? p.composerLabel}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dispatch
// ---------------------------------------------------------------------------

const BY_KIND: Record<string, React.FC<RendererProps>> = {
  sms_thread: SmsThreadScreen,
  browser_login_page: BrowserLoginScreen,
  marketplace_listing: MarketplaceListingScreen,
  social_feed_card: SocialFeedCardScreen,
  donation_page: DonationPageScreen,
  messaging_group: MessagingGroupScreen,
  institutional_portal: InstitutionalPortalScreen,
  community_post_with_chart: CommunityPostWithChartScreen,
  group_chat: GroupChatScreen,
};

export function ScreenRenderer(props: RendererProps) {
  const Component = BY_KIND[props.screen.kind];
  if (!Component) {
    return (
      <div className="p-6 text-center text-xs text-slate-500">
        No renderer for screen kind{" "}
        <code className="font-mono text-slate-700">{props.screen.kind}</code>.
      </div>
    );
  }
  return <Component {...props} />;
}
