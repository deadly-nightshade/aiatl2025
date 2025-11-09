import type {
  AIResponse,
  AIRole,
  BotOutputPayload,
  ComplianceReport,
  VerificationRequest,
  VerificationResult,
} from "@/types/ai";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:700";

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function fetchBotOutputs(lastSeenId?: string): Promise<BotOutputPayload[]> {
  const url = new URL("/api/bot-output", API_BASE_URL);

  if (lastSeenId) {
    url.searchParams.set("after", lastSeenId);
  }

  const response = await fetch(url.toString(), {
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  return handleResponse<BotOutputPayload[]>(response);
}

export async function requestVerification(payload: VerificationRequest): Promise<VerificationResult> {
  const response = await fetch(new URL("/api/verify", API_BASE_URL).toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return handleResponse<VerificationResult>(response);
}

interface RecordBotInteractionPayload {
  prompt: string;
  response: string;
  metadata?: Record<string, unknown>;
}

export async function recordBotInteraction(payload: RecordBotInteractionPayload): Promise<AIResponse> {
  const response = await fetch(new URL("/api/bot-output", API_BASE_URL).toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return handleResponse<AIResponse>(response);
}

export async function fetchComplianceReport(responseId: string): Promise<ComplianceReport> {
  const response = await fetch(new URL(`/api/report/${responseId}`, API_BASE_URL).toString(), {
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  return handleResponse<ComplianceReport>(response);
}

function readMetadataString(payload: BotOutputPayload, key: string): string | undefined {
  const metadata = payload.metadata;
  if (!metadata || typeof metadata !== "object") {
    return undefined;
  }

  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === "string" ? value : undefined;
}

function deriveRole(payload: BotOutputPayload): AIRole | undefined {
  const directRole = payload.role;
  if (directRole === "user" || directRole === "assistant") {
    return directRole;
  }

  const metadataRole = readMetadataString(payload, "role");
  if (metadataRole === "user" || metadataRole === "assistant") {
    return metadataRole;
  }

  return undefined;
}

export function enrichBotOutputs(outputs: BotOutputPayload[]): AIResponse[] {
  return outputs.map((output) => {
    const role = deriveRole(output);
    const status = output.status ?? (role === "assistant" ? "pending" : "pending");

    return {
      ...output,
      role,
      status,
    };
  });
}

