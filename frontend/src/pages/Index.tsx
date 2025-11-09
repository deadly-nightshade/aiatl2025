import { useEffect, useMemo, useState } from "react";
import { Brain, Database, RefreshCcw, ShieldCheck } from "lucide-react";

import { ComplianceReport } from "@/components/ComplianceReport";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBotFeed } from "@/hooks/use-bot-feed";
import { toast } from "@/hooks/use-toast";
import type { AIResponse, AIRole, ComplianceReport as ComplianceReportType } from "@/types/ai";
import { formatESTDateTime, formatESTTime } from "@/lib/time";

interface Interaction {
  key: string;
  pairId?: string;
  user?: AIResponse;
  assistant?: AIResponse;
  timestamp: string;
}

function readMetadataString(response: AIResponse, key: string): string | undefined {
  const metadata = response.metadata;
  if (!metadata || typeof metadata !== "object") {
    return undefined;
  }

  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === "string" ? value : undefined;
}

function deriveRole(response: AIResponse): AIRole | undefined {
  const directRole = response.role;
  if (directRole === "user" || directRole === "assistant") {
    return directRole;
  }

  const metadataRole = readMetadataString(response, "role");
  if (metadataRole === "user" || metadataRole === "assistant") {
    return metadataRole;
  }

  return undefined;
}

function extractPairId(response: AIResponse): string | undefined {
  const candidates = [
    "pairId",
    "promptId",
    "parentId",
    "userMessageId",
    "messageId",
    "conversationId",
    "threadId",
    "interactionId",
  ];

  for (const key of candidates) {
    const value = readMetadataString(response, key);
    if (value) {
      return value;
    }
  }

  return undefined;
}

function interactionTimestamp(interaction: Interaction): string {
  if (interaction.assistant) {
    return interaction.assistant.createdAt;
  }
  if (interaction.user) {
    return interaction.user.createdAt;
  }
  return new Date(0).toISOString();
}

const ROLE_STYLES: Record<AIRole, { icon: string; label: string; container: string; badge: string; accent: string }> = {
  user: {
    icon: "👤",
    label: "User prompt",
    container: "border-info/30 bg-info/5",
    badge: "border-info/30 bg-info/15 text-info",
    accent: "bg-info/70",
  },
  assistant: {
    icon: "🤖",
    label: "Assistant response",
    container: "border-success/30 bg-success/5",
    badge: "border-success/30 bg-success/15 text-success",
    accent: "bg-success/70",
  },
};

function getStatusDisplay(status?: AIResponse["status"]) {
  switch (status) {
    case "verifying":
      return {
        label: "Verifying",
        className: "border-info/30 bg-info/10 text-info",
      };
    case "verified":
      return {
        label: "Verified",
        className: "border-success/30 bg-success/10 text-success",
      };
    case "warning":
      return {
        label: "Warning",
        className: "border-warning/30 bg-warning/10 text-warning",
      };
    case "failed":
      return {
        label: "Failed",
        className: "border-destructive/30 bg-destructive/10 text-destructive",
      };
    default:
      return {
        label: "Pending",
        className: "border-muted/40 bg-muted/10 text-muted-foreground",
      };
  }
}

export default function Index() {
  const { responses, reports, isPolling, error, lastUpdated, refresh } = useBotFeed();
  const [selectedResponseId, setSelectedResponseId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  const assistantResponses = useMemo(
    () => responses.filter((response) => deriveRole(response) === "assistant"),
    [responses],
  );

  useEffect(() => {
    if (assistantResponses.length === 0) {
      setSelectedResponseId(null);
      return;
    }

    const hasSelectedAssistant = assistantResponses.some((response) => response.id === selectedResponseId);
    if (!hasSelectedAssistant) {
      setSelectedResponseId(assistantResponses[assistantResponses.length - 1].id);
    }
  }, [assistantResponses, selectedResponseId]);

  useEffect(() => {
    if (error) {
      toast({
        title: "Bot feed error",
        description: error,
      });
    }
  }, [error]);

  const activeReport = useMemo(
    () => (selectedResponseId ? reports[selectedResponseId] ?? null : null),
    [reports, selectedResponseId],
  );

  const selectedResponse = useMemo(
    () => responses.find((response) => response.id === selectedResponseId) ?? null,
    [responses, selectedResponseId],
  );

  const interactions = useMemo(() => {
    if (responses.length === 0) {
      return [] as Interaction[];
    }

    const sorted = [...responses].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

    const items: Interaction[] = [];
    const pairIndex = new Map<string, number>();

    sorted.forEach((entry) => {
      const role = deriveRole(entry);
      const pairId = extractPairId(entry);

      if (role === "user") {
        const key = pairId ?? entry.id;
        const interaction: Interaction = {
          key,
          pairId: pairId ?? key,
          user: entry,
          timestamp: entry.createdAt,
        };

        items.push(interaction);
        if (interaction.pairId) {
          pairIndex.set(interaction.pairId, items.length - 1);
        }
        return;
      }

      if (role === "assistant") {
        const key = pairId ?? entry.id;
        let targetIndex: number | undefined;

        if (pairId && pairIndex.has(pairId)) {
          targetIndex = pairIndex.get(pairId);
        } else {
          for (let i = items.length - 1; i >= 0; i -= 1) {
            if (!items[i].assistant) {
              targetIndex = i;
              break;
            }
          }
        }

        if (typeof targetIndex === "number") {
          const existing = items[targetIndex];
          const merged: Interaction = {
            key: existing.key,
            pairId: existing.pairId ?? pairId ?? existing.key,
            user: existing.user,
            assistant: entry,
            timestamp: entry.createdAt,
          };

          items[targetIndex] = merged;
          if (merged.pairId) {
            pairIndex.set(merged.pairId, targetIndex);
          }
        } else {
          const interaction: Interaction = {
            key,
            pairId: pairId ?? key,
            assistant: entry,
            timestamp: entry.createdAt,
          };

          items.push(interaction);
          if (interaction.pairId) {
            pairIndex.set(interaction.pairId, items.length - 1);
          }
        }
        return;
      }

      // Unknown role fallback
      items.push({
        key: entry.id,
        assistant: entry,
        timestamp: entry.createdAt,
      });
    });

    return items
      .map((interaction) => ({
        ...interaction,
        timestamp: interactionTimestamp(interaction),
      }))
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [responses]);

  const latestInteraction = useMemo(() => interactions.at(-1) ?? null, [interactions]);
  const latestReport = useMemo(
    () => (latestInteraction?.assistant ? reports[latestInteraction.assistant.id] ?? null : null),
    [latestInteraction, reports],
  );

  const verificationStats = useMemo(() => {
    const counters = {
      total: assistantResponses.length,
      verified: 0,
      warning: 0,
      failed: 0,
      inReview: 0,
    };

    assistantResponses.forEach((response) => {
      const normalizedStatus = (response.status ?? "pending").toLowerCase();
      const hasReport = Boolean(reports[response.id]);

      if (normalizedStatus === "warning") {
        counters.warning += 1;
        return;
      }
      if (normalizedStatus === "failed") {
        counters.failed += 1;
        return;
      }
      if (normalizedStatus === "verified" || normalizedStatus === "completed") {
        counters.verified += 1;
        return;
      }

      if (!hasReport) {
        counters.inReview += 1;
        return;
      }

      counters.verified += 1;
    });

    return counters;
  }, [assistantResponses, reports]);

  const topInteractions = useMemo(() => {
    if (interactions.length === 0) return [] as Interaction[];
    return interactions.slice(-2).reverse();
  }, [interactions]);

  const historyInteractions = useMemo(() => {
    if (interactions.length <= topInteractions.length) {
      return [] as Interaction[];
    }
    const sliceIndex = interactions.length - topInteractions.length;
    return interactions.slice(0, sliceIndex).reverse();
  }, [interactions, topInteractions.length]);

  const renderRolePanel = (
    entry: AIResponse | undefined,
    role: AIRole,
    options: { report?: ComplianceReportType | null; placeholderText?: string; showPlaceholder?: boolean } = {},
  ) => {
    if (!entry) {
      if (!options.showPlaceholder) {
        return null;
      }

      return (
        <div className="rounded-2xl border border-dashed border-muted/50 bg-muted/10 p-6 text-sm text-muted-foreground">
          {options.placeholderText ?? "Awaiting assistant response..."}
        </div>
      );
    }

    const roleStyle = ROLE_STYLES[role];
    const showStatus = role === "assistant";
    const statusDisplay = showStatus ? getStatusDisplay(entry.status) : null;
    const timestamp = formatESTTime(entry.createdAt);

    const report = options.report ?? undefined;
    const reportGeneratedAt = report ? formatESTTime(report.timestamp) : null;
    const hallucinationIssueCount = report?.analysis?.hallucinationAnalysis?.detail?.issuesDetected?.length ?? 0;
    const fdaViolationCount = report?.analysis?.complianceAnalysis?.detail?.fdaCompliance?.fdaAnalysis?.violations?.length ?? 0;
    const phiViolationCount = report?.analysis?.complianceAnalysis?.detail?.phiViolations?.patternViolations?.length ?? 0;
    const recommendationCount = report?.analysis?.complianceAnalysis?.detail?.recommendations?.length ?? 0;
    const totalFindings = hallucinationIssueCount + fdaViolationCount + phiViolationCount + recommendationCount;

    return (
      <div className={`space-y-3 rounded-2xl border p-4 shadow-sm ${roleStyle.container}`}>
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-semibold uppercase tracking-wide">
          <span className="inline-flex items-center gap-2">
            <span className={`flex h-8 w-8 items-center justify-center rounded-full text-base ${roleStyle.badge}`}>
              {roleStyle.icon}
            </span>
            {roleStyle.label}
          </span>
          {showStatus && statusDisplay && (
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[0.65rem] font-semibold uppercase ${statusDisplay.className}`}
            >
              Status: {statusDisplay.label}
            </span>
          )}
        </div>
        <div className="max-h-40 overflow-y-auto rounded-xl border border-border/30 bg-background/80 p-3">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{entry.content}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground/80">
          <span>{timestamp}</span>
          {role === "assistant" && typeof entry.confidence === "number" && <span>Confidence {entry.confidence}%</span>}
          {role === "assistant" && report && reportGeneratedAt && <span>Verified {reportGeneratedAt}</span>}
          {role === "assistant" && totalFindings > 0 && <span>Findings: {totalFindings}</span>}
        </div>
      </div>
    );
  };

  const renderInteractionPair = (
    interaction: Interaction,
    options: { report?: ComplianceReportType | null; placeholderText?: string } = {},
  ) => {
    const accent =
      (interaction.assistant && ROLE_STYLES.assistant.accent) ||
      (interaction.user && ROLE_STYLES.user.accent) ||
      "bg-border";

    return (
      <div className="relative overflow-hidden rounded-3xl border border-border/40 bg-background/70 p-5">
        <div className={`absolute inset-y-5 left-0 w-1 rounded-r-full ${accent}`} />
        <div className="space-y-4">
          {renderRolePanel(interaction.user, "user", {
            showPlaceholder: true,
            placeholderText: "User prompt not captured for this response.",
          })}
          {renderRolePanel(interaction.assistant, "assistant", {
            report: options.report,
            showPlaceholder: true,
            placeholderText: options.placeholderText ?? "Awaiting assistant response...",
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-info/10 transition-colors">
      <div className="absolute inset-x-0 top-[-10%] mx-auto h-64 w-3/4 rounded-full bg-gradient-to-br from-primary/10 via-info/10 to-transparent blur-3xl" />
      <div className="container relative mx-auto px-4 py-10">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <nav className="flex w-full justify-center">
            <div className="flex w-full max-w-4xl items-center justify-center rounded-full border border-border/50 bg-card/70 px-6 py-3 shadow-lg backdrop-blur">
              <div className="flex flex-1 justify-center">
                <TabsList className="flex max-w-md flex-1 justify-center gap-3 rounded-full bg-transparent p-0">
                  <TabsTrigger value="overview" className="flex-1 rounded-full px-4 py-2">
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="history" className="flex-1 rounded-full px-4 py-2">
                    History
                  </TabsTrigger>
                  <TabsTrigger value="reports" className="flex-1 rounded-full px-4 py-2">
                    Reports
                  </TabsTrigger>
                </TabsList>
              </div>
            </div>
          </nav>

          <TabsContent value="overview" className="space-y-6">
            <header className="rounded-[2.75rem] border border-border/60 bg-card/60 p-10 shadow-2xl backdrop-blur-3xl">
              <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                <div className="flex items-start gap-4">
                  <img
                    src="/medguard_logo.png"
              alt="HealthGuard AI logo"
              className="h-16 w-16 rounded-2xl shadow-glow ring-1 ring-primary/20"
            />
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                <span className="h-2 w-2 rounded-full bg-primary" />
                Bot Middleware Monitor
              </span>
              <h1 className="mt-4 text-4xl font-bold leading-tight text-foreground md:text-5xl lg:text-6xl">
                      MedGuard AI
              </h1>
              <p className="mt-3 max-w-xl text-base text-muted-foreground md:text-lg">
                      Ensuring every AI answer meets clinical standards.
              </p>
            </div>
            </div>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-2">
              <Card className="border border-border/60 bg-card/80 backdrop-blur">
                <CardHeader className="space-y-2">
                  <CardTitle className="text-xl font-semibold text-indigo_dye-500 dark:text-pale_azure-500">
                    What this middleware does
                  </CardTitle>
                  <CardDescription className="text-sm text-bice_blue-700/80 dark:text-non_photo_blue-700/80">
                    Capture every local GPT exchange, orchestrate automated reviews, and surface clinical assurance in
                    real time.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm leading-relaxed">
                  {[
                    {
                      title: "Seamless capture",
                      body:
                        "Securely ingests prompts and responses from your local GPT instance (port 7001) without disrupting the chat flow.",
                      Icon: Database,
                    },
                    {
                      title: "Intelligent analysis",
                      body:
                        "Runs hallucination detection and compliance validation in FastAPI background tasks, pairing each answer with evidence.",
                      Icon: Brain,
                    },
                    {
                      title: "Transparent oversight",
                      body:
                        "Keeps a living audit trail so you can jump into detailed reports, history, and risk summaries with a single click.",
                      Icon: ShieldCheck,
                    },
                  ].map(({ title, body, Icon }) => (
                    <div
                      key={title}
                      className="flex items-start gap-3 rounded-2xl border border-bice_blue-100/60 bg-white/60 p-4 shadow-sm transition-all duration-200 ease-in-out hover:-translate-y-[2px] hover:shadow-md dark:border-bice_blue-700/50 dark:bg-indigo_dye-200/40"
                    >
                      <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-gradient-to-br from-pale_azure-400/40 to-non_photo_blue-400/30 text-indigo_dye-500 dark:text-indigo_dye-900">
                        <Icon className="h-5 w-5" />
                      </span>
                      <div className="space-y-1">
                        <p className="text-sm font-semibold uppercase tracking-wide text-indigo_dye-500 dark:text-pale_azure-500">
                          {title}
                        </p>
                        <p className="text-sm text-muted-foreground dark:text-non_photo_blue-700/80">{body}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border border-border/60 bg-card/80 backdrop-blur">
                <CardHeader className="space-y-1">
                  <CardTitle className="text-xl font-semibold text-indigo_dye-500 dark:text-pale_azure-500">
                    Verification summary
                  </CardTitle>
                  <CardDescription className="text-sm text-bice_blue-700/80 dark:text-non_photo_blue-700/80">
                    Snapshot of assistant responses by review outcome.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 text-sm text-bice_blue-800 sm:grid-cols-3 dark:text-non_photo_blue-700">
                    {[
                      {
                        label: "Verified",
                        value: verificationStats.verified,
                        accent: "text-non_photo_blue-500",
                        border: "border-non_photo_blue-400/40",
                        description: "Cleared compliance review",
                      },
                      {
                        label: "Warnings",
                        value: verificationStats.warning,
                        accent: "text-picton_blue-400",
                        border: "border-picton_blue-400/40",
                        description: "Needs human review",
                      },
                      {
                        label: "Failed checks",
                        value: verificationStats.failed,
                        accent: "text-bice_blue-300",
                        border: "border-bice_blue-400/40",
                        description: "Blocked downstream use",
                      },
                    ].map(({ label, value, accent, border, description }) => (
                      <div
                        key={label}
                        className={`relative flex flex-col items-center justify-center rounded-2xl border bg-white/70 p-5 text-center shadow-md transition-all duration-200 ease-in-out hover:-translate-y-[2px] hover:shadow-lg dark:bg-indigo_dye-200/40 ${border}`}
                      >
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/80">
                          {label}
                        </p>
                        <p className={`mt-3 text-4xl font-bold ${accent}`}>{value}</p>
                        <p className="mt-2 text-xs text-muted-foreground/70">{description}</p>
                        <div className="absolute inset-x-8 bottom-3 h-[1px] bg-gradient-to-r from-transparent via-muted/30 to-transparent" />
                      </div>
                    ))}
                  </div>
                  <div className="mx-auto mt-6 flex w-full max-w-xs justify-center">
                    <div className="flex h-40 w-40 items-center justify-center rounded-2xl bg-transparent p-3 shadow-sm transition-all duration-200 hover:shadow-lg">
                      <img
                        src="/snoopy.gif"
                        alt="Animated Snoopy celebrating MedGuard AI compliance checks"
                        className="h-full w-full object-contain"
                        loading="lazy"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border border-border/60 bg-card/80 backdrop-blur">
              <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle>Latest verification</CardTitle>
                  <CardDescription>Live view of the latest chatbot response moving through compliance checks</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    Updated {lastUpdated ? formatESTTime(lastUpdated) : "—"}
                  </span>
                  <Button className="rounded-full px-3" onClick={refresh} variant="outline">
                    <RefreshCcw className={`mr-2 h-4 w-4 ${isPolling ? "animate-spin" : ""}`} />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                {latestInteraction ? (
                  renderInteractionPair(latestInteraction, {
                    report: latestReport,
                    placeholderText: "The assistant response will appear here once verification completes.",
                  })
                ) : (
                  <p>No response is currently in verification. The next chatbot reply will appear here.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
          <div className="space-y-6">
              <Card className="border border-border/60 bg-card/80 backdrop-blur">
                <CardHeader>
                  <CardTitle>Archived responses</CardTitle>
                  <CardDescription>Older chatbot prompts and answers captured by the middleware</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {historyInteractions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Once you have more than three responses, earlier entries will move here automatically.
                    </p>
                  ) : (
                    historyInteractions.map((interaction) => {
                      const assistantId = interaction.assistant?.id;
                      const report = assistantId ? reports[assistantId] ?? null : null;

                      return (
                        <Card
                          key={interaction.key}
                          className="border border-border/50 bg-background/70 shadow-sm transition-all hover:shadow-md"
                        >
                          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <CardTitle className="text-base text-foreground">
                                {formatESTDateTime(interactionTimestamp(interaction))}
                              </CardTitle>
                              {interaction.assistant ? (
                                <CardDescription className="capitalize">
                                  Status: {interaction.assistant.status}
                                </CardDescription>
                              ) : null}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (assistantId) {
                                  setSelectedResponseId(assistantId);
                                  setActiveTab("reports");
                                }
                              }}
                              disabled={!assistantId}
                            >
                              View report
                            </Button>
                          </CardHeader>
                          <CardContent className="space-y-4 text-sm text-muted-foreground">
                            {renderInteractionPair(interaction, {
                              report,
                              placeholderText: "The assistant reply associated with this prompt is still pending.",
                            })}
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="reports">
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="space-y-4 lg:col-span-1">
                {topInteractions.length === 0 ? (
                  <Card className="border border-border/60 bg-card/80 backdrop-blur">
                    <CardContent className="p-8 text-center text-sm text-muted-foreground">
                      No responses yet — send a prompt to your chatbot to populate recent reports.
                    </CardContent>
                  </Card>
                ) : (
                  topInteractions.map((interaction) => {
                    const assistantId = interaction.assistant?.id;
                    const report = assistantId ? reports[assistantId] ?? null : null;
                    const isSelected = assistantId ? selectedResponseId === assistantId : false;

                    return (
                      <Card
                        key={interaction.key}
                        className={`border-2 ${
                          isSelected ? "border-primary shadow-lg" : "border-border/60"
                        } bg-card/80 backdrop-blur transition-all hover:shadow-lg`}
                      >
                        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <CardTitle className="text-base text-foreground">
                              Captured {formatESTTime(interactionTimestamp(interaction))}
                            </CardTitle>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (assistantId) {
                                setSelectedResponseId(assistantId);
                                setActiveTab("reports");
                              }
                            }}
                            disabled={!assistantId}
                          >
                            Open report
                          </Button>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm text-muted-foreground">
                          {renderInteractionPair(interaction, {
                            report,
                            placeholderText: "This assistant response is still moving through verification.",
                          })}
                          {!assistantId && (
                            <div className="text-xs text-muted-foreground">
                              Waiting for assistant response to generate a report.
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })
                )}

                {error && (
                  <Card className="border border-destructive/40 bg-destructive/10 text-destructive">
                    <CardContent className="p-4 text-sm">{error}</CardContent>
                  </Card>
                )}
              </div>
              <div className="lg:col-span-2 lg:sticky lg:top-8 lg:h-fit">
                <ComplianceReport
                  report={activeReport}
                  response={selectedResponse}
                  isLoading={selectedResponse?.status === "verifying"}
            />
          </div>
          </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}