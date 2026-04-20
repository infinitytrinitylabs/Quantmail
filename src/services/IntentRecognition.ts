/**
 * IntentRecognition
 *
 * AI-driven predictive engine that analyzes incoming emails to determine optimal
 * response trajectories and automatically generates contextual draft responses.
 * The system learns from historical user behavior to perfectly mimic their tone,
 * style, and communication patterns across different contexts and relationships.
 *
 * Core Features
 * ─────────────
 * ✓ Deep context analysis - extracts semantic meaning from email threads
 * ✓ Intent classification - categorizes emails into actionable categories
 * ✓ Auto-draft generation - creates full-context responses in user's voice
 * ✓ Tone matching - maintains consistency with historical communication patterns
 * ✓ Relationship awareness - adjusts formality based on sender relationship
 * ✓ Multi-turn thread analysis - understands conversation context and flow
 * ✓ Action extraction - identifies commitments, deadlines, and next steps
 * ✓ Priority scoring - ranks emails based on urgency and importance
 *
 * Architecture
 * ────────────
 *  ┌─────────────────────────────────┐
 *  │   Incoming Email Metadata       │
 *  └──────────────┬──────────────────┘
 *                 │
 *      classifyIntent()
 *                 │
 *  ┌──────────────▼──────────────────┐
 *  │   Intent Classifier (LLM)       │
 *  └──────────────┬──────────────────┘
 *                 │
 *      analyzeThread()
 *                 │
 *  ┌──────────────▼──────────────────┐
 *  │   Thread Context Analyzer       │
 *  └──────────────┬──────────────────┘
 *                 │
 *   generateResponseDraft()
 *                 │
 *  ┌──────────────▼──────────────────┐
 *  │   Response Generator (LLM)      │
 *  └──────────────┬──────────────────┘
 *                 │
 *  ┌──────────────▼──────────────────┐
 *  │   Polished Draft Response       │
 *  └─────────────────────────────────┘
 *
 * Intent Categories
 * ────────────────
 * • MEETING_SCHEDULE - requires calendar coordination
 * • PROJECT_APPROVAL - needs decision/approval response
 * • CASUAL_FOLLOWUP - informal check-in or update
 * • URGENT_REQUEST - time-sensitive action required
 * • INFORMATION_QUERY - question requiring detailed answer
 * • STATUS_UPDATE - progress report or FYI
 * • INTRODUCTION - new contact or networking
 * • COMPLAINT_ISSUE - problem requiring resolution
 * • THANK_YOU - acknowledgment or gratitude
 * • AUTOMATED_NOTIFICATION - system-generated message
 */

import OpenAI from "openai";
import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";

// ─── Public Types ─────────────────────────────────────────────────────────────

/**
 * Email intent categories used for classification and response trajectory planning.
 */
export type EmailIntent =
  | "MEETING_SCHEDULE"
  | "PROJECT_APPROVAL"
  | "CASUAL_FOLLOWUP"
  | "URGENT_REQUEST"
  | "INFORMATION_QUERY"
  | "STATUS_UPDATE"
  | "INTRODUCTION"
  | "COMPLAINT_ISSUE"
  | "THANK_YOU"
  | "AUTOMATED_NOTIFICATION"
  | "UNKNOWN";

/**
 * User's relationship to the email sender, affects formality and tone.
 */
export type SenderRelationship =
  | "manager"
  | "direct_report"
  | "colleague"
  | "client"
  | "vendor"
  | "friend"
  | "family"
  | "unknown";

/**
 * Tone classification matching the user's historical communication style.
 */
export type CommunicationTone =
  | "formal"
  | "professional"
  | "casual"
  | "friendly"
  | "urgent"
  | "apologetic"
  | "grateful"
  | "assertive"
  | "neutral";

/**
 * Priority level determined by urgency indicators and relationship context.
 */
export type PriorityLevel = "critical" | "high" | "medium" | "low" | "minimal";

/**
 * Metadata about an incoming email used for intent analysis.
 */
export interface EmailMetadata {
  /** Unique email identifier. */
  emailId: string;
  /** Email subject line. */
  subject: string;
  /** Full email body content. */
  body: string;
  /** Sender's email address. */
  from: string;
  /** Sender's display name. */
  fromName: string;
  /** ISO-8601 timestamp when email was received. */
  receivedAt: string;
  /** Optional thread ID for conversation context. */
  threadId?: string;
  /** Previous emails in this thread (most recent first). */
  threadHistory?: EmailMessage[];
  /** CC'd recipients. */
  cc?: string[];
  /** User's relationship to sender (if known). */
  relationship?: SenderRelationship;
  /** Attachments metadata. */
  attachments?: AttachmentInfo[];
}

/**
 * A single message in an email thread.
 */
export interface EmailMessage {
  /** Message subject. */
  subject: string;
  /** Message body. */
  body: string;
  /** Sender email. */
  from: string;
  /** ISO-8601 timestamp. */
  timestamp: string;
  /** True if sent by the user. */
  isFromUser: boolean;
}

/**
 * Basic attachment metadata.
 */
export interface AttachmentInfo {
  /** File name. */
  name: string;
  /** MIME type. */
  type: string;
  /** File size in bytes. */
  size: number;
}

/**
 * Extracted action items and commitments from email content.
 */
export interface ExtractedAction {
  /** Action description. */
  action: string;
  /** Optional deadline mentioned in email. */
  deadline?: string;
  /** Person responsible (if specified). */
  assignee?: string;
  /** Confidence score [0-1]. */
  confidence: number;
}

/**
 * Result of intent classification analysis.
 */
export interface IntentAnalysisResult {
  /** Primary classified intent. */
  intent: EmailIntent;
  /** Confidence score for the classification [0-1]. */
  confidence: number;
  /** Computed priority level. */
  priority: PriorityLevel;
  /** Detected sentiment/tone of the incoming email. */
  detectedTone: CommunicationTone;
  /** Recommended response tone based on relationship and context. */
  recommendedTone: CommunicationTone;
  /** Extracted action items. */
  actions: ExtractedAction[];
  /** Key entities mentioned (people, dates, projects, etc.). */
  entities: Record<string, string[]>;
  /** Brief summary of the email (1-2 sentences). */
  summary: string;
  /** Suggested response trajectory description. */
  responseTrajectory: string;
  /** Estimated time to respond (in minutes). */
  estimatedResponseTime: number;
  /** Tags for categorization. */
  tags: string[];
}

/**
 * Historical interaction data used for tone matching.
 */
export interface UserHistoricalProfile {
  /** User's email address. */
  userEmail: string;
  /** Sample past emails sent by the user (for tone learning). */
  sampleEmails: EmailMessage[];
  /** Common phrases and expressions the user uses. */
  commonPhrases: string[];
  /** Preferred greeting style. */
  greetingStyle?: string;
  /** Preferred sign-off style. */
  signoffStyle?: string;
  /** Average response length (in words). */
  avgResponseLength?: number;
  /** Formality level [1-5, 1=very casual, 5=very formal]. */
  formalityLevel?: number;
}

/**
 * Context for generating a draft response.
 */
export interface ResponseContext {
  /** Original email metadata. */
  email: EmailMetadata;
  /** Intent analysis result. */
  analysis: IntentAnalysisResult;
  /** User's historical communication profile. */
  userProfile: UserHistoricalProfile;
  /** Additional context or instructions from the user. */
  additionalInstructions?: string;
}

/**
 * Generated draft response.
 */
export interface DraftResponse {
  /** Draft email subject (usually Re: original subject). */
  subject: string;
  /** Draft email body. */
  body: string;
  /** Tone used in the draft. */
  tone: CommunicationTone;
  /** Confidence in the draft quality [0-1]. */
  confidence: number;
  /** Model used to generate the draft. */
  model: string;
  /** Generation latency in milliseconds. */
  latencyMs: number;
  /** Alternative draft variations. */
  alternatives?: AlternativeDraft[];
}

/**
 * Alternative draft variation.
 */
export interface AlternativeDraft {
  /** Variation body text. */
  body: string;
  /** Tone variant. */
  tone: CommunicationTone;
  /** Confidence score. */
  confidence: number;
}

/**
 * Configuration for the intent recognition engine.
 */
export interface IntentRecognitionConfig {
  /** LLM provider to use (openai or anthropic). */
  provider?: "openai" | "anthropic";
  /** Model name override. */
  model?: string;
  /** Temperature for text generation. */
  temperature?: number;
  /** Maximum tokens for draft responses. */
  maxDraftTokens?: number;
  /** Enable multi-draft generation (alternatives). */
  enableAlternatives?: boolean;
  /** Number of alternative drafts to generate. */
  numAlternatives?: number;
}

// ─── Internal Constants ───────────────────────────────────────────────────────

const DEFAULT_PROVIDER = "openai";
const DEFAULT_OPENAI_MODEL = "gpt-4o";
const DEFAULT_ANTHROPIC_MODEL = "claude-3-5-sonnet-20241022";
const DEFAULT_TEMPERATURE = 0.4;
const DEFAULT_MAX_DRAFT_TOKENS = 500;
const DEFAULT_NUM_ALTERNATIVES = 2;

// Intent classification prompt
const INTENT_CLASSIFICATION_PROMPT = `You are an expert email analyst. Analyze the following email and classify its primary intent.

Available intent categories:
- MEETING_SCHEDULE: Email requires scheduling or calendar coordination
- PROJECT_APPROVAL: Needs decision, approval, or sign-off
- CASUAL_FOLLOWUP: Informal check-in, update, or casual conversation
- URGENT_REQUEST: Time-sensitive action required immediately
- INFORMATION_QUERY: Question requiring detailed information or explanation
- STATUS_UPDATE: Progress report or informational update (FYI)
- INTRODUCTION: New contact introduction or networking
- COMPLAINT_ISSUE: Problem report requiring resolution
- THANK_YOU: Acknowledgment, gratitude, or appreciation
- AUTOMATED_NOTIFICATION: System-generated or automated message
- UNKNOWN: Cannot determine clear intent

Analyze the email and provide:
1. Primary intent classification
2. Confidence score (0-1)
3. Priority level (critical/high/medium/low/minimal)
4. Detected tone (formal/professional/casual/friendly/urgent/apologetic/grateful/assertive/neutral)
5. Recommended response tone
6. Action items (if any)
7. Key entities (people, dates, projects, companies, etc.)
8. Brief summary (1-2 sentences)
9. Response trajectory suggestion
10. Estimated response time (minutes)
11. Relevant tags

Return ONLY a valid JSON object with these fields.`;

// Response generation system prompt
const RESPONSE_GENERATION_SYSTEM_PROMPT = `You are an expert email composition assistant. Your task is to generate a professional, contextual email response that perfectly matches the user's historical communication style and tone.

Guidelines:
- Match the user's typical tone, formality level, and phrasing patterns
- Keep responses concise yet complete
- Address all key points from the original email
- Include appropriate greeting and sign-off based on relationship
- Maintain consistency with the user's historical email samples
- Be natural and human - avoid overly formal or robotic language
- Include clear action items or next steps when relevant
- Adapt tone appropriately to the sender relationship and email context

Generate a complete, ready-to-send email response.`;

// ─── Helper Functions ─────────────────────────────────────────────────────────

/**
 * Validates that required environment variables are set.
 */
function validateConfig(provider: "openai" | "anthropic"): void {
  if (provider === "openai" && !process.env["OPENAI_API_KEY"]) {
    throw new Error("OPENAI_API_KEY environment variable is required");
  }
  if (provider === "anthropic" && !process.env["ANTHROPIC_API_KEY"]) {
    throw new Error("ANTHROPIC_API_KEY environment variable is required");
  }
}

/**
 * Builds a comprehensive context string from email metadata and thread history.
 */
function buildEmailContext(email: EmailMetadata): string {
  let context = `Subject: ${email.subject}\n`;
  context += `From: ${email.fromName} <${email.from}>\n`;
  context += `Received: ${email.receivedAt}\n`;

  if (email.relationship) {
    context += `Relationship: ${email.relationship}\n`;
  }

  if (email.cc && email.cc.length > 0) {
    context += `CC: ${email.cc.join(", ")}\n`;
  }

  if (email.attachments && email.attachments.length > 0) {
    context += `Attachments: ${email.attachments.map((a) => a.name).join(", ")}\n`;
  }

  context += `\n${email.body}\n`;

  if (email.threadHistory && email.threadHistory.length > 0) {
    context += "\n--- Thread History (Most Recent First) ---\n";
    email.threadHistory.slice(0, 3).forEach((msg, idx) => {
      context += `\n[Message ${idx + 1}]\n`;
      context += `From: ${msg.from}\n`;
      context += `Date: ${msg.timestamp}\n`;
      context += `${msg.body.slice(0, 500)}${msg.body.length > 500 ? "..." : ""}\n`;
    });
  }

  return context;
}

/**
 * Extracts a formality score from user profile (1-5 scale).
 */
function getFormalityScore(profile: UserHistoricalProfile): number {
  return profile.formalityLevel ?? 3; // Default to neutral
}

/**
 * Builds user style context from historical profile.
 */
function buildUserStyleContext(profile: UserHistoricalProfile): string {
  let context = `User Communication Profile:\n`;
  context += `Email: ${profile.userEmail}\n`;

  if (profile.formalityLevel) {
    context += `Formality Level: ${profile.formalityLevel}/5\n`;
  }

  if (profile.avgResponseLength) {
    context += `Average Response Length: ~${profile.avgResponseLength} words\n`;
  }

  if (profile.greetingStyle) {
    context += `Typical Greeting: "${profile.greetingStyle}"\n`;
  }

  if (profile.signoffStyle) {
    context += `Typical Sign-off: "${profile.signoffStyle}"\n`;
  }

  if (profile.commonPhrases && profile.commonPhrases.length > 0) {
    context += `Common Phrases: ${profile.commonPhrases.slice(0, 10).join(", ")}\n`;
  }

  if (profile.sampleEmails && profile.sampleEmails.length > 0) {
    context += `\nSample Past Emails (for tone reference):\n`;
    profile.sampleEmails.slice(0, 3).forEach((sample, idx) => {
      context += `\n[Sample ${idx + 1}]\n`;
      context += `Subject: ${sample.subject}\n`;
      context += `${sample.body.slice(0, 300)}${sample.body.length > 300 ? "..." : ""}\n`;
    });
  }

  return context;
}

/**
 * Parses JSON response from LLM, with error handling.
 */
function parseJsonResponse<T>(rawText: string): T {
  try {
    // Try to extract JSON if it's wrapped in markdown code blocks
    const jsonMatch = rawText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
    const jsonText = jsonMatch ? jsonMatch[1] : rawText;
    return JSON.parse(jsonText.trim());
  } catch (error) {
    throw new Error(`Failed to parse JSON response: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Computes priority level based on intent and urgency signals.
 */
function computePriority(
  intent: EmailIntent,
  hasDeadline: boolean,
  urgencyKeywords: boolean
): PriorityLevel {
  if (intent === "URGENT_REQUEST" || urgencyKeywords) return "critical";
  if (intent === "MEETING_SCHEDULE" || intent === "PROJECT_APPROVAL") {
    return hasDeadline ? "high" : "medium";
  }
  if (intent === "COMPLAINT_ISSUE") return "high";
  if (intent === "INFORMATION_QUERY" || intent === "STATUS_UPDATE") return "medium";
  if (intent === "AUTOMATED_NOTIFICATION") return "minimal";
  return "low";
}

/**
 * Detects urgency keywords in email body and subject.
 */
function detectUrgency(subject: string, body: string): boolean {
  const urgencyPatterns = [
    /urgent/i,
    /asap/i,
    /immediately/i,
    /emergency/i,
    /critical/i,
    /time.?sensitive/i,
    /deadline/i,
    /by end of (day|week)/i,
    /need.*(today|tomorrow|now)/i,
  ];
  const combined = `${subject} ${body}`;
  return urgencyPatterns.some((pattern) => pattern.test(combined));
}

// ─── Main API Functions ───────────────────────────────────────────────────────

/**
 * Analyzes an incoming email to classify its intent and extract relevant metadata.
 *
 * @param email       The email metadata to analyze.
 * @param config      Optional configuration overrides.
 * @returns           Comprehensive intent analysis result.
 *
 * @throws {Error}    When API keys are missing or LLM call fails.
 */
export async function classifyIntent(
  email: EmailMetadata,
  config: IntentRecognitionConfig = {}
): Promise<IntentAnalysisResult> {
  const provider = config.provider ?? DEFAULT_PROVIDER;
  const temperature = config.temperature ?? DEFAULT_TEMPERATURE;

  validateConfig(provider);

  const emailContext = buildEmailContext(email);
  const urgencyDetected = detectUrgency(email.subject, email.body);

  const userPrompt = `${INTENT_CLASSIFICATION_PROMPT}\n\nEmail to analyze:\n${emailContext}`;

  let rawResponse: string;
  const t0 = Date.now();

  if (provider === "anthropic") {
    const model = config.model ?? DEFAULT_ANTHROPIC_MODEL;
    const result = await generateText({
      model: anthropic(model),
      prompt: userPrompt,
      temperature,
    });
    rawResponse = result.text;
  } else {
    const model = config.model ?? DEFAULT_OPENAI_MODEL;
    const client = new OpenAI({ apiKey: process.env["OPENAI_API_KEY"] });
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: "You are an expert email intent classifier." },
        { role: "user", content: userPrompt },
      ],
      temperature,
      max_tokens: 1000,
    });
    rawResponse = completion.choices[0]?.message?.content ?? "";
  }

  const latencyMs = Date.now() - t0;

  if (!rawResponse.trim()) {
    throw new Error("IntentRecognition: LLM returned empty response");
  }

  const parsed = parseJsonResponse<{
    intent: EmailIntent;
    confidence: number;
    priority: PriorityLevel;
    detectedTone: CommunicationTone;
    recommendedTone: CommunicationTone;
    actions: ExtractedAction[];
    entities: Record<string, string[]>;
    summary: string;
    responseTrajectory: string;
    estimatedResponseTime: number;
    tags: string[];
  }>(rawResponse);

  // Override priority if urgency was detected
  const finalPriority = urgencyDetected && parsed.priority === "low" ? "high" : parsed.priority;

  return {
    ...parsed,
    priority: finalPriority,
  };
}

/**
 * Generates a contextual draft response based on email analysis and user profile.
 *
 * @param context    The response context including email, analysis, and user profile.
 * @param config     Optional configuration overrides.
 * @returns          Generated draft response with metadata.
 *
 * @throws {Error}   When API keys are missing or LLM call fails.
 */
export async function generateResponseDraft(
  context: ResponseContext,
  config: IntentRecognitionConfig = {}
): Promise<DraftResponse> {
  const provider = config.provider ?? DEFAULT_PROVIDER;
  const temperature = config.temperature ?? DEFAULT_TEMPERATURE;
  const maxTokens = config.maxDraftTokens ?? DEFAULT_MAX_DRAFT_TOKENS;

  validateConfig(provider);

  const emailContext = buildEmailContext(context.email);
  const userStyleContext = buildUserStyleContext(context.userProfile);
  const analysisContext = `
Intent: ${context.analysis.intent}
Priority: ${context.analysis.priority}
Detected Tone: ${context.analysis.detectedTone}
Recommended Tone: ${context.analysis.recommendedTone}
Summary: ${context.analysis.summary}
Response Trajectory: ${context.analysis.responseTrajectory}
Actions to Address: ${context.analysis.actions.map((a) => a.action).join("; ")}
`;

  let userPrompt = `${RESPONSE_GENERATION_SYSTEM_PROMPT}\n\n`;
  userPrompt += `${userStyleContext}\n\n`;
  userPrompt += `Email Analysis:\n${analysisContext}\n\n`;
  userPrompt += `Original Email:\n${emailContext}\n\n`;

  if (context.additionalInstructions) {
    userPrompt += `Additional Instructions: ${context.additionalInstructions}\n\n`;
  }

  userPrompt += `Generate a complete email response that addresses the original email appropriately, matching the user's communication style and using the recommended tone: ${context.analysis.recommendedTone}.`;

  let rawResponse: string;
  let model: string;
  const t0 = Date.now();

  if (provider === "anthropic") {
    model = config.model ?? DEFAULT_ANTHROPIC_MODEL;
    const result = await generateText({
      model: anthropic(model),
      prompt: userPrompt,
      temperature,
    });
    rawResponse = result.text;
  } else {
    model = config.model ?? DEFAULT_OPENAI_MODEL;
    const client = new OpenAI({ apiKey: process.env["OPENAI_API_KEY"] });
    const completion = await client.chat.completions.create({
      model,
      messages: [{ role: "user", content: userPrompt }],
      temperature,
      max_tokens: maxTokens,
    });
    rawResponse = completion.choices[0]?.message?.content ?? "";
  }

  const latencyMs = Date.now() - t0;

  if (!rawResponse.trim()) {
    throw new Error("IntentRecognition: Draft generation returned empty response");
  }

  // Generate alternatives if enabled
  let alternatives: AlternativeDraft[] | undefined;
  if (config.enableAlternatives) {
    const numAlts = config.numAlternatives ?? DEFAULT_NUM_ALTERNATIVES;
    alternatives = await generateAlternativeDrafts(
      context,
      rawResponse,
      numAlts,
      provider,
      model,
      temperature,
      maxTokens
    );
  }

  return {
    subject: `Re: ${context.email.subject}`,
    body: rawResponse.trim(),
    tone: context.analysis.recommendedTone,
    confidence: context.analysis.confidence,
    model,
    latencyMs,
    alternatives,
  };
}

/**
 * Generates alternative draft variations with different tones.
 */
async function generateAlternativeDrafts(
  context: ResponseContext,
  originalDraft: string,
  count: number,
  provider: "openai" | "anthropic",
  model: string,
  temperature: number,
  maxTokens: number
): Promise<AlternativeDraft[]> {
  const alternatives: AlternativeDraft[] = [];
  const toneVariations: CommunicationTone[] = ["professional", "casual", "assertive"];

  for (let i = 0; i < Math.min(count, toneVariations.length); i++) {
    const altTone = toneVariations[i];
    if (altTone === context.analysis.recommendedTone) continue;

    const prompt = `Rewrite the following email draft using a ${altTone} tone while maintaining the same core message and addressing all points:\n\nOriginal Draft:\n${originalDraft}\n\nRewrite with ${altTone} tone:`;

    let rawResponse: string;

    if (provider === "anthropic") {
      const result = await generateText({
        model: anthropic(model),
        prompt,
        temperature: temperature + 0.2,
      });
      rawResponse = result.text;
    } else {
      const client = new OpenAI({ apiKey: process.env["OPENAI_API_KEY"] });
      const completion = await client.chat.completions.create({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: temperature + 0.2,
        max_tokens: maxTokens,
      });
      rawResponse = completion.choices[0]?.message?.content ?? "";
    }

    if (rawResponse.trim()) {
      alternatives.push({
        body: rawResponse.trim(),
        tone: altTone,
        confidence: context.analysis.confidence * 0.85,
      });
    }
  }

  return alternatives;
}

/**
 * Analyzes an email thread to extract conversation context and flow.
 *
 * @param threadMessages   Array of messages in the thread (chronological order).
 * @param currentEmail     The most recent email being analyzed.
 * @returns                Structured thread analysis with key insights.
 */
export async function analyzeThread(
  threadMessages: EmailMessage[],
  currentEmail: EmailMetadata
): Promise<ThreadAnalysis> {
  const participants = new Set<string>();
  const topics = new Set<string>();
  let totalMessages = threadMessages.length;

  threadMessages.forEach((msg) => {
    participants.add(msg.from);
  });

  // Extract conversation flow
  const conversationFlow: ConversationTurn[] = threadMessages.map((msg, idx) => ({
    turnNumber: idx + 1,
    from: msg.from,
    timestamp: msg.timestamp,
    isFromUser: msg.isFromUser,
    summary: msg.body.slice(0, 150) + (msg.body.length > 150 ? "..." : ""),
  }));

  // Identify if this is a new thread or continuation
  const isNewThread = totalMessages === 0;
  const requiresResponse = !currentEmail.from.includes("noreply") &&
                          !currentEmail.from.includes("notification");

  return {
    threadId: currentEmail.threadId ?? currentEmail.emailId,
    totalMessages,
    participants: Array.from(participants),
    conversationFlow,
    topics: Array.from(topics),
    isNewThread,
    requiresResponse,
    lastResponseFrom: threadMessages.length > 0 ? threadMessages[threadMessages.length - 1].from : undefined,
  };
}

/**
 * Thread analysis result structure.
 */
export interface ThreadAnalysis {
  threadId: string;
  totalMessages: number;
  participants: string[];
  conversationFlow: ConversationTurn[];
  topics: string[];
  isNewThread: boolean;
  requiresResponse: boolean;
  lastResponseFrom?: string;
}

/**
 * Individual turn in conversation flow.
 */
export interface ConversationTurn {
  turnNumber: number;
  from: string;
  timestamp: string;
  isFromUser: boolean;
  summary: string;
}

/**
 * Extracts structured action items from email body using NLP.
 *
 * @param emailBody    The email body text.
 * @param config       Optional configuration.
 * @returns            Array of extracted action items.
 */
export async function extractActionItems(
  emailBody: string,
  config: IntentRecognitionConfig = {}
): Promise<ExtractedAction[]> {
  const provider = config.provider ?? DEFAULT_PROVIDER;
  validateConfig(provider);

  const prompt = `Analyze the following email and extract all action items, tasks, or commitments mentioned. For each action, identify:
1. The action/task description
2. Any deadline mentioned
3. Who is responsible (if specified)
4. Your confidence in this extraction (0-1)

Return ONLY a JSON array of objects with fields: action, deadline, assignee, confidence.

Email:
${emailBody}`;

  let rawResponse: string;

  if (provider === "anthropic") {
    const result = await generateText({
      model: anthropic(DEFAULT_ANTHROPIC_MODEL),
      prompt,
      temperature: 0.2,
    });
    rawResponse = result.text;
  } else {
    const client = new OpenAI({ apiKey: process.env["OPENAI_API_KEY"] });
    const completion = await client.chat.completions.create({
      model: DEFAULT_OPENAI_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 500,
    });
    rawResponse = completion.choices[0]?.message?.content ?? "[]";
  }

  try {
    const actions = parseJsonResponse<ExtractedAction[]>(rawResponse);
    return actions.filter((a) => a.action && a.action.trim().length > 0);
  } catch {
    return [];
  }
}

/**
 * Builds a user historical profile from past sent emails.
 *
 * @param userEmail       User's email address.
 * @param sentEmails      Array of past emails sent by the user.
 * @returns               Constructed user profile for tone matching.
 */
export function buildUserProfile(
  userEmail: string,
  sentEmails: EmailMessage[]
): UserHistoricalProfile {
  const sampleEmails = sentEmails.slice(0, 10);
  const commonPhrases = extractCommonPhrases(sentEmails);
  const avgLength = calculateAverageLength(sentEmails);
  const formality = estimateFormalityLevel(sentEmails);
  const greetings = extractGreetingStyle(sentEmails);
  const signoffs = extractSignoffStyle(sentEmails);

  return {
    userEmail,
    sampleEmails,
    commonPhrases,
    greetingStyle: greetings[0],
    signoffStyle: signoffs[0],
    avgResponseLength: avgLength,
    formalityLevel: formality,
  };
}

/**
 * Extracts common phrases from user's past emails.
 */
function extractCommonPhrases(emails: EmailMessage[]): string[] {
  const allText = emails.map((e) => e.body).join(" ");
  const sentences = allText.split(/[.!?]+/).map((s) => s.trim()).filter((s) => s.length > 10);

  // Simple frequency analysis (in production, use more sophisticated NLP)
  const phraseMap = new Map<string, number>();
  sentences.forEach((s) => {
    if (s.length < 100) {
      phraseMap.set(s, (phraseMap.get(s) ?? 0) + 1);
    }
  });

  return Array.from(phraseMap.entries())
    .filter(([_, count]) => count > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([phrase]) => phrase);
}

/**
 * Calculates average email length in words.
 */
function calculateAverageLength(emails: EmailMessage[]): number {
  if (emails.length === 0) return 150;
  const totalWords = emails.reduce((sum, e) => sum + e.body.split(/\s+/).length, 0);
  return Math.round(totalWords / emails.length);
}

/**
 * Estimates formality level based on language patterns.
 */
function estimateFormalityLevel(emails: EmailMessage[]): number {
  if (emails.length === 0) return 3;

  const allText = emails.map((e) => e.body.toLowerCase()).join(" ");

  const formalIndicators = [
    "sincerely", "regards", "respectfully", "kindly", "pleased", "grateful",
    "pursuant", "furthermore", "however", "additionally"
  ];

  const casualIndicators = [
    "hey", "thanks", "awesome", "cool", "yeah", "sure", "got it", "no worries",
    "btw", "fyi", "asap", "lol"
  ];

  let formalCount = 0;
  let casualCount = 0;

  formalIndicators.forEach((word) => {
    formalCount += (allText.match(new RegExp(`\\b${word}\\b`, "g")) || []).length;
  });

  casualIndicators.forEach((word) => {
    casualCount += (allText.match(new RegExp(`\\b${word}\\b`, "g")) || []).length;
  });

  if (formalCount === 0 && casualCount === 0) return 3;
  const ratio = formalCount / (formalCount + casualCount);
  return Math.round(1 + ratio * 4); // Scale to 1-5
}

/**
 * Extracts common greeting patterns.
 */
function extractGreetingStyle(emails: EmailMessage[]): string[] {
  const greetingPatterns = [
    /^(Hi|Hello|Hey|Dear|Good morning|Good afternoon)\s+[\w\s,]+/im,
  ];

  const greetings = new Set<string>();
  emails.forEach((email) => {
    const firstLine = email.body.split("\n")[0];
    greetingPatterns.forEach((pattern) => {
      const match = firstLine?.match(pattern);
      if (match) {
        greetings.add(match[0].trim());
      }
    });
  });

  return Array.from(greetings).slice(0, 5);
}

/**
 * Extracts common sign-off patterns.
 */
function extractSignoffStyle(emails: EmailMessage[]): string[] {
  const signoffPatterns = [
    /\n(Best|Best regards|Regards|Sincerely|Thanks|Thank you|Cheers|Talk soon),?\s*$/im,
  ];

  const signoffs = new Set<string>();
  emails.forEach((email) => {
    const lastParagraph = email.body.split("\n").slice(-3).join("\n");
    signoffPatterns.forEach((pattern) => {
      const match = lastParagraph.match(pattern);
      if (match) {
        signoffs.add(match[1].trim());
      }
    });
  });

  return Array.from(signoffs).slice(0, 5);
}
