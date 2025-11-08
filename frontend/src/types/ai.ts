export type AIResponseStatus = "pending" | "verifying" | "verified" | "warning" | "failed";

export interface BotOutputPayload {
  id: string;
  content: string;
  createdAt: string;
  confidence?: number;
  metadata?: Record<string, unknown>;
}

export interface AIResponse extends BotOutputPayload {
  status: AIResponseStatus;
  verifiedAt?: string;
}

export interface ComplianceFinding {
  id: string;
  text: string;
  source?: string;
  confidence?: number;
}

export interface ComplianceReport {
  responseId: string;
  generatedAt: string;
  verified: ComplianceFinding[];
  warnings: ComplianceFinding[];
  citations: ComplianceFinding[];
}

export interface VerificationRequest {
  id: string;
  content: string;
}

export interface VerificationResult {
  response: AIResponse;
  report: ComplianceReport;
}

