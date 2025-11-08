import type { AIResponse, BotOutputPayload, ComplianceReport, VerificationRequest, VerificationResult } from "@/types/ai";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000";

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

export async function fetchComplianceReport(responseId: string): Promise<ComplianceReport> {
  const response = await fetch(new URL(`/api/report/${responseId}`, API_BASE_URL).toString(), {
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  return handleResponse<ComplianceReport>(response);
}

export function enrichBotOutputs(outputs: BotOutputPayload[]): AIResponse[] {
  return outputs.map((output) => ({
    ...output,
    status: "pending",
  }));
}

