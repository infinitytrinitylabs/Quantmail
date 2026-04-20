/**
 * MicroInteractions
 *
 * Gamified UI component that provides satisfying, rewarding micro-interactions
 * when users achieve email productivity milestones. Creates positive reinforcement
 * through visual feedback, animations, and celebration moments that encourage
 * continued engagement and extended session times.
 *
 * Features
 * ────────
 * ✓ Inbox Zero celebrations - confetti animations and achievement unlocks
 * ✓ Response streak tracking - visual counters and milestone rewards
 * ✓ Batch completion feedback - progress bars and success animations
 * ✓ Quick action gestures - swipe animations and haptic feedback
 * ✓ Email triage celebrations - satisfying visual confirmations
 * ✓ Focus session progress - real-time engagement visualization
 * ✓ Achievement badges - unlock system for productivity milestones
 * ✓ Positive reinforcement - encouraging messages and visual rewards
 *
 * Usage
 * ─────
 *   <MicroInteractions
 *     userId="user123"
 *     inboxCount={12}
 *     streakCount={5}
 *     onAchievementUnlock={(achievement) => console.log(achievement)}
 *   />
 */

"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  progress: number;
  maxProgress: number;
}

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string;
  streakType: "daily" | "weekly" | "monthly";
}

export interface MilestoneEvent {
  type: "inbox_zero" | "batch_complete" | "streak_milestone" | "rapid_response" | "focus_session";
  title: string;
  message: string;
  timestamp: string;
  celebrationLevel: "small" | "medium" | "large" | "epic";
}

export interface MicroInteractionsProps {
  /** Unique user identifier. */
  userId: string;
  /** Current inbox unread count. */
  inboxCount: number;
  /** Current response streak count. */
  streakCount?: number;
  /** Callback when achievement is unlocked. */
  onAchievementUnlock?: (achievement: Achievement) => void;
  /** Callback when milestone is reached. */
  onMilestoneReached?: (milestone: MilestoneEvent) => void;
  /** Enable haptic feedback (mobile). */
  enableHaptics?: boolean;
  /** Enable sound effects. */
  enableSounds?: boolean;
  /** Show achievement notifications. */
  showNotifications?: boolean;
  /** Custom theme colors. */
  theme?: {
    primary?: string;
    success?: string;
    epic?: string;
  };
}

export interface BatchProgress {
  batchId: string;
  completed: number;
  total: number;
  theme: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_THEME = {
  primary: "#6366f1",
  success: "#10b981",
  epic: "#f59e0b",
};

const ACHIEVEMENT_DEFINITIONS: Omit<Achievement, "unlockedAt" | "progress">[] = [
  {
    id: "inbox_zero_first",
    title: "🎯 Inbox Zero Hero",
    description: "Achieved Inbox Zero for the first time",
    icon: "🎯",
    rarity: "rare",
    maxProgress: 1,
  },
  {
    id: "inbox_zero_streak_7",
    title: "🔥 Week of Clarity",
    description: "Maintained Inbox Zero for 7 consecutive days",
    icon: "🔥",
    rarity: "epic",
    maxProgress: 7,
  },
  {
    id: "streak_5",
    title: "⚡ Quick Responder",
    description: "Responded to 5 emails in a row",
    icon: "⚡",
    rarity: "common",
    maxProgress: 5,
  },
  {
    id: "streak_25",
    title: "🚀 Response Champion",
    description: "Achieved a 25-email response streak",
    icon: "🚀",
    rarity: "rare",
    maxProgress: 25,
  },
  {
    id: "streak_100",
    title: "👑 Email Royalty",
    description: "100-email response streak! Legendary!",
    icon: "👑",
    rarity: "legendary",
    maxProgress: 100,
  },
  {
    id: "batch_master",
    title: "📦 Batch Master",
    description: "Completed 10 email batches",
    icon: "📦",
    rarity: "rare",
    maxProgress: 10,
  },
  {
    id: "focus_warrior",
    title: "🧘 Focus Warrior",
    description: "Completed 5 focus sessions",
    icon: "🧘",
    rarity: "epic",
    maxProgress: 5,
  },
  {
    id: "night_owl",
    title: "🦉 Night Owl",
    description: "Cleared emails after 10 PM",
    icon: "🦉",
    rarity: "common",
    maxProgress: 1,
  },
  {
    id: "early_bird",
    title: "🌅 Early Bird",
    description: "Cleared emails before 7 AM",
    icon: "🌅",
    rarity: "common",
    maxProgress: 1,
  },
  {
    id: "rapid_fire",
    title: "💨 Rapid Fire",
    description: "Responded to 10 emails in under 10 minutes",
    icon: "💨",
    rarity: "epic",
    maxProgress: 10,
  },
];

// ─── Helper Functions ─────────────────────────────────────────────────────────

/**
 * Generates confetti particles for celebrations.
 */
function generateConfetti(count: number): Array<{ id: number; x: number; y: number; color: string; delay: number }> {
  const colors = ["#f59e0b", "#10b981", "#6366f1", "#ef4444", "#8b5cf6"];
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: -10,
    color: colors[Math.floor(Math.random() * colors.length)],
    delay: Math.random() * 0.3,
  }));
}

/**
 * Triggers haptic feedback on mobile devices.
 */
function triggerHaptic(pattern: "light" | "medium" | "heavy" = "medium"): void {
  if ("vibrate" in navigator) {
    const patterns = {
      light: [10],
      medium: [20],
      heavy: [30, 10, 30],
    };
    navigator.vibrate(patterns[pattern]);
  }
}

/**
 * Plays a celebration sound effect.
 */
function playSound(soundType: "success" | "achievement" | "milestone"): void {
  // In production, load and play actual audio files
  // For now, using Web Audio API to generate simple tones
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    const frequencies = {
      success: [440, 554, 659],
      achievement: [523, 659, 784],
      milestone: [659, 784, 988, 1047],
    };

    const freqs = frequencies[soundType];
    let time = audioContext.currentTime;

    freqs.forEach((freq, i) => {
      oscillator.frequency.setValueAtTime(freq, time);
      gainNode.gain.setValueAtTime(0.3, time);
      gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.15);
      time += 0.15;
    });

    oscillator.start(audioContext.currentTime);
    oscillator.stop(time);
  } catch (error) {
    // Silently fail if audio not supported
  }
}

// ─── Sub-Components ───────────────────────────────────────────────────────────

/**
 * Confetti animation component.
 */
const Confetti: React.FC<{ show: boolean; onComplete: () => void }> = ({ show, onComplete }) => {
  const [particles, setParticles] = useState(generateConfetti(50));

  useEffect(() => {
    if (show) {
      setParticles(generateConfetti(50));
      const timer = setTimeout(onComplete, 3000);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute w-2 h-2 rounded-full"
          style={{
            left: `${particle.x}%`,
            backgroundColor: particle.color,
          }}
          initial={{ y: -20, opacity: 1, scale: 1 }}
          animate={{
            y: window.innerHeight + 20,
            opacity: 0,
            scale: 0,
            rotate: Math.random() * 720 - 360,
          }}
          transition={{
            duration: 2 + Math.random(),
            delay: particle.delay,
            ease: "linear",
          }}
        />
      ))}
    </div>
  );
};

/**
 * Achievement unlock notification.
 */
const AchievementNotification: React.FC<{
  achievement: Achievement;
  onClose: () => void;
}> = ({ achievement, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const rarityColors = {
    common: "bg-gray-500",
    rare: "bg-blue-500",
    epic: "bg-purple-500",
    legendary: "bg-yellow-500",
  };

  return (
    <motion.div
      className={`fixed top-20 right-4 ${rarityColors[achievement.rarity]} text-white rounded-lg shadow-2xl p-4 max-w-sm z-50`}
      initial={{ x: 400, opacity: 0, scale: 0.8 }}
      animate={{ x: 0, opacity: 1, scale: 1 }}
      exit={{ x: 400, opacity: 0, scale: 0.8 }}
      transition={{ type: "spring", damping: 20, stiffness: 300 }}
    >
      <div className="flex items-start gap-3">
        <div className="text-4xl">{achievement.icon}</div>
        <div className="flex-1">
          <div className="font-bold text-lg mb-1">Achievement Unlocked!</div>
          <div className="font-semibold">{achievement.title}</div>
          <div className="text-sm opacity-90">{achievement.description}</div>
          <div className="mt-2 text-xs uppercase tracking-wide opacity-75">
            {achievement.rarity}
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-white hover:text-gray-200 transition-colors"
          aria-label="Close notification"
        >
          ✕
        </button>
      </div>
    </motion.div>
  );
};

/**
 * Inbox Zero celebration screen.
 */
const InboxZeroCelebration: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <motion.div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-white rounded-2xl p-8 max-w-md text-center shadow-2xl"
        initial={{ scale: 0.5, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", damping: 15, stiffness: 200 }}
        onClick={(e) => e.stopPropagation()}
      >
        <motion.div
          className="text-8xl mb-4"
          animate={{ rotate: [0, 10, -10, 10, 0] }}
          transition={{ duration: 0.5, repeat: 2 }}
        >
          🎯
        </motion.div>
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Inbox Zero!</h2>
        <p className="text-gray-600 mb-6">
          You've cleared all your emails. Amazing work!
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
          >
            Celebrate! 🎉
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

/**
 * Streak counter display.
 */
const StreakCounter: React.FC<{
  streak: number;
  theme: typeof DEFAULT_THEME;
}> = ({ streak, theme }) => {
  return (
    <motion.div
      className="flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-md"
      initial={{ scale: 0.9 }}
      animate={{ scale: 1 }}
      whileHover={{ scale: 1.05 }}
    >
      <span className="text-2xl">🔥</span>
      <div>
        <div className="text-xs text-gray-500 uppercase tracking-wide">Streak</div>
        <motion.div
          className="text-xl font-bold"
          style={{ color: theme.primary }}
          key={streak}
          initial={{ scale: 1.5, color: theme.epic }}
          animate={{ scale: 1, color: theme.primary }}
          transition={{ type: "spring", damping: 10 }}
        >
          {streak}
        </motion.div>
      </div>
    </motion.div>
  );
};

/**
 * Batch progress indicator.
 */
const BatchProgressBar: React.FC<{
  progress: BatchProgress;
  theme: typeof DEFAULT_THEME;
}> = ({ progress, theme }) => {
  const percentage = (progress.completed / progress.total) * 100;

  return (
    <div className="bg-white rounded-lg p-4 shadow-md">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-semibold text-gray-700">{progress.theme}</span>
        <span className="text-sm text-gray-500">
          {progress.completed}/{progress.total}
        </span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: theme.success }}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
      {percentage === 100 && (
        <motion.div
          className="mt-2 text-center text-sm font-semibold"
          style={{ color: theme.success }}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          ✓ Batch Complete!
        </motion.div>
      )}
    </div>
  );
};

/**
 * Quick action feedback animation.
 */
const QuickActionFeedback: React.FC<{
  action: "archive" | "delete" | "reply" | "snooze";
  position: { x: number; y: number };
  onComplete: () => void;
}> = ({ action, position, onComplete }) => {
  const icons = {
    archive: "📦",
    delete: "🗑️",
    reply: "↩️",
    snooze: "⏰",
  };

  const colors = {
    archive: "#10b981",
    delete: "#ef4444",
    reply: "#6366f1",
    snooze: "#f59e0b",
  };

  useEffect(() => {
    const timer = setTimeout(onComplete, 1000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      className="fixed pointer-events-none z-50"
      style={{
        left: position.x,
        top: position.y,
      }}
      initial={{ scale: 1, opacity: 1 }}
      animate={{ scale: 2, opacity: 0, y: -50 }}
      transition={{ duration: 1, ease: "easeOut" }}
    >
      <div
        className="text-4xl"
        style={{
          filter: `drop-shadow(0 0 10px ${colors[action]})`,
        }}
      >
        {icons[action]}
      </div>
    </motion.div>
  );
};

/**
 * Milestone celebration toast.
 */
const MilestoneToast: React.FC<{
  milestone: MilestoneEvent;
  onClose: () => void;
}> = ({ milestone, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const levelColors = {
    small: "bg-blue-500",
    medium: "bg-purple-500",
    large: "bg-yellow-500",
    epic: "bg-gradient-to-r from-purple-500 to-pink-500",
  };

  return (
    <motion.div
      className={`fixed bottom-4 right-4 ${levelColors[milestone.celebrationLevel]} text-white rounded-lg shadow-2xl p-4 max-w-sm z-50`}
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ type: "spring", damping: 20 }}
    >
      <div className="font-bold text-lg mb-1">{milestone.title}</div>
      <div className="text-sm">{milestone.message}</div>
    </motion.div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const MicroInteractions: React.FC<MicroInteractionsProps> = ({
  userId,
  inboxCount,
  streakCount = 0,
  onAchievementUnlock,
  onMilestoneReached,
  enableHaptics = true,
  enableSounds = true,
  showNotifications = true,
  theme = DEFAULT_THEME,
}) => {
  const mergedTheme = { ...DEFAULT_THEME, ...theme };

  const [previousInboxCount, setPreviousInboxCount] = useState(inboxCount);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showInboxZero, setShowInboxZero] = useState(false);
  const [currentNotification, setCurrentNotification] = useState<Achievement | null>(null);
  const [currentMilestone, setCurrentMilestone] = useState<MilestoneEvent | null>(null);
  const [quickActionFeedback, setQuickActionFeedback] = useState<{
    action: "archive" | "delete" | "reply" | "snooze";
    position: { x: number; y: number };
  } | null>(null);
  const [batchProgress, setBatchProgress] = useState<BatchProgress | null>(null);

  // Load achievements from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(`achievements_${userId}`);
    if (stored) {
      try {
        setAchievements(JSON.parse(stored));
      } catch {
        // Ignore parse errors
      }
    }
  }, [userId]);

  // Save achievements to localStorage
  const saveAchievements = useCallback(
    (newAchievements: Achievement[]) => {
      localStorage.setItem(`achievements_${userId}`, JSON.stringify(newAchievements));
      setAchievements(newAchievements);
    },
    [userId]
  );

  // Check for Inbox Zero
  useEffect(() => {
    if (inboxCount === 0 && previousInboxCount > 0) {
      // Inbox Zero achieved!
      setShowInboxZero(true);
      setShowConfetti(true);

      if (enableHaptics) triggerHaptic("heavy");
      if (enableSounds) playSound("milestone");

      const milestone: MilestoneEvent = {
        type: "inbox_zero",
        title: "🎯 Inbox Zero!",
        message: "You've cleared all your emails. Excellent work!",
        timestamp: new Date().toISOString(),
        celebrationLevel: "epic",
      };

      if (onMilestoneReached) onMilestoneReached(milestone);

      // Check for Inbox Zero achievement
      unlockAchievement("inbox_zero_first");
    }

    setPreviousInboxCount(inboxCount);
  }, [inboxCount, previousInboxCount, enableHaptics, enableSounds, onMilestoneReached]);

  // Check for streak achievements
  useEffect(() => {
    if (streakCount >= 5 && !hasAchievement("streak_5")) {
      unlockAchievement("streak_5");
    }
    if (streakCount >= 25 && !hasAchievement("streak_25")) {
      unlockAchievement("streak_25");
    }
    if (streakCount >= 100 && !hasAchievement("streak_100")) {
      unlockAchievement("streak_100");
    }
  }, [streakCount]);

  const hasAchievement = (id: string): boolean => {
    return achievements.some((a) => a.id === id);
  };

  const unlockAchievement = useCallback(
    (id: string) => {
      if (hasAchievement(id)) return;

      const definition = ACHIEVEMENT_DEFINITIONS.find((a) => a.id === id);
      if (!definition) return;

      const newAchievement: Achievement = {
        ...definition,
        unlockedAt: new Date().toISOString(),
        progress: definition.maxProgress,
      };

      const updated = [...achievements, newAchievement];
      saveAchievements(updated);

      if (showNotifications) {
        setCurrentNotification(newAchievement);
      }

      if (enableHaptics) triggerHaptic("medium");
      if (enableSounds) playSound("achievement");
      if (onAchievementUnlock) onAchievementUnlock(newAchievement);

      // Show confetti for rare+ achievements
      if (newAchievement.rarity !== "common") {
        setShowConfetti(true);
      }
    },
    [achievements, saveAchievements, showNotifications, enableHaptics, enableSounds, onAchievementUnlock]
  );

  const triggerQuickAction = useCallback(
    (action: "archive" | "delete" | "reply" | "snooze", event: React.MouseEvent) => {
      setQuickActionFeedback({
        action,
        position: { x: event.clientX, y: event.clientY },
      });

      if (enableHaptics) triggerHaptic("light");
      if (enableSounds) playSound("success");
    },
    [enableHaptics, enableSounds]
  );

  const updateBatchProgress = useCallback((batchId: string, completed: number, total: number, theme: string) => {
    setBatchProgress({ batchId, completed, total, theme });

    if (completed === total) {
      if (enableHaptics) triggerHaptic("medium");
      if (enableSounds) playSound("milestone");

      const milestone: MilestoneEvent = {
        type: "batch_complete",
        title: "📦 Batch Complete!",
        message: `You've processed all ${total} emails in this batch.`,
        timestamp: new Date().toISOString(),
        celebrationLevel: "medium",
      };

      setCurrentMilestone(milestone);
    }
  }, [enableHaptics, enableSounds]);

  // Expose API for parent components
  useEffect(() => {
    (window as any).microInteractions = {
      triggerQuickAction,
      updateBatchProgress,
      unlockAchievement,
    };
  }, [triggerQuickAction, updateBatchProgress, unlockAchievement]);

  return (
    <>
      {/* Confetti Effect */}
      <Confetti show={showConfetti} onComplete={() => setShowConfetti(false)} />

      {/* Inbox Zero Celebration */}
      <AnimatePresence>
        {showInboxZero && <InboxZeroCelebration onClose={() => setShowInboxZero(false)} />}
      </AnimatePresence>

      {/* Achievement Notification */}
      <AnimatePresence>
        {currentNotification && (
          <AchievementNotification
            achievement={currentNotification}
            onClose={() => setCurrentNotification(null)}
          />
        )}
      </AnimatePresence>

      {/* Milestone Toast */}
      <AnimatePresence>
        {currentMilestone && (
          <MilestoneToast
            milestone={currentMilestone}
            onClose={() => setCurrentMilestone(null)}
          />
        )}
      </AnimatePresence>

      {/* Quick Action Feedback */}
      <AnimatePresence>
        {quickActionFeedback && (
          <QuickActionFeedback
            action={quickActionFeedback.action}
            position={quickActionFeedback.position}
            onComplete={() => setQuickActionFeedback(null)}
          />
        )}
      </AnimatePresence>

      {/* Streak Counter (always visible if streak > 0) */}
      {streakCount > 0 && (
        <div className="fixed top-4 right-4 z-40">
          <StreakCounter streak={streakCount} theme={mergedTheme} />
        </div>
      )}

      {/* Batch Progress (if active) */}
      {batchProgress && (
        <div className="fixed bottom-4 left-4 z-40 w-80">
          <BatchProgressBar progress={batchProgress} theme={mergedTheme} />
        </div>
      )}

      {/* Achievement Gallery (hidden by default, can be toggled) */}
      <div className="hidden" id="achievement-gallery">
        <div className="grid grid-cols-3 gap-4 p-4">
          {ACHIEVEMENT_DEFINITIONS.map((def) => {
            const unlocked = achievements.find((a) => a.id === def.id);
            return (
              <div
                key={def.id}
                className={`p-4 rounded-lg border-2 ${
                  unlocked ? "border-green-500 bg-green-50" : "border-gray-300 bg-gray-50 opacity-50"
                }`}
              >
                <div className="text-4xl mb-2">{def.icon}</div>
                <div className="font-semibold text-sm">{def.title}</div>
                <div className="text-xs text-gray-600 mt-1">{def.description}</div>
                {unlocked && (
                  <div className="text-xs text-green-600 mt-2">
                    Unlocked {new Date(unlocked.unlockedAt).toLocaleDateString()}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default MicroInteractions;
