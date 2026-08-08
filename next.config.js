/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV !== "production";

const nextConfig = {
  // `page.dev.tsx` files are routes in development only.
  //
  // The module preview harness (src/app/(dashboard)/learn/preview/[slug]) imports
  // the authored content from src/content/modules, and that content includes the
  // answers: canonical_reasoning, signals, rubrics, distractors and reveal text.
  // Everywhere else those columns are deliberately withheld from the client and
  // only returned by /api/modules/grade after the learner submits.
  //
  // A runtime notFound() guard is not enough on its own — the route's JS chunk
  // still gets emitted and can be fetched directly. Gating at the route level is
  // what actually keeps those strings out of a production build.
  pageExtensions: isDev
    ? ["tsx", "ts", "jsx", "js", "dev.tsx"]
    : ["tsx", "ts", "jsx", "js"],
};

module.exports = nextConfig;
