import { CheckCircle, AlertTriangle, FileText, Loader2, TriangleAlert, ExternalLink } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { AIResponse, ComplianceReport as ComplianceReportData } from "@/types/ai";

interface ComplianceReportProps {
  report?: ComplianceReportData | null;
  response?: AIResponse | null;
  isLoading?: boolean;
}

export function ComplianceReport({ report = null, response = null, isLoading = false }: ComplianceReportProps) {
  if (isLoading) {
    return (
      <Card className="rounded-3xl border border-border/60 bg-card/80 shadow-lg backdrop-blur transition-colors animate-pulse">
        <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-info/5">
          <div className="h-6 bg-muted rounded-lg w-1/3 mb-2" />
          <div className="h-4 bg-muted rounded-lg w-2/3" />
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-muted rounded-xl" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!report) {
    return (
      <Card className="rounded-3xl border border-border/60 bg-card/80 shadow-lg backdrop-blur transition-colors">
        <CardContent className="p-12 text-center">
          {response?.status === "verifying" && (
            <>
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary/20 to-info/20 flex items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
              </div>
              <p className="text-lg font-semibold mb-2">Verification in progress</p>
              <p className="text-sm text-muted-foreground">
                We’re validating the selected response for compliance. Reports appear here when checks complete.
              </p>
            </>
          )}
          {response?.status === "failed" && (
            <>
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
                <TriangleAlert className="h-10 w-10 text-destructive" />
              </div>
              <p className="text-lg font-semibold mb-2">Verification failed</p>
              <p className="text-sm text-muted-foreground">
                {response.metadata?.verificationError
                  ? String(response.metadata.verificationError)
                  : "The verification service could not process this response."}
              </p>
            </>
          )}
          {!response && (
            <>
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary/20 to-info/20 flex items-center justify-center">
                <FileText className="w-10 h-10 text-muted-foreground" />
              </div>
              <p className="text-lg font-semibold mb-2">Select a response</p>
              <p className="text-sm text-muted-foreground">
                Choose an AI output from the feed to review its compliance report once generated.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  const { verified, warnings, citations, generatedAt } = report;
  const totalItems = verified.length + warnings.length + citations.length;

  if (totalItems === 0) {
    return (
      <Card className="rounded-3xl border border-border/60 bg-card/80 shadow-lg backdrop-blur transition-colors">
        <CardContent className="p-12 text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary/20 to-info/20 flex items-center justify-center">
            <FileText className="w-10 h-10 text-muted-foreground" />
          </div>
          <p className="text-lg font-semibold mb-2">No Report Available</p>
          <p className="text-sm text-muted-foreground">
            Upload files and ask questions to generate a compliance report
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-3xl border border-border/60 bg-card/80 shadow-lg backdrop-blur transition-colors">
      <CardHeader className="border-b bg-gradient-to-r from-success/5 via-warning/5 to-info/5">
        <CardTitle className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
            <FileText className="w-4 h-4 text-white" />
          </div>
          Compliance Analysis Report
        </CardTitle>
        <CardDescription>
          Generated {new Date(generatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 p-6">
        {response && (
          <div className="rounded-2xl border border-border/60 bg-background/70 p-4 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="capitalize">
                {response.status === "warning" ? "Verified with warnings" : response.status}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {new Date(response.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            <p className="mt-2 text-muted-foreground">{response.content}</p>
          </div>
        )}
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="group text-center p-6 rounded-xl bg-gradient-success border-2 border-success/30 shadow-lg hover:shadow-xl transition-all hover:scale-105 cursor-pointer">
            <div className="text-3xl font-bold text-white drop-shadow-md">{verified.length}</div>
            <div className="text-xs text-white/90 mt-1 font-medium">Verified</div>
          </div>
          <div className="group text-center p-6 rounded-xl bg-gradient-warning border-2 border-warning/30 shadow-lg hover:shadow-xl transition-all hover:scale-105 cursor-pointer">
            <div className="text-3xl font-bold text-white drop-shadow-md">{warnings.length}</div>
            <div className="text-xs text-white/90 mt-1 font-medium">Warnings</div>
          </div>
          <div className="group text-center p-6 rounded-xl bg-gradient-info border-2 border-info/30 shadow-lg hover:shadow-xl transition-all hover:scale-105 cursor-pointer">
            <div className="text-3xl font-bold text-white drop-shadow-md">{citations.length}</div>
            <div className="text-xs text-white/90 mt-1 font-medium">Citations</div>
          </div>
        </div>

        <Separator />

        {/* Verified Items */}
        {verified.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-success flex items-center justify-center shadow-md">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-semibold text-lg">Verified Compliance</h3>
            </div>
            {verified.map((item, index) => (
              <div
                key={item.id}
                className="p-5 rounded-xl border-2 border-success/30 bg-gradient-to-br from-success/5 to-success/10 transition-all hover:shadow-lg hover:scale-[1.01] animate-slide-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm flex-1">{item.text}</p>
                  {item.confidence && (
                    <Badge variant="secondary" className="shrink-0">
                      {item.confidence}% confident
                    </Badge>
                  )}
                </div>
                {item.source && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Source: {item.source}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-warning flex items-center justify-center shadow-md">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-semibold text-lg">Compliance Warnings</h3>
            </div>
            {warnings.map((item, index) => (
              <div
                key={item.id}
                className="p-5 rounded-xl border-2 border-warning/30 bg-gradient-to-br from-warning/5 to-warning/10 transition-all hover:shadow-lg hover:scale-[1.01] animate-slide-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm flex-1">{item.text}</p>
                  <Badge variant="outline" className="shrink-0 border-warning text-warning">
                    Review Required
                  </Badge>
                </div>
                {item.source && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Source: {item.source}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Citations */}
        {citations.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-info flex items-center justify-center shadow-md">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-semibold text-lg">Referenced Citations</h3>
            </div>
            {citations.map((item, index) => (
              <div
                key={item.id}
                className="p-5 rounded-xl border-2 border-info/30 bg-gradient-to-br from-info/5 to-info/10 transition-all hover:shadow-lg hover:scale-[1.01] group animate-slide-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm flex-1">{item.text}</p>
                  {item.source && (
                    <a
                      href={item.source}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-info hover:text-info/80 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
