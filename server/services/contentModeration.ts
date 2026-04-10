import OpenAI from "openai";

let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

export interface ModerationResult {
  flagged: boolean;
  reason: string;
  confidence: number;
  riskLevel: 'safe' | 'moderate' | 'explicit' | 'severe';
}

const SYSTEM_PROMPT = `You are a content safety classifier for an educational platform used by university students and professionals in the UK. 
Analyse the provided content and determine whether it contains inappropriate material.

Flag content that contains:
- Pornography, nudity, or sexually explicit material
- Graphic violence or gore
- Hate speech or extreme discrimination
- Harassment or severe bullying

Do NOT flag educational, medical, scientific, or artistic content that is not sexually explicit or violent.

Respond ONLY with valid JSON in this exact format:
{
  "flagged": true or false,
  "reason": "short reason if flagged, or empty string if safe",
  "confidence": a number between 0 and 1 indicating your confidence,
  "riskLevel": "safe" | "moderate" | "explicit" | "severe"
}

riskLevel definitions:
- safe: No inappropriate content detected
- moderate: Mildly inappropriate, borderline content
- explicit: Clearly inappropriate, explicit sexual or violent content
- severe: Severe content: child safety concerns, extreme violence, etc.`;

const urlScanCache = new Map<string, { result: ModerationResult; cachedAt: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function getCachedScan(url: string): ModerationResult | null {
  const entry = urlScanCache.get(url);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
    urlScanCache.delete(url);
    return null;
  }
  return entry.result;
}

function setCachedScan(url: string, result: ModerationResult): void {
  urlScanCache.set(url, { result, cachedAt: Date.now() });
}

function classifyRiskLevel(confidence: number, flagged: boolean): 'safe' | 'moderate' | 'explicit' | 'severe' {
  if (!flagged) return 'safe';
  if (confidence >= 0.9) return 'severe';
  if (confidence >= 0.7) return 'explicit';
  return 'moderate';
}

export async function moderateImageUrl(imageUrl: string): Promise<ModerationResult> {
  const cached = getCachedScan(imageUrl);
  if (cached) return cached;

  const openai = getOpenAI();
  if (!openai) {
    return { flagged: false, reason: "", confidence: 0, riskLevel: 'safe' };
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 150,
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: imageUrl, detail: "low" },
            },
            {
              type: "text",
              text: "Analyse this image for inappropriate content.",
            },
          ],
        },
      ],
    });

    const text = response.choices[0]?.message?.content?.trim() ?? "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      const safe: ModerationResult = { flagged: false, reason: "", confidence: 0, riskLevel: 'safe' };
      setCachedScan(imageUrl, safe);
      return safe;
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const confidence = Number(parsed.confidence ?? 0);
    const flagged = Boolean(parsed.flagged);
    const result: ModerationResult = {
      flagged,
      reason: String(parsed.reason ?? ""),
      confidence,
      riskLevel: (parsed.riskLevel && ['safe', 'moderate', 'explicit', 'severe'].includes(parsed.riskLevel))
        ? parsed.riskLevel
        : classifyRiskLevel(confidence, flagged),
    };
    setCachedScan(imageUrl, result);
    return result;
  } catch (err) {
    console.error("[contentModeration] Image moderation error:", err);
    return { flagged: false, reason: "", confidence: 0, riskLevel: 'safe' };
  }
}

export async function moderateText(text: string): Promise<ModerationResult> {
  const openai = getOpenAI();
  if (!openai) {
    return { flagged: false, reason: "", confidence: 0, riskLevel: 'safe' };
  }

  try {
    const response = await openai.moderations.create({
      model: "omni-moderation-latest",
      input: text,
    });

    const result = response.results[0];
    if (!result) return { flagged: false, reason: "", confidence: 0, riskLevel: 'safe' };

    const flagged = result.flagged;
    const scores = result.category_scores as unknown as Record<string, number>;
    const categories = result.categories as unknown as Record<string, boolean>;

    const triggeredCategories = Object.entries(categories)
      .filter(([, v]) => v)
      .map(([k]) => k.replace("/", " "));

    const maxScore = Math.max(0, ...Object.values(scores));

    const isSexuallyExplicit = (categories as any)['sexual'] || (categories as any)['sexual/minors'];
    const isViolent = (categories as any)['violence/graphic'];
    let riskLevel: ModerationResult['riskLevel'] = 'safe';
    if (flagged) {
      if ((categories as any)['sexual/minors'] || maxScore >= 0.9) riskLevel = 'severe';
      else if (isSexuallyExplicit || isViolent || maxScore >= 0.7) riskLevel = 'explicit';
      else riskLevel = 'moderate';
    }

    return {
      flagged,
      reason: triggeredCategories.join(", "),
      confidence: maxScore,
      riskLevel,
    };
  } catch (err) {
    console.error("[contentModeration] Text moderation error:", err);
    return { flagged: false, reason: "", confidence: 0, riskLevel: 'safe' };
  }
}

export async function moderatePostContent(params: {
  text?: string;
  imageUrls?: string[];
  videoUrl?: string;
}): Promise<ModerationResult> {
  const results: ModerationResult[] = [];

  if (params.text && params.text.trim().length > 0) {
    results.push(await moderateText(params.text));
  }

  if (params.imageUrls && params.imageUrls.length > 0) {
    const imageResults = await Promise.all(
      params.imageUrls.map((url) => moderateImageUrl(url))
    );
    results.push(...imageResults);
  }

  if (params.videoUrl) {
    results.push(await moderateImageUrl(params.videoUrl));
  }

  const flaggedResult = results.find((r) => r.flagged);
  if (flaggedResult) return flaggedResult;

  const maxConfidence = results.reduce((max, r) => Math.max(max, r.confidence), 0);
  return { flagged: false, reason: "", confidence: maxConfidence, riskLevel: 'safe' };
}
