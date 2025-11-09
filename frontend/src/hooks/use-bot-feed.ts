import { useCallback, useEffect, useRef, useState } from "react";

import { enrichBotOutputs, fetchBotOutputs, fetchComplianceReport } from "@/services/ai";
import type { AIResponse, AIRole, ComplianceReport } from "@/types/ai";

const POLL_INTERVAL_MS = 4000;

type ReportsById = Record<string, ComplianceReport>;

function readMetadataRole(response: AIResponse): AIRole | undefined {
  const directRole = response.role;
  if (directRole === "user" || directRole === "assistant") {
    return directRole;
  }

  const metadata = response.metadata;
  if (!metadata || typeof metadata !== "object") {
    return undefined;
  }

  const role = (metadata as Record<string, unknown>).role;
  return role === "user" || role === "assistant" ? role : undefined;
}

function isAssistantResponse(response: AIResponse): boolean {
  return readMetadataRole(response) === "assistant";
}

function determineStatusFromReport(report: ComplianceReport): AIResponse["status"] {
  const overallRisk = report.analysis.combinedAssessment.overallRiskLevel?.toUpperCase?.() ?? "UNKNOWN";
  const hallucinationRisk = report.analysis.hallucinationAnalysis.detail.riskLevel?.toUpperCase?.() ?? "UNKNOWN";
  const complianceStatus = report.analysis.complianceAnalysis.detail.overallStatus?.toUpperCase?.() ?? "UNKNOWN";

  if ([overallRisk, hallucinationRisk, complianceStatus].some((risk) => ["HIGH", "CRITICAL"].includes(risk))) {
    return "warning";
  }

  return "verified";
}

const STATUS_PRIORITY: Record<AIResponse["status"] | "unknown", number> = {
  failed: 5,
  warning: 4,
  verified: 3,
  verifying: 2,
  pending: 1,
  unknown: 0,
};

function preferStatus(existing?: AIResponse["status"], incoming?: AIResponse["status"]): AIResponse["status"] | undefined {
  const existingKey = (existing ?? "unknown") as AIResponse["status"] | "unknown";
  const incomingKey = (incoming ?? "unknown") as AIResponse["status"] | "unknown";

  return STATUS_PRIORITY[incomingKey] >= STATUS_PRIORITY[existingKey] ? incoming : existing;
}

export function useBotFeed() {
  const [responses, setResponses] = useState<AIResponse[]>([]);
  const [reports, setReports] = useState<ReportsById>({});
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMounted = useRef(true);

  const mergeResponses = useCallback((incoming: AIResponse[]) => {
    setResponses((prev) => {
      const merged = new Map<string, AIResponse>();
      for (const response of prev) {
        merged.set(response.id, response);
      }
      for (const response of incoming) {
        const existing = merged.get(response.id);
        if (existing) {
          merged.set(response.id, {
            ...existing,
            ...response,
            status: preferStatus(existing.status, response.status) ?? response.status ?? existing.status,
          });
        } else {
          merged.set(response.id, response);
        }
      }

      return Array.from(merged.values()).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    });
  }, []);

  const updateResponse = useCallback((responseId: string, updater: (current: AIResponse) => AIResponse) => {
    setResponses((prev) =>
      prev.map((response) => (response.id === responseId ? updater(response) : response)),
    );
  }, []);

  const fetchReportIfReady = useCallback(
    async (response: AIResponse) => {
      if (!isAssistantResponse(response)) return;
      if (response.status === "failed") return;

      try {
        const report = await fetchComplianceReport(response.id);

        setReports((prev) => ({
          ...prev,
          [response.id]: report,
        }));
        setLastUpdated(new Date().toISOString());
        updateResponse(response.id, (current) => ({
          ...current,
          status: determineStatusFromReport(report),
        }));
      } catch (error) {
        // report not ready yet or fetch failed; ignore and let next poll retry
      }
    },
    [updateResponse],
  );

  const pullBotOutputs = useCallback(async () => {
    setIsPolling(true);
    setError(null);

    try {
      const outputs = await fetchBotOutputs();

      if (!isMounted.current || outputs.length === 0) {
        return;
      }

      const enriched = enrichBotOutputs(outputs);
      mergeResponses(enriched);
      setLastUpdated(new Date().toISOString());

      for (const response of enriched) {
        if (isAssistantResponse(response)) {
          const adjustedResponse =
            response.status === "pending" ? { ...response, status: "verifying" as AIResponse["status"] } : response;

          if (response.status === "pending") {
            updateResponse(response.id, (current) => ({ ...current, status: "verifying" }));
          }

          void fetchReportIfReady(adjustedResponse);
        }
      }
    } catch (pollError) {
      if (!isMounted.current) return;
      setError(pollError instanceof Error ? pollError.message : String(pollError));
    } finally {
      if (isMounted.current) {
        setIsPolling(false);
      }
    }
  }, [fetchReportIfReady, mergeResponses, updateResponse]);

  const manualRefresh = useCallback(() => {
    void pullBotOutputs();
  }, [pullBotOutputs]);

  useEffect(() => {
    if (!isMounted.current) return;

    setResponses((prev) =>
      prev.map((response) => {
        if (!isAssistantResponse(response)) {
          return response;
        }

        const report = reports[response.id];
        if (!report) {
          return response;
        }

        const targetStatus = determineStatusFromReport(report);
        if (response.status === targetStatus) {
          return response;
        }

        return {
          ...response,
          status: targetStatus,
        };
      }),
    );
  }, [reports]);

  useEffect(() => {
    isMounted.current = true;
    pullBotOutputs();

    pollTimer.current = setInterval(() => {
      pullBotOutputs();
    }, POLL_INTERVAL_MS);

    return () => {
      isMounted.current = false;
      if (pollTimer.current) {
        clearInterval(pollTimer.current);
      }
    };
  }, [pullBotOutputs]);

  return {
    responses,
    reports,
    isPolling,
    error,
    lastUpdated,
    refresh: manualRefresh,
  };
}

