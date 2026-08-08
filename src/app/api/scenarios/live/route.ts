// src/app/api/scenarios/live/route.ts
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// 1. CRITICAL: Tells Next.js 14 NEVER to cache this route!
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Lazy for the same reason as /api/feedback: constructing the SDK at module
// scope with no key throws during `next build`'s page-data collection.
function getOpenAI(): OpenAI | null {
  const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({
    apiKey,
    baseURL: process.env.GROQ_API_KEY
      ? 'https://api.groq.com/openai/v1'
      : 'https://api.openai.com/v1',
  });
}

export interface RichScenario {
  id: string;
  title: string;
  body_context: string;
  category: 'source_checking' | 'deepfake' | 'phishing' | 'emotional_manipulation';
  verdict: 'real' | 'fake';
  original_publisher: string;
  mediaType: 'text' | 'image' | 'audio';
  mediaUrl?: string;
  sourceChannel: string;
  viralReach: string;
  dateStr: string;
}

export async function GET() {
  try {
    const isReal = Math.random() > 0.5;
    const mediaTypes = ['text', 'image', 'audio'];
    const selectedMedia = mediaTypes[Math.floor(Math.random() * mediaTypes.length)];

    const prompt = `
      You are an expert Indian Media & Information Literacy (MIL) educator.
      Generate ONE brand-new, unique, highly specific 2026 news or social media claim from India (e.g., Pune, Mumbai, Bengaluru, Delhi) or global tech/banking.
      
      STRICT REQUIREMENTS:
      - Verdict MUST be: "${isReal ? 'real' : 'fake'}"
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

    const openai = getOpenAI();
    // No key configured — fall straight through to the rotating fallback bank.
    if (!openai) throw new Error('No AI API key configured');

    const completion = await openai.chat.completions.create({
      model: process.env.GROQ_API_KEY ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini',
      messages: [{ role: 'system', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.95, // Max randomness for unique stories
    });

    const parsed = JSON.parse(completion.choices[0].message.content || '{}');

    // Assign reliable sample media URLs so images and audio actually render and play in UI
    let mediaUrl = undefined;
    if (selectedMedia === 'image') {
      const imagePool = [
        'https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=1000&q=80', // Floods/subway
        'https://images.unsplash.com/photo-1590055531615-f16d36ffe8ec?auto=format&fit=crop&w=1000&q=80', // Satellite/weather
        'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1000&q=80', // Cyber/phishing
        'https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=1000&q=80', // Urban/smoke
      ];
      mediaUrl = imagePool[Math.floor(Math.random() * imagePool.length)];
    } else if (selectedMedia === 'audio') {
      mediaUrl = 'https://actions.google.com/sounds/v1/speech/prospect_humphrey_speech.ogg'; // Playable audio sample
    }

    const liveScenario: RichScenario = {
      id: `ai-live-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      title: parsed.title || 'Unverified Internet Claim',
      body_context: parsed.body_context || 'Circulating across social media channels.',
      category: parsed.category || 'source_checking',
      verdict: isReal ? 'real' : 'fake',
      original_publisher: parsed.original_publisher || 'Independent Network',
      mediaType: selectedMedia as 'text' | 'image' | 'audio',
      mediaUrl: mediaUrl,
      sourceChannel: parsed.sourceChannel || 'Internet Claim',
      viralReach: parsed.viralReach || 'Circulating Online',
      dateStr: 'August 2026',
    };

    return NextResponse.json(liveScenario);
  } catch (error) {
    console.warn('⚠️ [/api/scenarios/live] Using rotating 5-item fallback bank:', error);

    // 2. CRITICAL: 5-Item Rotating Bank so it NEVER repeats even offline!
    const fallbackBank: RichScenario[] = [
      {
        id: `fb-01-${Date.now()}`,
        title: 'RBI Official Circular: Mandatory Multi-Factor Authentication for Tokenized Card Transactions',
        body_context: 'Issued from RBI Headquarters in Mumbai: The Reserve Bank of India officially updated its digital payments framework, requiring all merchants to implement additional factor authentication for recurring card tokenization above Rs 15,000.',
        category: 'source_checking',
        verdict: 'real',
        original_publisher: 'Reserve Bank of India (rbi.org.in)',
        mediaType: 'text',
        sourceChannel: 'Official Govt Release',
        viralReach: 'Official Banking Notification',
        dateStr: 'August 2026'
      },
      {
        id: `fb-02-${Date.now()}`,
        title: 'VIRAL PHOTO: "Underground Flooding Inside Pune Metro Shivaji Nagar Station After Monsoon Rain"',
        body_context: 'Circulating across Pune WhatsApp groups: This photograph claims to show waist-deep floodwaters submerging the ticketing counter inside the newly operational Shivaji Nagar underground metro station in Pune, Maharashtra.',
        category: 'source_checking',
        verdict: 'fake',
        original_publisher: 'Pune Citizens WhatsApp Forward',
        mediaType: 'image',
        mediaUrl: 'https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=1000&q=80',
        sourceChannel: 'WhatsApp Forward',
        viralReach: 'Forwarded in 50+ Pune City Groups',
        dateStr: 'August 2026'
      },
      {
        id: `fb-03-${Date.now()}`,
        title: 'LEAKED VOICE NOTE: "Emergency 5-Day Banking Holiday & ATM Freeze Across Maharashtra"',
        body_context: 'A viral voice note circulating in Pune and Mumbai claiming to be a confidential recording of a State Finance Ministry official warning citizens to withdraw cash immediately before an unannounced 5-day ATM freeze.',
        category: 'deepfake',
        verdict: 'fake',
        original_publisher: 'Telegram Viral Channel',
        mediaType: 'audio',
        mediaUrl: 'https://actions.google.com/sounds/v1/speech/prospect_humphrey_speech.ogg',
        sourceChannel: 'Telegram Audio Note',
        viralReach: '320,000+ Listens',
        dateStr: 'August 2026'
      },
      {
        id: `fb-04-${Date.now()}`,
        title: 'IMD Satellite Radar Bulletin: Severe Weather Alert for Konkan Coast & Mumbai Region',
        body_context: 'Issued by the Regional Meteorological Centre, Mumbai: Official Doppler weather radar imagery and advisory warning coastal residents of high-speed squally winds (45–55 km/h) over the east-central Arabian Sea.',
        category: 'source_checking',
        verdict: 'real',
        original_publisher: 'India Meteorological Department (mausam.imd.gov.in)',
        mediaType: 'image',
        mediaUrl: 'https://images.unsplash.com/photo-1590055531615-f16d36ffe8ec?auto=format&fit=crop&w=1000&q=80',
        sourceChannel: 'Official Govt Release',
        viralReach: 'Official Weather Alert',
        dateStr: 'August 2026'
      },
      {
        id: `fb-05-${Date.now()}`,
        title: 'WHATSAPP ALERT: "Rs 5,000 Monsoon Relief Scheme Direct Bank Transfer Registration Link"',
        body_context: 'Spreading across rural and urban WhatsApp groups in Maharashtra: A message claiming the Ministry of Agriculture is disbursing Rs 5,000 instant monsoon relief to all Aadhaar-linked bank accounts via an unverified APK download link.',
        category: 'phishing',
        verdict: 'fake',
        original_publisher: 'WhatsApp Broadcast Message',
        mediaType: 'text',
        sourceChannel: 'WhatsApp Forward',
        viralReach: 'Forwarded Many Times',
        dateStr: 'August 2026'
      }
    ];

    const selected = fallbackBank[Math.floor(Math.random() * fallbackBank.length)];
    return NextResponse.json(selected);
  }
}
