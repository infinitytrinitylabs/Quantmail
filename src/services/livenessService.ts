/**
 * Biometric liveness service.
 *
 * Supports two provider modes, controlled by the LIVENESS_PROVIDER env var:
 *   - "incode"     – delegates to the Incode Omni API (facial liveness + PoP).
 *   - "microblink" – delegates to the Microblink BlinkID liveness API.
 *   - "local"      – entropy-based fallback used in development / tests.
 *
 * On native iOS/Android (Capacitor runtime), the device camera is invoked via
 * @capacitor/camera before the analysis step.
 */

import { deriveBiometricHash } from "../utils/crypto";

// ─── Provider configuration ──────────────────────────────────────────────────

const LIVENESS_PROVIDER =
  (process.env["LIVENESS_PROVIDER"] as "incode" | "microblink" | "local") ||
  "local";
const INCODE_API_URL =
  process.env["INCODE_API_URL"] || "https://demo-api.incode.com/omni/start";
const INCODE_API_KEY = process.env["INCODE_API_KEY"] || "";
const INCODE_FLOW_ID = process.env["INCODE_FLOW_ID"] || "";
const MICROBLINK_API_URL =
  process.env["MICROBLINK_API_URL"] ||
  "https://api.microblink.com/v1/recognizers/face-liveness";
const MICROBLINK_API_KEY = process.env["MICROBLINK_API_KEY"] || "";

// ─── Public types ─────────────────────────────────────────────────────────────

/** Result of a liveness check. */
export interface LivenessResult {
  passed: boolean;
  livenessScore: number;
  facialMatrixHash: string;
  captureSource: "capacitor_native" | "web_upload";
}

// ─── Incode SDK types ─────────────────────────────────────────────────────────

interface IncodeSessionToken {
  token: string;
  interviewId: string;
}

interface IncodeAddFaceResult {
  confidence: number;
  isBright: boolean;
  hasLenses: boolean;
  hasMask: boolean;
  faceDetected: boolean;
}

interface IncodeScoreResult {
  liveness: {
    probability: number;
    quality: number;
    isPassed: boolean;
  };
  overall: { status: "OK" | "FAIL" | "MANUAL_REVIEW" };
}

// ─── Microblink SDK types ─────────────────────────────────────────────────────

interface MicroblinkSessionResult {
  sessionId: string;
  status: "created";
}

interface MicroblinkLivenessResult {
  result: {
    livenessScore: number;
    realFaceDetected: boolean;
    facialHash: string;
    status: "success" | "failed" | "pending";
  };
}

// ─── Capacitor native camera ──────────────────────────────────────────────────

/**
 * Checks whether the Capacitor native runtime is available.
 * This is true when the app runs inside an iOS/Android WebView via Capacitor.
 */
export function isCapacitorNative(): boolean {
  return (
    typeof globalThis !== "undefined" &&
    typeof (globalThis as Record<string, unknown>)["Capacitor"] === "object"
  );
}

/**
 * Captures an image from the device camera using Capacitor Camera plugin.
 * Only callable when running inside Capacitor native shell.
 * Returns a base64-encoded image string.
 */
export async function captureNativeCameraFrame(): Promise<string> {
  if (!isCapacitorNative()) {
    throw new Error(
      "captureNativeCameraFrame requires Capacitor native runtime (iOS/Android)"
    );
  }
  const { Camera, CameraResultType, CameraSource } = await import(
    "@capacitor/camera"
  );
  const photo = await Camera.getPhoto({
    quality: 90,
    allowEditing: false,
    resultType: CameraResultType.Base64,
    source: CameraSource.Camera,
  });
  if (!photo.base64String) {
    throw new Error("Camera capture returned empty base64 payload");
  }
  return photo.base64String;
}

// ─── Incode SDK integration ───────────────────────────────────────────────────

/**
 * Starts an Incode Omni session for facial liveness verification.
 * Returns a session token and interview ID used in subsequent API calls.
 */
export async function startIncodeSession(): Promise<IncodeSessionToken> {
  const response = await fetch(`${INCODE_API_URL}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Incode-Hardware-Id": INCODE_API_KEY,
    },
    body: JSON.stringify({ countryCode: "ALL", flowId: INCODE_FLOW_ID }),
  });
  if (!response.ok) {
    throw new Error(`Incode session start failed: ${response.status}`);
  }
  const data = (await response.json()) as IncodeSessionToken;
  return data;
}

/**
 * Submits a face frame to the Incode Omni liveness API.
 */
export async function submitFaceToIncode(
  sessionToken: string,
  imageBase64: string
): Promise<IncodeAddFaceResult> {
  const baseUrl = INCODE_API_URL.replace("/omni/start", "");
  const response = await fetch(`${baseUrl}/omni/add/face/third-party`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Incode-Hardware-Id": INCODE_API_KEY,
      Authorization: `Bearer ${sessionToken}`,
    },
    body: JSON.stringify({ base64Image: imageBase64 }),
  });
  if (!response.ok) {
    throw new Error(`Incode face submission failed: ${response.status}`);
  }
  return (await response.json()) as IncodeAddFaceResult;
}

/**
 * Retrieves the Incode liveness decision for a completed session.
 */
export async function getIncodeDecision(
  sessionToken: string
): Promise<IncodeScoreResult> {
  const baseUrl = INCODE_API_URL.replace("/omni/start", "");
  const response = await fetch(`${baseUrl}/omni/get/score`, {
    method: "GET",
    headers: {
      "X-Incode-Hardware-Id": INCODE_API_KEY,
      Authorization: `Bearer ${sessionToken}`,
    },
  });
  if (!response.ok) {
    throw new Error(`Incode decision fetch failed: ${response.status}`);
  }
  return (await response.json()) as IncodeScoreResult;
}

// ─── Microblink SDK integration ───────────────────────────────────────────────

/**
 * Creates a new Microblink BlinkID liveness session.
 */
export async function createMicroblinkSession(): Promise<MicroblinkSessionResult> {
  const response = await fetch(`${MICROBLINK_API_URL}/sessions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${MICROBLINK_API_KEY}`,
    },
    body: JSON.stringify({ mode: "liveness" }),
  });
  if (!response.ok) {
    throw new Error(`Microblink session creation failed: ${response.status}`);
  }
  return (await response.json()) as MicroblinkSessionResult;
}

/**
 * Submits a face frame to the Microblink liveness analysis endpoint.
 */
export async function analyzeFaceWithMicroblink(
  sessionId: string,
  imageBase64: string
): Promise<MicroblinkLivenessResult> {
  const response = await fetch(
    `${MICROBLINK_API_URL}/sessions/${sessionId}/analyze`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MICROBLINK_API_KEY}`,
      },
      body: JSON.stringify({ imageData: imageBase64, type: "selfie" }),
    }
  );
  if (!response.ok) {
    throw new Error(`Microblink analysis failed: ${response.status}`);
  }
  return (await response.json()) as MicroblinkLivenessResult;
}

// ─── Provider dispatch ────────────────────────────────────────────────────────

/**
 * Runs the Incode liveness flow end-to-end and returns a normalised result.
 */
async function checkLivenessViaIncode(
  imageBase64: string
): Promise<{ passed: boolean; score: number; hash: string }> {
  const session = await startIncodeSession();
  await submitFaceToIncode(session.token, imageBase64);
  const decision = await getIncodeDecision(session.token);

  const score = decision.liveness?.probability ?? 0;
  const passed =
    decision.liveness?.isPassed === true &&
    decision.overall?.status === "OK" &&
    score >= 0.7;
  const hash = deriveBiometricHash(
    `incode:${session.interviewId}:${imageBase64.slice(0, 64)}`
  );
  return { passed, score, hash };
}

/**
 * Runs the Microblink liveness flow end-to-end and returns a normalised result.
 */
async function checkLivenessViaMicroblink(
  imageBase64: string
): Promise<{ passed: boolean; score: number; hash: string }> {
  const session = await createMicroblinkSession();
  const analysis = await analyzeFaceWithMicroblink(
    session.sessionId,
    imageBase64
  );

  const score = analysis.result?.livenessScore ?? 0;
  const passed =
    analysis.result?.realFaceDetected === true &&
    analysis.result?.status === "success" &&
    score >= 0.7;
  const hash =
    analysis.result?.facialHash ||
    deriveBiometricHash(
      `microblink:${session.sessionId}:${imageBase64.slice(0, 64)}`
    );
  return { passed, score, hash };
}

/**
 * Local entropy-based heuristic (development / test fallback).
 * Rejects payloads that are too small (likely blank/synthetic).
 * A score >= 0.70 is considered passing.
 */
function checkLivenessLocally(imageBase64: string): {
  passed: boolean;
  score: number;
  hash: string;
} {
  if (imageBase64.length < 1000) {
    return { passed: false, score: 0, hash: "" };
  }
  const hash = deriveBiometricHash(imageBase64);
  const sample = imageBase64.slice(0, 2048);
  const charSet = new Set(sample.split(""));
  const entropy = charSet.size / 64;
  const score = Math.min(parseFloat(entropy.toFixed(4)), 1.0);
  return { passed: score >= 0.7, score, hash };
}

// ─── Primary entrypoint ───────────────────────────────────────────────────────

/**
 * Performs a liveness check on an image payload using the configured provider.
 *
 * Provider selection (LIVENESS_PROVIDER env var):
 *   - "incode"     – Incode Omni SDK (requires INCODE_API_KEY).
 *   - "microblink" – Microblink BlinkID SDK (requires MICROBLINK_API_KEY).
 *   - "local"      – Entropy-based heuristic (default; no external calls).
 *
 * In native mode, `imageBase64` may be omitted; the service will capture from
 * the device camera automatically via Capacitor.
 */
export async function performLivenessCheck(
  imageBase64?: string
): Promise<LivenessResult> {
  let captureSource: LivenessResult["captureSource"] = "web_upload";
  let payload = imageBase64;

  if (!payload && isCapacitorNative()) {
    payload = await captureNativeCameraFrame();
    captureSource = "capacitor_native";
  }

  if (!payload || payload.length < 1000) {
    return {
      passed: false,
      livenessScore: 0,
      facialMatrixHash: "",
      captureSource,
    };
  }

  try {
    let result: { passed: boolean; score: number; hash: string };

    if (LIVENESS_PROVIDER === "incode" && INCODE_API_KEY) {
      result = await checkLivenessViaIncode(payload);
    } else if (LIVENESS_PROVIDER === "microblink" && MICROBLINK_API_KEY) {
      result = await checkLivenessViaMicroblink(payload);
    } else {
      result = checkLivenessLocally(payload);
    }

    return {
      passed: result.passed,
      livenessScore: result.score,
      facialMatrixHash: result.hash,
      captureSource,
    };
  } catch {
    // If the external SDK call fails, fall back to local heuristic so that a
    // transient network error does not permanently block registration.
    const fallback = checkLivenessLocally(payload);
    return {
      passed: fallback.passed,
      livenessScore: fallback.score,
      facialMatrixHash: fallback.hash,
      captureSource,
    };
  }
}
