import type {
  AIResponse,
  AIRole,
  BotOutputPayload,
  ComplianceReport,
  HallucinationAnalysisResult,
  ComplianceAnalysisResult,
  CombinedAssessment,
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

  const raw = await handleResponse<unknown>(response);
  return transformVerificationResult(raw);
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

  const raw = await handleResponse<unknown>(response);
  return transformComplianceReport(raw);
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

function toNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" ? value : fallback;
}

function mapHallucinationAnalysis(raw: any): HallucinationAnalysisResult {
  const detail = raw?.hallucination_analysis ?? {};
  return {
    task: raw?.task ?? "",
    status: raw?.status ?? "unknown",
    detail: {
      confidenceScore: toNumber(detail.confidence_score),
      reasoning: detail.reasoning ?? "",
      issuesDetected: Array.isArray(detail.issues_detected)
        ? detail.issues_detected.map((issue: any, index: number) => ({
            issueType: issue?.issue_type ?? `issue_${index}`,
            description: issue?.description ?? "",
            evidence: issue?.evidence ?? "",
            riskLevel: issue?.risk_level ?? "UNKNOWN",
            explanation: issue?.explanation ?? "",
          }))
        : [],
      citationAnalysis: Array.isArray(detail.citation_analysis)
        ? detail.citation_analysis.map((citation: any, index: number) => ({
            citation: citation?.citation ?? `citation_${index}`,
            assessment: citation?.assessment ?? "",
            riskLevel: citation?.risk_level ?? "UNKNOWN",
            explanation: citation?.explanation ?? "",
            completenessScore: toNumber(citation?.completeness_score),
          }))
        : [],
      riskLevel: detail.risk_level ?? "UNKNOWN",
      totalIssues: toNumber(detail.total_issues),
      totalCitations: toNumber(detail.total_citations),
      timestamp: detail.timestamp ?? "",
    },
  };
}

function mapComplianceAnalysis(raw: any): ComplianceAnalysisResult {
  const detail = raw?.compliance_analysis ?? {};
  return {
    task: raw?.task ?? "",
    status: raw?.status ?? "unknown",
    detail: {
      phiViolations: {
        patternViolations: Array.isArray(detail?.phi_violations?.pattern_violations)
          ? detail.phi_violations.pattern_violations.map((item: any) => ({
              type: item?.type ?? "",
              count: toNumber(item?.count),
              severity: item?.severity ?? "UNKNOWN",
              remediation: item?.remediation,
              details: item?.details,
            }))
          : [],
        aiAnalysis: {
          foundPhi: detail?.phi_violations?.ai_analysis?.found_phi ?? [],
          contextualReidentification: detail?.phi_violations?.ai_analysis?.contextual_reidentification ?? [],
          overallRisk: detail?.phi_violations?.ai_analysis?.overall_risk ?? "UNKNOWN",
          mitigationSteps: detail?.phi_violations?.ai_analysis?.mitigation_steps ?? [],
          confidence: detail?.phi_violations?.ai_analysis?.confidence ?? "",
        },
        quasiIdentifierRisk: detail?.phi_violations?.quasi_identifier_risk
          ? {
              quasiIdentifiersPresent: detail.phi_violations.quasi_identifier_risk.quasi_identifiers_present ?? [],
              count: toNumber(detail.phi_violations.quasi_identifier_risk.count),
              reidentificationRisk: detail.phi_violations.quasi_identifier_risk.reidentification_risk ?? "UNKNOWN",
              recommendation: detail.phi_violations.quasi_identifier_risk.recommendation,
            }
          : undefined,
        totalViolations: toNumber(detail?.phi_violations?.total_violations),
        confidenceScore: toNumber(detail?.phi_violations?.confidence_score, 0),
        timestamp: detail?.phi_violations?.timestamp ?? "",
      },
      regulatoryCompliance: {
        violations: detail?.regulatory_compliance?.violations ?? [],
        regulatoryContextPresent: Boolean(detail?.regulatory_compliance?.regulatory_context_present),
        totalViolations: toNumber(detail?.regulatory_compliance?.total_violations),
        status: detail?.regulatory_compliance?.status ?? "UNKNOWN",
        timestamp: detail?.regulatory_compliance?.timestamp ?? "",
      },
      fdaCompliance: {
        fdaAnalysis: {
          violations: Array.isArray(detail?.fda_compliance?.fda_analysis?.violations)
            ? detail.fda_compliance.fda_analysis.violations.map((violation: any) => ({
                id: violation?.id ?? "",
                type: violation?.type ?? "",
                description: violation?.description ?? "",
                severity: violation?.severity ?? "",
                regulation: violation?.regulation ?? "",
              }))
            : [],
          offLabelUsesWithoutDisclosure: detail?.fda_compliance?.fda_analysis?.off_label_uses_without_disclosure ?? [],
          missingBlackBoxWarnings: detail?.fda_compliance?.fda_analysis?.missing_black_box_warnings ?? [],
          approvalStatusIssues: detail?.fda_compliance?.fda_analysis?.approval_status_issues ?? [],
          falseEfficacyClaims: detail?.fda_compliance?.fda_analysis?.false_efficacy_claims ?? [],
          recommendedRemediations: detail?.fda_compliance?.fda_analysis?.recommended_remediations ?? [],
          overallRiskLevel: detail?.fda_compliance?.fda_analysis?.overall_risk_level ?? "UNKNOWN",
        },
        parseSuccessful: Boolean(detail?.fda_compliance?.parse_successful),
        timestamp: detail?.fda_compliance?.timestamp ?? "",
      },
      criticalSituationCompliance: detail?.critical_situation_compliance
        ? {
            criticalMedicationsDetected: Boolean(detail.critical_situation_compliance.critical_medications_detected),
            status: detail.critical_situation_compliance.status ?? "UNKNOWN",
          }
        : undefined,
      medicationSafety: detail?.medication_safety
        ? {
            issuesFound: detail.medication_safety.issues_found ?? [],
            totalIssues: toNumber(detail.medication_safety.total_issues),
            status: detail.medication_safety.status ?? "UNKNOWN",
            timestamp: detail.medication_safety.timestamp ?? "",
          }
        : undefined,
      complianceScore: toNumber(detail?.compliance_score),
      overallStatus: detail?.overall_status ?? "UNKNOWN",
      recommendations: Array.isArray(detail?.recommendations)
        ? detail.recommendations.map((item: any, index: number) => ({
            priority: toNumber(item?.priority, index + 1),
            severity: item?.severity ?? "UNKNOWN",
            category: item?.category ?? "",
            issue: item?.issue ?? "",
            action: item?.action ?? "",
            regulationReference: item?.regulation_reference,
          }))
        : [],
      timestamp: detail?.timestamp ?? "",
      auditMetadata: detail?.audit_metadata
        ? {
            task: detail.audit_metadata.task ?? "",
            timestamp: detail.audit_metadata.timestamp ?? "",
            agentVersion: detail.audit_metadata.agent_version ?? "",
            modelUsed: detail.audit_metadata.model_used ?? "",
          }
        : undefined,
    },
  };
}

function mapCombinedAssessment(raw: any): CombinedAssessment {
  return {
    overallRiskLevel: raw?.overall_risk_level ?? "UNKNOWN",
    riskFactors: raw?.risk_factors ?? [],
    recommendation: raw?.recommendation ?? "",
    hallucinationRisk: raw?.hallucination_risk ?? "UNKNOWN",
    complianceScore: toNumber(raw?.compliance_score),
    complianceStatus: raw?.compliance_status ?? "UNKNOWN",
    summary: raw?.summary ?? "",
  };
}

function transformComplianceReport(raw: any): ComplianceReport {
  return {
    reportId: raw?.report_id ?? "",
    analysis: {
      hallucinationAnalysis: mapHallucinationAnalysis(raw?.analysis?.hallucination_analysis),
      complianceAnalysis: mapComplianceAnalysis(raw?.analysis?.compliance_analysis),
      combinedAssessment: mapCombinedAssessment(raw?.analysis?.combined_assessment ?? {}),
    },
    inputSummary: {
      promptLength: toNumber(raw?.input_summary?.prompt_length),
      outputLength: toNumber(raw?.input_summary?.output_length),
      hasDocuments: Boolean(raw?.input_summary?.has_documents),
    },
    status: raw?.status ?? "unknown",
    timestamp: raw?.timestamp ?? "",
  };
}

function transformVerificationResult(raw: any): VerificationResult {
  return {
    response: raw?.response as AIResponse,
    report: transformComplianceReport(raw?.report ?? {}),
  };
}

