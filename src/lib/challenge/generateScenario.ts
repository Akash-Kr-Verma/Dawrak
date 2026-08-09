// src/lib/challenge/generateScenario.ts
//
// Generates a fresh Daily Challenge claim, with a rotating fallback bank for
// when there is no AI key or the call fails.
//
// Extracted from /api/scenarios/live so that /api/challenge/next can persist
// what it generates. A generated scenario that is never written to `scenarios`
// cannot be referenced by `attempts.scenario_id`, which is half the reason the
// Challenge tab never recorded anything.

import OpenAI from "openai";

export interface GeneratedScenario {
  title: string;
  body_context: string;
  category:
    | "source_checking"
    | "deepfake"
    | "phishing"
    | "emotional_manipulation";
  verdict: "real" | "fake";
  original_publisher: string;
  media_type: "text" | "image" | "audio";
  media_url?: string;
  source_channel: string;
  viral_reach: string;
  date_str: string;
}

function getOpenAI(): OpenAI | null {
  const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({
    apiKey,
    baseURL: process.env.GROQ_API_KEY
      ? "https://api.groq.com/openai/v1"
      : "https://api.openai.com/v1",
  });
}

const IMAGE_POOL = [
  "https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=1000&q=80",
  "https://images.unsplash.com/photo-1590055531615-f16d36ffe8ec?auto=format&fit=crop&w=1000&q=80",
  "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1000&q=80",
  "https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=1000&q=80",
];
const AUDIO_SAMPLE =
  "https://actions.google.com/sounds/v1/speech/prospect_humphrey_speech.ogg";

/** Rotating bank used when no AI key is configured or the call fails. */
export const FALLBACK_BANK: GeneratedScenario[] = [
  {
    title:
      "RBI Official Circular: Mandatory Multi-Factor Authentication for Tokenized Card Transactions",
    body_context:
      "Issued from RBI Headquarters in Mumbai: The Reserve Bank of India officially updated its digital payments framework, requiring all merchants to implement additional factor authentication for recurring card tokenization above Rs 15,000.",
    category: "source_checking",
    verdict: "real",
    original_publisher: "Reserve Bank of India (rbi.org.in)",
    media_type: "text",
    source_channel: "Official Govt Release",
    viral_reach: "Official Banking Notification",
    date_str: "August 2026",
  },
  {
    title:
      'VIRAL PHOTO: "Underground Flooding Inside Pune Metro Shivaji Nagar Station After Monsoon Rain"',
    body_context:
      "Circulating across Pune WhatsApp groups: This photograph claims to show waist-deep floodwaters submerging the ticketing counter inside the newly operational Shivaji Nagar underground metro station in Pune, Maharashtra.",
    category: "source_checking",
    verdict: "fake",
    original_publisher: "Pune Citizens WhatsApp Forward",
    media_type: "image",
    media_url: IMAGE_POOL[0],
    source_channel: "WhatsApp Forward",
    viral_reach: "Forwarded in 50+ Pune City Groups",
    date_str: "August 2026",
  },
  {
    title:
      'LEAKED VOICE NOTE: "Emergency 5-Day Banking Holiday & ATM Freeze Across Maharashtra"',
    body_context:
      "A viral voice note circulating in Pune and Mumbai claiming to be a confidential recording of a State Finance Ministry official warning citizens to withdraw cash immediately before an unannounced 5-day ATM freeze.",
    category: "deepfake",
    verdict: "fake",
    original_publisher: "Telegram Viral Channel",
    media_type: "audio",
    media_url: AUDIO_SAMPLE,
    source_channel: "Telegram Audio Note",
    viral_reach: "320,000+ Listens",
    date_str: "August 2026",
  },
  {
    title:
      "IMD Satellite Radar Bulletin: Severe Weather Alert for Konkan Coast & Mumbai Region",
    body_context:
      "Issued by the Regional Meteorological Centre, Mumbai: Official Doppler weather radar imagery and advisory warning coastal residents of high-speed squally winds (45–55 km/h) over the east-central Arabian Sea.",
    category: "source_checking",
    verdict: "real",
    original_publisher: "India Meteorological Department (mausam.imd.gov.in)",
    media_type: "image",
    media_url: IMAGE_POOL[1],
    source_channel: "Official Govt Release",
    viral_reach: "Official Weather Alert",
    date_str: "August 2026",
  },
  {
    title:
      'WHATSAPP ALERT: "Rs 5,000 Monsoon Relief Scheme Direct Bank Transfer Registration Link"',
    body_context:
      "Spreading across rural and urban WhatsApp groups in Maharashtra: A message claiming the Ministry of Agriculture is disbursing Rs 5,000 instant monsoon relief to all Aadhaar-linked bank accounts via an unverified APK download link.",
    category: "phishing",
    verdict: "fake",
    original_publisher: "WhatsApp Broadcast Message",
    media_type: "text",
    source_channel: "WhatsApp Forward",
    viral_reach: "Forwarded Many Times",
    date_str: "August 2026",
  },
];

export function pickFallback(): GeneratedScenario {
  return FALLBACK_BANK[Math.floor(Math.random() * FALLBACK_BANK.length)];
}

/** Generate one claim. Never throws — falls back to the bank. */
export async function generateScenario(): Promise<GeneratedScenario> {
  const isReal = Math.random() > 0.5;
  const mediaTypes = ["text", "image", "audio"] as const;
  const selectedMedia = mediaTypes[Math.floor(Math.random() * mediaTypes.length)];

  try {
    const openai = getOpenAI();
    if (!openai) throw new Error("No AI API key configured");

    const prompt = `
      You are an expert Indian Media & Information Literacy (MIL) educator.
      Generate ONE brand-new, unique, highly specific 2026 news or social media claim from India (e.g., Pune, Mumbai, Bengaluru, Delhi) or global tech/banking.

      STRICT REQUIREMENTS:
      - Verdict MUST be: "${isReal ? "real" : "fake"}"
      - Media Type MUST be: "${selectedMedia}"
      - If "real": Make it sound like an authentic, specific official announcement from RBI, ISRO, IMD, CERT-In, or Metro authorities with dates and locations.
      - If "fake": Make it a realistic WhatsApp forward scam, Telegram audio deepfake rumor, or X (Twitter) synthetic photo panic with specific red flags.
      - Never repeat generic examples.

      Return ONLY a valid JSON object matching this schema:
      {
        "title": "Specific headline or viral warning text",
        "body_context": "Detailed 2-sentence context mentioning specific city, authority, or viral spread",
        "category": "source_checking" | "deepfake" | "phishing" | "emotional_manipulation",
        "original_publisher": "Name of official portal OR WhatsApp/Telegram broadcast source",
        "sourceChannel": "Official Govt Release" | "WhatsApp Forward" | "Telegram Audio Note" | "X / Twitter Viral Post",
        "viralReach": "e.g., 'Official Notification' or 'Forwarded 100k+ times'"
      }
    `;

    const completion = await openai.chat.completions.create({
      model: process.env.GROQ_API_KEY ? "llama-3.3-70b-versatile" : "gpt-4o-mini",
      messages: [{ role: "system", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.95,
    });

    const parsed = JSON.parse(completion.choices[0].message.content || "{}");

    let mediaUrl: string | undefined;
    if (selectedMedia === "image") {
      mediaUrl = IMAGE_POOL[Math.floor(Math.random() * IMAGE_POOL.length)];
    } else if (selectedMedia === "audio") {
      mediaUrl = AUDIO_SAMPLE;
    }

    return {
      title: parsed.title || "Unverified Internet Claim",
      body_context:
        parsed.body_context || "Circulating across social media channels.",
      category: parsed.category || "source_checking",
      verdict: isReal ? "real" : "fake",
      original_publisher: parsed.original_publisher || "Independent Network",
      media_type: selectedMedia,
      media_url: mediaUrl,
      source_channel: parsed.sourceChannel || "Internet Claim",
      viral_reach: parsed.viralReach || "Circulating Online",
      date_str: "August 2026",
    };
  } catch (error) {
    console.warn("[challenge] falling back to the rotating bank:", error);
    return pickFallback();
  }
}
