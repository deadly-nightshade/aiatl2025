export type AIResponseStatus = "pending" | "verifying" | "verified" | "warning" | "failed";

export type AIRole = "user" | "assistant";

export interface BotOutputPayload {
  id: string;
  prompt?: string;
  content: string;
  createdAt: string;
  confidence?: number;
  metadata?: Record<string, unknown>;
  role?: AIRole;
  status?: AIResponseStatus;
}

export interface AIResponse extends BotOutputPayload {
  status: AIResponseStatus;
  verifiedAt?: string;
}

export interface ClaimVerificationSource {
  title?: string;
  url?: string;
}

export interface ClaimVerification {
  claim: string;
  verificationStatus: string;
  evidence: string;
  confidence: number;
  sources: ClaimVerificationSource[];
}

export interface HallucinationIssue {
  issueType: string;
  description: string;
  evidence: string;
  riskLevel: string;
  explanation: string;
}

export interface CitationAssessment {
  citation: string;
  assessment: string;
  riskLevel: string;
  explanation: string;
  completenessScore: number;
}

export interface HallucinationAnalysisDetail {
  confidenceScore: number;
  reasoning: string;
  issuesDetected: HallucinationIssue[];
  citationAnalysis: CitationAssessment[];
  claimVerifications: ClaimVerification[];
  riskLevel: string;
  totalIssues: number;
  totalCitations: number;
  timestamp: string;
}

export interface HallucinationAnalysisResult {
  task: string;
  status: string;
  detail: HallucinationAnalysisDetail;
}

export interface PhiPatternViolation {
  type: string;
  count: number;
  severity: string;
  remediation?: string;
  details?: Record<string, unknown>;
}

export interface PhiAiAnalysis {
  foundPhi: unknown[];
  contextualReidentification: unknown[];
  overallRisk: string;
  mitigationSteps: string[];
  confidence: string;
}

export interface PhiViolations {
  patternViolations: PhiPatternViolation[];
  aiAnalysis: PhiAiAnalysis;
  quasiIdentifierRisk?: {
    quasiIdentifiersPresent: string[];
    count: number;
    reidentificationRisk: string;
    recommendation?: string;
  };
  totalViolations: number;
  confidenceScore: number;
  timestamp: string;
}

export interface RegulatoryCompliance {
  violations: unknown[];
  regulatoryContextPresent: boolean;
  totalViolations: number;
  status: string;
  timestamp: string;
}

export interface FdaViolation {
  id: string;
  type: string;
  description: string;
  severity: string;
  regulation: string;
}

export interface FdaAnalysis {
  violations: FdaViolation[];
  offLabelUsesWithoutDisclosure: string[];
  missingBlackBoxWarnings: string[];
  approvalStatusIssues: string[];
  falseEfficacyClaims: string[];
  recommendedRemediations: string[];
  overallRiskLevel: string;
}

export interface ComplianceRecommendation {
  priority: number;
  severity: string;
  category: string;
  issue: string;
  action: string;
  regulationReference?: string;
}

export interface ComplianceAnalysisDetail {
  phiViolations: PhiViolations;
  regulatoryCompliance: RegulatoryCompliance;
  fdaCompliance: {
    fdaAnalysis: FdaAnalysis;
    parseSuccessful: boolean;
    timestamp: string;
  };
  criticalSituationCompliance?: {
    criticalMedicationsDetected: boolean;
    status: string;
  };
  medicationSafety?: {
    issuesFound: unknown[];
    totalIssues: number;
    status: string;
    timestamp: string;
  };
  complianceScore: number;
  overallStatus: string;
  recommendations: ComplianceRecommendation[];
  timestamp: string;
  auditMetadata?: {
    task: string;
    timestamp: string;
    agentVersion: string;
    modelUsed: string;
  };
}

export interface ComplianceAnalysisResult {
  task: string;
  status: string;
  detail: ComplianceAnalysisDetail;
}

export interface CombinedAssessment {
  overallRiskLevel: string;
  riskFactors: string[];
  recommendation: string;
  hallucinationRisk: string;
  complianceScore: number;
  complianceStatus: string;
  summary: string;
}

export interface InputSummary {
  promptLength: number;
  outputLength: number;
  hasDocuments: boolean;
}

export interface ComplianceReportAnalysis {
  hallucinationAnalysis: HallucinationAnalysisResult;
  complianceAnalysis: ComplianceAnalysisResult;
  combinedAssessment: CombinedAssessment;
}

export interface ComplianceReport {
  reportId: string;
  analysis: ComplianceReportAnalysis;
  inputSummary: InputSummary;
  status: string;
  timestamp: string;
}

export interface VerificationRequest {
  id: string;
  content: string;
}

export interface VerificationResult {
  response: AIResponse;
  report: ComplianceReport;
}

