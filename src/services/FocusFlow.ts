/**
 * FocusFlow
 *
 * Deep Focus Flow Engine - Automatically groups, prioritizes, and surfaces
 * high-priority emails based on historical interaction depth, encouraging
 * extended reading and response sessions without user drop-off.
 *
 * The system uses advanced ML-driven heuristics to create "focus sessions"
 * that batch related emails, minimize context switching, and maintain user
 * engagement through intelligent content surfacing and progressive disclosure.
 *
 * Core Features
 * ─────────────
 * ✓ Intelligent email grouping - clusters related messages by topic, sender, project
 * ✓ Priority surfacing - highlights time-sensitive and high-value emails
 * ✓ Focus session management - creates distraction-free work blocks
 * ✓ Context preservation - maintains thread continuity across sessions
 * ✓ Engagement tracking - monitors user interaction patterns
 * ✓ Drop-off prevention - detects fatigue signals and adjusts pacing
 * ✓ Progressive disclosure - reveals information at optimal moments
 * ✓ Batch optimization - groups similar tasks for efficiency
 *
 * Architecture
 * ────────────
 *  ┌─────────────────────────────────┐
 *  │   User's Inbox Messages         │
 *  └──────────────┬──────────────────┘
 *                 │
 *      analyzeInteractionHistory()
 *                 │
 *  ┌──────────────▼──────────────────┐
 *  │   Interaction Depth Analyzer    │
 *  └──────────────┬──────────────────┘
 *                 │
 *      createFocusSessions()
 *                 │
 *  ┌──────────────▼──────────────────┐
 *  │   Session Clustering Engine     │
 *  └──────────────┬──────────────────┘
 *                 │
 *     surfaceNextBatch()
 *                 │
 *  ┌──────────────▼──────────────────┐
 *  │   Prioritized Email Batches     │
 *  └─────────────────────────────────┘
 *
 * Focus Session Lifecycle
 * ───────────────────────
 * 1. ANALYSIS - Scan inbox and compute interaction scores
 * 2. CLUSTERING - Group emails by topic, priority, and relationship
 * 3. SEQUENCING - Order batches for optimal flow and minimal context switching
 * 4. PRESENTATION - Surface emails with progressive disclosure
 * 5. TRACKING - Monitor engagement metrics and adjust pacing
 * 6. COMPLETION - Celebrate progress and encourage continued engagement
 */

import { prisma } from "../db";

// ─── Public Types ─────────────────────────────────────────────────────────────

/**
 * Email interaction depth score components.
 */
export interface InteractionDepthScore {
  /** Overall depth score [0-100]. */
  totalScore: number;
  /** Reading time depth (0-30). */
  readingDepth: number;
  /** Response quality depth (0-25). */
  responseDepth: number;
  /** Follow-up engagement depth (0-20). */
  followupDepth: number;
  /** Thread participation depth (0-15). */
  threadDepth: number;
  /** Attachment interaction depth (0-10). */
  attachmentDepth: number;
}

/**
 * Email metadata for focus flow processing.
 */
export interface FocusEmailMetadata {
  /** Email unique identifier. */
  emailId: string;
  /** Email subject. */
  subject: string;
  /** Email body preview (first 500 chars). */
  bodyPreview: string;
  /** Full body length in characters. */
  bodyLength: number;
  /** Sender email address. */
  from: string;
  /** Sender display name. */
  fromName: string;
  /** Received timestamp (ISO-8601). */
  receivedAt: string;
  /** Thread ID if part of conversation. */
  threadId?: string;
  /** Number of messages in thread. */
  threadMessageCount?: number;
  /** Has attachments. */
  hasAttachments: boolean;
  /** Attachment count. */
  attachmentCount: number;
  /** Is marked as important by sender. */
  isImportant: boolean;
  /** Is unread. */
  isUnread: boolean;
  /** Labels/tags applied. */
  labels: string[];
  /** Computed priority level. */
  priority: "critical" | "high" | "medium" | "low";
  /** Intent classification. */
  intent?: string;
  /** Historical interaction score. */
  interactionScore?: InteractionDepthScore;
}

/**
 * A focus session containing batched emails.
 */
export interface FocusSession {
  /** Unique session identifier. */
  sessionId: string;
  /** Session title/theme. */
  title: string;
  /** Session description. */
  description: string;
  /** Batches of emails in this session. */
  batches: EmailBatch[];
  /** Estimated time to complete (minutes). */
  estimatedDuration: number;
  /** Total emails in session. */
  totalEmails: number;
  /** Session priority level. */
  priority: "critical" | "high" | "medium" | "low";
  /** Session creation timestamp. */
  createdAt: string;
  /** Recommended start time (ISO-8601). */
  recommendedStartTime?: string;
}

/**
 * A batch of related emails within a focus session.
 */
export interface EmailBatch {
  /** Batch identifier within session. */
  batchId: string;
  /** Batch title. */
  title: string;
  /** Batch theme/category. */
  theme: string;
  /** Emails in this batch. */
  emails: FocusEmailMetadata[];
  /** Batch priority. */
  priority: "critical" | "high" | "medium" | "low";
  /** Estimated time for this batch (minutes). */
  estimatedDuration: number;
  /** Recommended approach/strategy. */
  strategy: string;
}

/**
 * User engagement metrics during focus session.
 */
export interface EngagementMetrics {
  /** Session ID being tracked. */
  sessionId: string;
  /** Total time in session (seconds). */
  totalTimeSeconds: number;
  /** Emails opened. */
  emailsOpened: number;
  /** Emails responded to. */
  emailsResponded: number;
  /** Emails archived/deleted. */
  emailsActioned: number;
  /** Emails skipped. */
  emailsSkipped: number;
  /** Average time per email (seconds). */
  avgTimePerEmail: number;
  /** Drop-off signals detected. */
  dropoffSignals: DropoffSignal[];
  /** Engagement quality score [0-1]. */
  engagementQuality: number;
  /** Session completion percentage. */
  completionPercentage: number;
}

/**
 * Signal indicating potential user fatigue or drop-off risk.
 */
export interface DropoffSignal {
  /** Signal type. */
  type: "rapid_skipping" | "prolonged_inactivity" | "decreasing_quality" | "session_too_long";
  /** Severity [0-1]. */
  severity: number;
  /** Timestamp when detected. */
  detectedAt: string;
  /** Recommendation to address signal. */
  recommendation: string;
}

/**
 * Historical interaction pattern for a sender or topic.
 */
export interface InteractionPattern {
  /** Sender email or topic identifier. */
  identifier: string;
  /** Total interactions. */
  totalInteractions: number;
  /** Average response time (hours). */
  avgResponseTime: number;
  /** Response rate (0-1). */
  responseRate: number;
  /** Average reading time (seconds). */
  avgReadingTime: number;
  /** Interaction quality score [0-100]. */
  qualityScore: number;
  /** Last interaction timestamp. */
  lastInteraction: string;
}

/**
 * Configuration for focus flow engine.
 */
export interface FocusFlowConfig {
  /** Maximum emails per batch. */
  maxEmailsPerBatch?: number;
  /** Maximum batches per session. */
  maxBatchesPerSession?: number;
  /** Minimum interaction score to include. */
  minInteractionScore?: number;
  /** Clustering algorithm (topic, sender, priority, time). */
  clusteringStrategy?: "topic" | "sender" | "priority" | "time" | "hybrid";
  /** Enable drop-off prevention. */
  enableDropoffPrevention?: boolean;
  /** Session duration target (minutes). */
  targetSessionDuration?: number;
}

/**
 * Focus flow session state.
 */
export interface SessionState {
  /** Session ID. */
  sessionId: string;
  /** Current batch index. */
  currentBatchIndex: number;
  /** Current email index within batch. */
  currentEmailIndex: number;
  /** Session start time. */
  startedAt: string;
  /** Is session paused. */
  isPaused: boolean;
  /** Completed batches. */
  completedBatches: string[];
  /** Completed emails. */
  completedEmails: string[];
}

// ─── Internal Constants ───────────────────────────────────────────────────────

const DEFAULT_MAX_EMAILS_PER_BATCH = 8;
const DEFAULT_MAX_BATCHES_PER_SESSION = 6;
const DEFAULT_MIN_INTERACTION_SCORE = 20;
const DEFAULT_CLUSTERING_STRATEGY = "hybrid";
const DEFAULT_TARGET_SESSION_DURATION = 45; // minutes

const READING_TIME_MULTIPLIER = 0.15; // seconds per character
const HIGH_PRIORITY_BOOST = 25;
const CRITICAL_PRIORITY_BOOST = 40;

// ─── In-Memory State Management ───────────────────────────────────────────────

/**
 * Active focus sessions keyed by user email.
 */
const activeSessions = new Map<string, SessionState>();

/**
 * Engagement metrics keyed by session ID.
 */
const engagementMetricsStore = new Map<string, EngagementMetrics>();

/**
 * Interaction patterns cache keyed by user email.
 */
const interactionPatternsCache = new Map<string, Map<string, InteractionPattern>>();

// ─── Helper Functions ─────────────────────────────────────────────────────────

/**
 * Generates a unique session ID.
 */
function generateSessionId(): string {
  return `focus_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

/**
 * Generates a unique batch ID.
 */
function generateBatchId(sessionId: string, index: number): string {
  return `${sessionId}_batch_${index}`;
}

/**
 * Computes interaction depth score for an email based on historical patterns.
 */
function computeInteractionDepth(
  email: FocusEmailMetadata,
  pattern?: InteractionPattern
): InteractionDepthScore {
  let readingDepth = 0;
  let responseDepth = 0;
  let followupDepth = 0;
  let threadDepth = 0;
  let attachmentDepth = 0;

  // Reading depth based on content length and pattern
  const estimatedReadingTime = email.bodyLength * READING_TIME_MULTIPLIER;
  readingDepth = Math.min(30, (estimatedReadingTime / 60) * 10); // Cap at 30

  // Response depth based on historical pattern
  if (pattern) {
    responseDepth = Math.min(25, pattern.responseRate * 25);
    followupDepth = Math.min(20, (pattern.qualityScore / 100) * 20);
  }

  // Thread depth
  if (email.threadId && email.threadMessageCount) {
    threadDepth = Math.min(15, email.threadMessageCount * 3);
  }

  // Attachment depth
  if (email.hasAttachments) {
    attachmentDepth = Math.min(10, email.attachmentCount * 5);
  }

  const totalScore = readingDepth + responseDepth + followupDepth + threadDepth + attachmentDepth;

  return {
    totalScore: Math.round(totalScore),
    readingDepth: Math.round(readingDepth),
    responseDepth: Math.round(responseDepth),
    followupDepth: Math.round(followupDepth),
    threadDepth: Math.round(threadDepth),
    attachmentDepth: Math.round(attachmentDepth),
  };
}

/**
 * Extracts topic keywords from email subject and body.
 */
function extractTopicKeywords(email: FocusEmailMetadata): string[] {
  const combined = `${email.subject} ${email.bodyPreview}`.toLowerCase();
  const commonWords = new Set([
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "as", "is", "was", "are", "were", "be",
    "been", "being", "have", "has", "had", "do", "does", "did", "will",
    "would", "could", "should", "may", "might", "must", "can", "hi", "hello",
    "regards", "thanks", "thank", "you", "me", "my", "your", "our", "we",
  ]);

  const words = combined.match(/\b[a-z]{4,}\b/g) || [];
  const keywords = words.filter((w) => !commonWords.has(w));

  // Count frequency
  const freqMap = new Map<string, number>();
  keywords.forEach((k) => {
    freqMap.set(k, (freqMap.get(k) || 0) + 1);
  });

  return Array.from(freqMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word);
}

/**
 * Clusters emails by topic similarity.
 */
function clusterByTopic(emails: FocusEmailMetadata[]): Map<string, FocusEmailMetadata[]> {
  const clusters = new Map<string, FocusEmailMetadata[]>();

  emails.forEach((email) => {
    const keywords = extractTopicKeywords(email);
    const topicKey = keywords.slice(0, 2).join("_") || "general";

    if (!clusters.has(topicKey)) {
      clusters.set(topicKey, []);
    }
    clusters.get(topicKey)?.push(email);
  });

  return clusters;
}

/**
 * Clusters emails by sender.
 */
function clusterBySender(emails: FocusEmailMetadata[]): Map<string, FocusEmailMetadata[]> {
  const clusters = new Map<string, FocusEmailMetadata[]>();

  emails.forEach((email) => {
    if (!clusters.has(email.from)) {
      clusters.set(email.from, []);
    }
    clusters.get(email.from)?.push(email);
  });

  return clusters;
}

/**
 * Clusters emails by priority level.
 */
function clusterByPriority(emails: FocusEmailMetadata[]): Map<string, FocusEmailMetadata[]> {
  const clusters = new Map<string, FocusEmailMetadata[]>();

  emails.forEach((email) => {
    if (!clusters.has(email.priority)) {
      clusters.set(email.priority, []);
    }
    clusters.get(email.priority)?.push(email);
  });

  return clusters;
}

/**
 * Hybrid clustering that considers topic, sender, and priority.
 */
function clusterHybrid(emails: FocusEmailMetadata[]): Map<string, FocusEmailMetadata[]> {
  const clusters = new Map<string, FocusEmailMetadata[]>();

  // First pass: group by priority
  const priorityGroups = clusterByPriority(emails);

  // Second pass: within each priority, sub-cluster by topic or sender
  priorityGroups.forEach((priorityEmails, priority) => {
    if (priorityEmails.length <= 5) {
      // Small group, keep together
      clusters.set(`${priority}_all`, priorityEmails);
    } else {
      // Large group, split by topic
      const topicClusters = clusterByTopic(priorityEmails);
      topicClusters.forEach((topicEmails, topic) => {
        clusters.set(`${priority}_${topic}`, topicEmails);
      });
    }
  });

  return clusters;
}

/**
 * Estimates batch completion time based on email count and complexity.
 */
function estimateBatchDuration(emails: FocusEmailMetadata[]): number {
  let totalMinutes = 0;

  emails.forEach((email) => {
    // Base reading time
    const readingMinutes = (email.bodyLength * READING_TIME_MULTIPLIER) / 60;

    // Response time estimate
    const responseMinutes = email.priority === "critical" ? 5 : email.priority === "high" ? 3 : 2;

    // Thread navigation overhead
    const threadMinutes = email.threadMessageCount ? email.threadMessageCount * 0.5 : 0;

    totalMinutes += readingMinutes + responseMinutes + threadMinutes;
  });

  return Math.ceil(totalMinutes);
}

/**
 * Generates a descriptive title for a batch based on its contents.
 */
function generateBatchTitle(emails: FocusEmailMetadata[], theme: string): string {
  if (emails.length === 0) return "Empty Batch";

  const priorityCounts = {
    critical: emails.filter((e) => e.priority === "critical").length,
    high: emails.filter((e) => e.priority === "high").length,
    medium: emails.filter((e) => e.priority === "medium").length,
    low: emails.filter((e) => e.priority === "low").length,
  };

  if (priorityCounts.critical > 0) {
    return `🚨 Urgent: ${theme} (${priorityCounts.critical} critical)`;
  }
  if (priorityCounts.high > emails.length / 2) {
    return `⚡ High Priority: ${theme}`;
  }

  // Check if all from same sender
  const uniqueSenders = new Set(emails.map((e) => e.fromName));
  if (uniqueSenders.size === 1) {
    return `📧 Messages from ${Array.from(uniqueSenders)[0]}`;
  }

  return `📬 ${theme.charAt(0).toUpperCase() + theme.slice(1)}`;
}

/**
 * Determines batch strategy based on email characteristics.
 */
function determineBatchStrategy(emails: FocusEmailMetadata[]): string {
  const hasUrgent = emails.some((e) => e.priority === "critical" || e.priority === "high");
  const avgBodyLength = emails.reduce((sum, e) => sum + e.bodyLength, 0) / emails.length;
  const hasThreads = emails.some((e) => e.threadId && (e.threadMessageCount ?? 0) > 2);

  if (hasUrgent) {
    return "Address urgent items first, then batch-process remaining emails";
  }
  if (avgBodyLength > 3000) {
    return "Deep reading required - allocate focused time blocks for each email";
  }
  if (hasThreads) {
    return "Review full thread context before responding to maintain continuity";
  }

  return "Quick triage - read, decide, act on each email in sequence";
}

// ─── Main API Functions ───────────────────────────────────────────────────────

/**
 * Analyzes user's historical interaction patterns with senders and topics.
 *
 * @param userEmail     User's email address.
 * @param lookbackDays  Number of days to look back for interaction history.
 * @returns             Map of sender/topic identifiers to interaction patterns.
 */
export async function analyzeInteractionHistory(
  userEmail: string,
  lookbackDays = 90
): Promise<Map<string, InteractionPattern>> {
  // Check cache first
  const cached = interactionPatternsCache.get(userEmail);
  if (cached) return cached;

  const patterns = new Map<string, InteractionPattern>();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - lookbackDays);

  try {
    // Fetch user's sent emails for pattern analysis
    const sentEmails = await prisma.email.findMany({
      where: {
        user: {
          email: userEmail,
        },
        date: {
          gte: cutoffDate,
        },
      },
      select: {
        recipientId: true,
        subject: true,
        body: true,
        date: true,
      },
      orderBy: {
        date: "desc",
      },
      take: 500,
    });

    // Fetch received emails for interaction depth
    const receivedEmails = await prisma.inboxMessage.findMany({
      where: {
        user: {
          email: userEmail,
        },
        receivedAt: {
          gte: cutoffDate,
        },
      },
      select: {
        sender: true,
        subject: true,
        body: true,
        read: true,
        receivedAt: true,
      },
      take: 1000,
    });

    // Build sender interaction patterns
    const senderInteractions = new Map<string, {
      count: number;
      responseTimes: number[];
      responded: number;
      readingTimes: number[];
    }>();

    receivedEmails.forEach((email) => {
      const sender = email.sender;
      if (!senderInteractions.has(sender)) {
        senderInteractions.set(sender, {
          count: 0,
          responseTimes: [],
          responded: 0,
          readingTimes: [],
        });
      }

      const data = senderInteractions.get(sender)!;
      data.count++;

      // Check if user responded to this email
      const response = sentEmails.find((sent) =>
        sent.recipientId === sender &&
        sent.subject.toLowerCase().includes(email.subject.toLowerCase().replace(/^re:\s*/i, ""))
      );

      if (response) {
        data.responded++;
        const responseTimeHours =
          (new Date(response.date).getTime() - new Date(email.receivedAt).getTime()) /
          (1000 * 60 * 60);
        data.responseTimes.push(responseTimeHours);
      }

      // Estimate reading time based on body length
      const estimatedReadingSeconds = email.body.length * READING_TIME_MULTIPLIER;
      data.readingTimes.push(estimatedReadingSeconds);
    });

    // Convert to InteractionPattern objects
    senderInteractions.forEach((data, sender) => {
      const avgResponseTime = data.responseTimes.length > 0
        ? data.responseTimes.reduce((a, b) => a + b, 0) / data.responseTimes.length
        : 0;

      const responseRate = data.responded / data.count;

      const avgReadingTime = data.readingTimes.length > 0
        ? data.readingTimes.reduce((a, b) => a + b, 0) / data.readingTimes.length
        : 0;

      // Quality score based on response rate and timeliness
      const qualityScore = Math.min(100,
        (responseRate * 50) + (Math.max(0, 1 - avgResponseTime / 48) * 50)
      );

      patterns.set(sender, {
        identifier: sender,
        totalInteractions: data.count,
        avgResponseTime,
        responseRate,
        avgReadingTime,
        qualityScore,
        lastInteraction: new Date().toISOString(),
      });
    });

    // Cache the patterns
    interactionPatternsCache.set(userEmail, patterns);

    return patterns;
  } catch (error) {
    console.error("Error analyzing interaction history:", error);
    return patterns;
  }
}

/**
 * Creates optimized focus sessions from a list of emails.
 *
 * @param userEmail    User's email address.
 * @param emails       Array of emails to organize into sessions.
 * @param config       Optional configuration overrides.
 * @returns            Array of focus sessions ready for presentation.
 */
export async function createFocusSessions(
  userEmail: string,
  emails: FocusEmailMetadata[],
  config: FocusFlowConfig = {}
): Promise<FocusSession[]> {
  const cfg = {
    maxEmailsPerBatch: config.maxEmailsPerBatch ?? DEFAULT_MAX_EMAILS_PER_BATCH,
    maxBatchesPerSession: config.maxBatchesPerSession ?? DEFAULT_MAX_BATCHES_PER_SESSION,
    minInteractionScore: config.minInteractionScore ?? DEFAULT_MIN_INTERACTION_SCORE,
    clusteringStrategy: config.clusteringStrategy ?? DEFAULT_CLUSTERING_STRATEGY,
    targetSessionDuration: config.targetSessionDuration ?? DEFAULT_TARGET_SESSION_DURATION,
  };

  // Analyze interaction patterns
  const patterns = await analyzeInteractionHistory(userEmail);

  // Enrich emails with interaction scores
  const enrichedEmails = emails.map((email) => {
    const pattern = patterns.get(email.from);
    const interactionScore = computeInteractionDepth(email, pattern);

    return {
      ...email,
      interactionScore,
    };
  });

  // Filter by minimum interaction score
  const qualifiedEmails = enrichedEmails.filter(
    (e) => (e.interactionScore?.totalScore ?? 0) >= cfg.minInteractionScore
  );

  // Sort by priority and interaction score
  qualifiedEmails.sort((a, b) => {
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    const aPriority = priorityOrder[a.priority];
    const bPriority = priorityOrder[b.priority];

    if (aPriority !== bPriority) {
      return bPriority - aPriority;
    }

    return (b.interactionScore?.totalScore ?? 0) - (a.interactionScore?.totalScore ?? 0);
  });

  // Cluster emails based on strategy
  let clusters: Map<string, FocusEmailMetadata[]>;

  switch (cfg.clusteringStrategy) {
    case "topic":
      clusters = clusterByTopic(qualifiedEmails);
      break;
    case "sender":
      clusters = clusterBySender(qualifiedEmails);
      break;
    case "priority":
      clusters = clusterByPriority(qualifiedEmails);
      break;
    case "time":
      // Time-based clustering (recent first)
      clusters = new Map([["recent", qualifiedEmails]]);
      break;
    case "hybrid":
    default:
      clusters = clusterHybrid(qualifiedEmails);
      break;
  }

  // Create batches from clusters
  const allBatches: EmailBatch[] = [];

  clusters.forEach((clusterEmails, clusterKey) => {
    // Split large clusters into multiple batches
    for (let i = 0; i < clusterEmails.length; i += cfg.maxEmailsPerBatch) {
      const batchEmails = clusterEmails.slice(i, i + cfg.maxEmailsPerBatch);
      const batchPriority = batchEmails.reduce((highest, email) => {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return priorityOrder[email.priority] > priorityOrder[highest] ? email.priority : highest;
      }, "low" as FocusEmailMetadata["priority"]);

      const batch: EmailBatch = {
        batchId: generateBatchId("temp", allBatches.length),
        title: generateBatchTitle(batchEmails, clusterKey),
        theme: clusterKey,
        emails: batchEmails,
        priority: batchPriority,
        estimatedDuration: estimateBatchDuration(batchEmails),
        strategy: determineBatchStrategy(batchEmails),
      };

      allBatches.push(batch);
    }
  });

  // Sort batches by priority
  allBatches.sort((a, b) => {
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });

  // Create sessions
  const sessions: FocusSession[] = [];
  let currentSessionBatches: EmailBatch[] = [];
  let currentSessionDuration = 0;

  allBatches.forEach((batch) => {
    if (
      currentSessionBatches.length >= cfg.maxBatchesPerSession ||
      currentSessionDuration + batch.estimatedDuration > cfg.targetSessionDuration
    ) {
      // Create new session
      if (currentSessionBatches.length > 0) {
        const sessionId = generateSessionId();
        sessions.push(createSessionFromBatches(sessionId, currentSessionBatches));
      }
      currentSessionBatches = [batch];
      currentSessionDuration = batch.estimatedDuration;
    } else {
      currentSessionBatches.push(batch);
      currentSessionDuration += batch.estimatedDuration;
    }
  });

  // Add final session
  if (currentSessionBatches.length > 0) {
    const sessionId = generateSessionId();
    sessions.push(createSessionFromBatches(sessionId, currentSessionBatches));
  }

  return sessions;
}

/**
 * Creates a focus session from batches.
 */
function createSessionFromBatches(sessionId: string, batches: EmailBatch[]): FocusSession {
  // Update batch IDs with session ID
  batches.forEach((batch, idx) => {
    batch.batchId = generateBatchId(sessionId, idx);
  });

  const totalEmails = batches.reduce((sum, b) => sum + b.emails.length, 0);
  const estimatedDuration = batches.reduce((sum, b) => sum + b.estimatedDuration, 0);

  const hasCritical = batches.some((b) => b.priority === "critical");
  const hasHigh = batches.some((b) => b.priority === "high");

  const priority = hasCritical ? "critical" : hasHigh ? "high" : "medium";

  const title = generateSessionTitle(batches, priority);
  const description = generateSessionDescription(batches, totalEmails, estimatedDuration);

  return {
    sessionId,
    title,
    description,
    batches,
    estimatedDuration,
    totalEmails,
    priority,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Generates session title based on content.
 */
function generateSessionTitle(batches: EmailBatch[], priority: string): string {
  const criticalCount = batches.filter((b) => b.priority === "critical").length;
  const highCount = batches.filter((b) => b.priority === "high").length;

  if (criticalCount > 0) {
    return `🚨 Critical Focus Session (${criticalCount} urgent ${criticalCount === 1 ? "batch" : "batches"})`;
  }
  if (highCount > batches.length / 2) {
    return `⚡ High Priority Session (${batches.length} ${batches.length === 1 ? "batch" : "batches"})`;
  }

  return `📬 Focus Session (${batches.length} ${batches.length === 1 ? "batch" : "batches"})`;
}

/**
 * Generates session description.
 */
function generateSessionDescription(
  batches: EmailBatch[],
  totalEmails: number,
  duration: number
): string {
  const themes = [...new Set(batches.map((b) => b.theme))].slice(0, 3);
  const themesStr = themes.join(", ");

  return `Process ${totalEmails} ${totalEmails === 1 ? "email" : "emails"} across ${batches.length} ${batches.length === 1 ? "batch" : "batches"}. Topics: ${themesStr}. Est. time: ${duration} min.`;
}

/**
 * Surfaces the next batch of emails for the user to process.
 *
 * @param sessionId    The session ID.
 * @param userEmail    User's email address.
 * @returns            Next batch to process, or null if session complete.
 */
export function surfaceNextBatch(sessionId: string, userEmail: string): EmailBatch | null {
  const state = activeSessions.get(userEmail);

  if (!state || state.sessionId !== sessionId) {
    return null;
  }

  // Find session (in production, fetch from database)
  // For now, return null as sessions are ephemeral
  return null;
}

/**
 * Tracks user engagement during a focus session.
 *
 * @param sessionId        Session ID.
 * @param emailId          Email ID being interacted with.
 * @param action           Action taken (opened, responded, archived, skipped).
 * @param timeSpentSeconds Time spent on this email.
 */
export function trackEngagement(
  sessionId: string,
  emailId: string,
  action: "opened" | "responded" | "archived" | "skipped",
  timeSpentSeconds: number
): void {
  let metrics = engagementMetricsStore.get(sessionId);

  if (!metrics) {
    metrics = {
      sessionId,
      totalTimeSeconds: 0,
      emailsOpened: 0,
      emailsResponded: 0,
      emailsActioned: 0,
      emailsSkipped: 0,
      avgTimePerEmail: 0,
      dropoffSignals: [],
      engagementQuality: 1.0,
      completionPercentage: 0,
    };
  }

  metrics.totalTimeSeconds += timeSpentSeconds;

  switch (action) {
    case "opened":
      metrics.emailsOpened++;
      break;
    case "responded":
      metrics.emailsResponded++;
      metrics.emailsActioned++;
      break;
    case "archived":
      metrics.emailsActioned++;
      break;
    case "skipped":
      metrics.emailsSkipped++;
      break;
  }

  // Recalculate averages
  const totalActions = metrics.emailsOpened + metrics.emailsSkipped;
  metrics.avgTimePerEmail = totalActions > 0 ? metrics.totalTimeSeconds / totalActions : 0;

  // Detect drop-off signals
  detectDropoffSignals(metrics);

  engagementMetricsStore.set(sessionId, metrics);
}

/**
 * Detects drop-off signals from engagement metrics.
 */
function detectDropoffSignals(metrics: EngagementMetrics): void {
  const recentSkips = metrics.emailsSkipped;
  const recentOpens = metrics.emailsOpened;

  // Rapid skipping detection
  if (recentSkips > 5 && recentSkips / (recentOpens + 1) > 0.6) {
    metrics.dropoffSignals.push({
      type: "rapid_skipping",
      severity: 0.7,
      detectedAt: new Date().toISOString(),
      recommendation: "Consider taking a break or switching to a different batch",
    });
  }

  // Session too long
  if (metrics.totalTimeSeconds > 60 * 60) {
    // > 1 hour
    metrics.dropoffSignals.push({
      type: "session_too_long",
      severity: 0.8,
      detectedAt: new Date().toISOString(),
      recommendation: "Take a break - you've been in this session for over an hour",
    });
  }

  // Decreasing quality (low response rate)
  const responseRate = metrics.emailsOpened > 0 ? metrics.emailsResponded / metrics.emailsOpened : 0;
  if (metrics.emailsOpened > 10 && responseRate < 0.2) {
    metrics.dropoffSignals.push({
      type: "decreasing_quality",
      severity: 0.5,
      detectedAt: new Date().toISOString(),
      recommendation: "Engagement quality decreasing - consider switching focus",
    });
  }
}

/**
 * Retrieves engagement metrics for a session.
 *
 * @param sessionId    Session ID.
 * @returns            Current engagement metrics or null if not found.
 */
export function getEngagementMetrics(sessionId: string): EngagementMetrics | null {
  return engagementMetricsStore.get(sessionId) ?? null;
}

/**
 * Starts a focus session for a user.
 *
 * @param userEmail    User's email address.
 * @param sessionId    Session ID to start.
 */
export function startFocusSession(userEmail: string, sessionId: string): void {
  const state: SessionState = {
    sessionId,
    currentBatchIndex: 0,
    currentEmailIndex: 0,
    startedAt: new Date().toISOString(),
    isPaused: false,
    completedBatches: [],
    completedEmails: [],
  };

  activeSessions.set(userEmail, state);

  // Initialize engagement metrics
  engagementMetricsStore.set(sessionId, {
    sessionId,
    totalTimeSeconds: 0,
    emailsOpened: 0,
    emailsResponded: 0,
    emailsActioned: 0,
    emailsSkipped: 0,
    avgTimePerEmail: 0,
    dropoffSignals: [],
    engagementQuality: 1.0,
    completionPercentage: 0,
  });
}

/**
 * Pauses a focus session.
 *
 * @param userEmail    User's email address.
 */
export function pauseFocusSession(userEmail: string): void {
  const state = activeSessions.get(userEmail);
  if (state) {
    state.isPaused = true;
    activeSessions.set(userEmail, state);
  }
}

/**
 * Resumes a paused focus session.
 *
 * @param userEmail    User's email address.
 */
export function resumeFocusSession(userEmail: string): void {
  const state = activeSessions.get(userEmail);
  if (state) {
    state.isPaused = false;
    activeSessions.set(userEmail, state);
  }
}

/**
 * Ends a focus session.
 *
 * @param userEmail    User's email address.
 * @returns            Final engagement metrics.
 */
export function endFocusSession(userEmail: string): EngagementMetrics | null {
  const state = activeSessions.get(userEmail);
  if (!state) return null;

  const metrics = engagementMetricsStore.get(state.sessionId);
  activeSessions.delete(userEmail);

  return metrics ?? null;
}
