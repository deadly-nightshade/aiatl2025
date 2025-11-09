import { AlertTriangle, CheckCircle, ExternalLink, FileText, Loader2, ShieldAlert, ShieldCheck, TriangleAlert } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { AIResponse, ComplianceReport as ComplianceReportData, HallucinationIssue, FdaViolation, ComplianceRecommendation } from "@/types/ai";

interface ComplianceReportProps {
  report?: ComplianceReportData | null;
  response?: AIResponse | null;
  isLoading?: boolean;
}

function RiskBadge({ label }: { label: string }) {
  const normalized = label.toUpperCase();
  if (normalized.includes("CRITICAL") || normalized.includes("HIGH")) {
    return <Badge variant="destructive">{label}</Badge>;
  }
  if (normalized.includes("MEDIUM")) {
    return <Badge variant="outline" className="border-warning text-warning">{label}</Badge>;
  }
  return <Badge variant="secondary">{label}</Badge>;
}

function IssueCard({ issue }: { issue: HallucinationIssue }) {
  return (
    <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm space-y-2">
      <div className="flex items-center gap-2 text-destructive font-semibold">
        <ShieldAlert className="h-4 w-4" />
        <span>{issue.issueType}</span>
        <RiskBadge label={issue.riskLevel} />
      </div>
      <p className="text-sm text-foreground/90">{issue.description}</p>
      <p className="text-xs text-muted-foreground">
        <strong>Evidence:</strong> {issue.evidence}
      </p>
      <p className="text-xs text-muted-foreground">
        <strong>Explanation:</strong> {issue.explanation}
      </p>
    </div>
  );
}

function ViolationCard({ violation }: { violation: FdaViolation }) {
  return (
    <div className="rounded-2xl border border-warning/40 bg-warning/10 p-4 text-sm space-y-2">
      <div className="flex items-center gap-2 text-warning font-semibold">
        <AlertTriangle className="h-4 w-4" />
        <span>{violation.type}</span>
        <RiskBadge label={violation.severity} />
      </div>
      <p className="text-sm text-foreground/90">{violation.description}</p>
      <p className="text-xs text-muted-foreground">
        <strong>Regulation:</strong> {violation.regulation}
      </p>
    </div>
  );
}

function RecommendationCard({ recommendation }: { recommendation: ComplianceRecommendation }) {
  return (
    <div className="rounded-2xl border border-info/40 bg-info/10 p-4 text-sm space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-info font-semibold">
        <ShieldCheck className="h-4 w-4" />
        <span>{recommendation.category}</span>
        <Badge variant="outline" className="border-info text-info">
          Priority {recommendation.priority}
        </Badge>
        <RiskBadge label={recommendation.severity} />
      </div>
      <p className="text-sm text-foreground/90">
        <strong>Issue:</strong> {recommendation.issue}
      </p>
      <p className="text-sm text-foreground/90">
        <strong>Action:</strong> {recommendation.action}
      </p>
      {recommendation.regulationReference && (
        <p className="text-xs text-muted-foreground">
          Regulation: {recommendation.regulationReference}
        </p>
      )}
    </div>
  );
}

export function ComplianceReport({ report = null, response = null, isLoading = false }: ComplianceReportProps) {
  if (isLoading) {
    return (
      <Card className="rounded-3xl border border-border/60 bg-card/80 shadow-lg backdrop-blur transition-colors animate-pulse">
        <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-info/5">
          <div className="h-6 w-1/3 rounded-lg bg-muted mb-2" />
          <div className="h-4 w-2/3 rounded-lg bg-muted" />
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-xl bg-muted" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!report) {
    return (
      <Card className="rounded-3xl border border-border/60 bg-card/80 shadow-lg backdrop-blur transition-colors">
        <CardContent className="p-12 text-center space-y-4">
          {response?.status === "verifying" && (
            <>
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-info/20">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
              </div>
              <div className="space-y-1">
                <p className="text-lg font-semibold">Verification in progress</p>
                <p className="text-sm text-muted-foreground">
                  We’re validating the selected response for compliance. Reports appear here when checks complete.
                </p>
              </div>
            </>
          )}
          {response?.status === "failed" && (
            <>
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
                <TriangleAlert className="h-10 w-10 text-destructive" />
              </div>
              <div className="space-y-1">
                <p className="text-lg font-semibold">Verification failed</p>
                <p className="text-sm text-muted-foreground">
                  {response.metadata?.verificationError
                    ? String(response.metadata.verificationError)
                    : "The verification service could not process this response."}
                </p>
              </div>
            </>
          )}
          {!response && (
            <>
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-info/20">
                <FileText className="h-10 w-10 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="text-lg font-semibold">Select a response</p>
                <p className="text-sm text-muted-foreground">
                  Choose an AI output from the feed to review its compliance report once generated.
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  const { analysis, inputSummary, timestamp } = report;
  const hallucination = analysis.hallucinationAnalysis;
  const hallucinationDetail = hallucination.detail;
  const compliance = analysis.complianceAnalysis;
  const combined = analysis.combinedAssessment;

  const overallRiskLabel =
    combined.overallRiskLevel && combined.overallRiskLevel !== "UNKNOWN"
      ? combined.overallRiskLevel
      : hallucinationDetail.riskLevel ?? compliance.detail.overallStatus ?? "UNKNOWN";

  const hallucinationRiskLabel =
    combined.hallucinationRisk && combined.hallucinationRisk !== "UNKNOWN"
      ? combined.hallucinationRisk
      : hallucinationDetail.riskLevel ?? "UNKNOWN";

  const complianceScoreValue = combined.complianceScore || compliance.detail.complianceScore;
  const complianceStatusLabel =
    combined.complianceStatus && combined.complianceStatus !== "UNKNOWN"
      ? combined.complianceStatus
      : compliance.detail.overallStatus ?? "UNKNOWN";
  const fdaViolations = compliance.detail.fdaCompliance.fdaAnalysis.violations;
  const recommendations = compliance.detail.recommendations;
  const phiViolations = compliance.detail.phiViolations.patternViolations;

  return (
    <Card className="rounded-3xl border border-border/60 bg-card/80 shadow-lg backdrop-blur transition-colors">
      <CardHeader className="border-b bg-gradient-to-r from-primary/5 via-info/5 to-accent/5">
        <CardTitle className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary">
            <FileText className="h-4 w-4 text-white" />
          </div>
          Compliance & Hallucination Report
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Generated {new Date(timestamp).toLocaleString()} · Prompt {inputSummary.promptLength} chars · Output {inputSummary.outputLength} chars
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8 p-6">
        {response && (
          <div className="rounded-2xl border border-border/60 bg-background/70 p-4 text-sm space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="uppercase tracking-wide">
                {response.status}
              </Badge>
              <span className="text-xs text-muted-foreground">
                Captured {new Date(response.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            <p className="text-sm text-foreground/90 whitespace-pre-wrap">{response.content}</p>
          </div>
        )}

        <section className="rounded-2xl border border-border/50 bg-card/70 p-5 shadow-inner space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <RiskBadge label={overallRiskLabel} />
            <Badge variant="outline" className="border-primary text-primary">
              Hallucination risk: {hallucinationRiskLabel}
            </Badge>
            <Badge variant="outline" className="border-muted-foreground text-muted-foreground">
              Compliance score: {complianceScoreValue}
            </Badge>
            <Badge variant="outline" className="border-secondary text-secondary-foreground">
              Compliance status: {complianceStatusLabel}
            </Badge>
          </div>
          <p className="text-lg font-semibold text-foreground">{combined.recommendation}</p>
          <p className="text-sm text-muted-foreground">{combined.summary}</p>
          {combined.riskFactors?.length > 0 && (
            <ul className="list-disc pl-6 text-xs text-muted-foreground space-y-1">
              {combined.riskFactors.map((factor, index) => (
                <li key={`risk-${index}`}>{factor}</li>
              ))}
            </ul>
          )}
        </section>

        <Separator />

        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/20">
              <ShieldAlert className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Hallucination Findings</h3>
              <p className="text-xs text-muted-foreground">
                Confidence score {hallucinationDetail.confidenceScore.toFixed(2)} · {hallucinationDetail.riskLevel} risk
              </p>
            </div>
          </div>

          {hallucinationDetail.issuesDetected.length === 0 ? (
            <div className="rounded-2xl border border-success/40 bg-success/10 p-4 text-sm text-success">
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle className="h-4 w-4" />
                No hallucination issues detected
              </div>
              <p className="text-xs text-success/90 mt-1">{hallucinationDetail.reasoning}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {hallucinationDetail.issuesDetected.map((issue, index) => (
                <IssueCard key={`${issue.issueType}-${index}`} issue={issue} />
              ))}
            </div>
          )}

          {hallucinationDetail.citationAnalysis.length > 0 && (
            <div className="space-y-3">
              <Separator />
              <h4 className="text-sm font-semibold text-foreground">Citation Review</h4>
              <div className="grid gap-3">
                {hallucinationDetail.citationAnalysis.map((citation, index) => (
                  <div
                    key={`${citation.citation}-${index}`}
                    className="rounded-2xl border border-info/40 bg-info/10 p-4 text-sm space-y-2"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="border-info text-info">
                        {citation.citation}
                      </Badge>
                      <RiskBadge label={citation.riskLevel} />
                      <span className="text-xs text-muted-foreground">Completeness {citation.completenessScore}/10</span>
                    </div>
                    <p className="text-foreground/90 text-sm">{citation.assessment}</p>
                    <p className="text-xs text-muted-foreground">{citation.explanation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <Separator />

        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/20">
              <AlertTriangle className="h-5 w-5 text-warning" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Compliance Flags</h3>
              <p className="text-xs text-muted-foreground">
                Score {compliance.detail.complianceScore} · {compliance.detail.overallStatus}
              </p>
            </div>
          </div>

          {phiViolations.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground">PHI Pattern Violations</h4>
              {phiViolations.map((violation, index) => (
                <div
                  key={`${violation.type}-${index}`}
                  className="rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <RiskBadge label={violation.severity} />
                    <span className="font-medium">{violation.type}</span>
                    <span className="text-xs text-muted-foreground">Count: {violation.count}</span>
                  </div>
                  {violation.remediation && (
                    <p className="text-xs text-muted-foreground">
                      Remediation: {violation.remediation}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {fdaViolations.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground">FDA Regulatory Violations</h4>
              {fdaViolations.map((violation) => (
                <ViolationCard key={violation.id} violation={violation} />
              ))}
            </div>
          )}

          {compliance.detail.fdaCompliance.fdaAnalysis.offLabelUsesWithoutDisclosure?.length > 0 && (
            <div className="rounded-2xl border border-warning/30 bg-warning/5 p-4 text-xs text-muted-foreground">
              <strong>Off-label uses:</strong> {compliance.detail.fdaCompliance.fdaAnalysis.offLabelUsesWithoutDisclosure.join(", ")}
            </div>
          )}

          {compliance.detail.fdaCompliance.fdaAnalysis.falseEfficacyClaims?.length > 0 && (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-xs text-muted-foreground space-y-1">
              <strong>False efficacy claims:</strong>
              <ul className="list-disc pl-6 space-y-1">
                {compliance.detail.fdaCompliance.fdaAnalysis.falseEfficacyClaims.map((claim, index) => (
                  <li key={`claim-${index}`}>{claim}</li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <Separator />

        {recommendations.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-info/20">
                <ShieldCheck className="h-5 w-5 text-info" />
              </div>
              <h3 className="text-lg font-semibold">Recommended Remediations</h3>
            </div>
            <div className="space-y-3">
              {recommendations.map((recommendation, index) => (
                <RecommendationCard key={`rec-${index}`} recommendation={recommendation} />
              ))}
            </div>
          </section>
        )}

        {compliance.detail.regulatoryCompliance.violations?.length > 0 && (
          <section className="space-y-2 text-xs text-muted-foreground">
            <Separator />
            <h4 className="text-sm font-semibold text-foreground">Regulatory Notes</h4>
            <ul className="list-disc pl-6 space-y-1">
              {compliance.detail.regulatoryCompliance.violations.map((violation, index) => (
                <li key={`reg-${index}`}>{String(violation)}</li>
              ))}
            </ul>
          </section>
        )}

        {hallucinationDetail.timestamp && (
          <p className="text-xs text-muted-foreground">Hallucination audit: {new Date(hallucinationDetail.timestamp).toLocaleString()}</p>
        )}
        {compliance.detail.timestamp && (
          <p className="text-xs text-muted-foreground">Compliance audit: {new Date(compliance.detail.timestamp).toLocaleString()}</p>
        )}
      </CardContent>
    </Card>
  );
}
