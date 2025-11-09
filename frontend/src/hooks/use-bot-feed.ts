import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  enrichBotOutputs,
  fetchBotOutputs,
  fetchComplianceReport,
  requestVerification,
} from "@/services/ai";
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

export function useBotFeed() {
  const [responses, setResponses] = useState<AIResponse[]>([]);
  const [reports, setReports] = useState<ReportsById>({});
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMounted = useRef(true);

  const latestResponseId = useMemo(() => responses.at(-1)?.id, [responses]);

  const updateResponse = useCallback((responseId: string, updater: (current: AIResponse) => AIResponse) => {
    setResponses((prev) =>
      prev.map((response) => (response.id === responseId ? updater(response) : response)),
    );
  }, []);

  const handleVerification = useCallback(
    async (response: AIResponse) => {
      if (!isAssistantResponse(response)) {
        return;
      }

      updateResponse(response.id, (current) => ({ ...current, status: "verifying" }));

      try {
        const result = await requestVerification({
          id: response.id,
          content: response.content,
        });

        if (!isMounted.current) return;

        setReports((prev) => ({
          ...prev,
          [result.response.id]: result.report,
        }));
        setLastUpdated(new Date().toISOString());

        updateResponse(result.response.id, () => ({
          ...result.response,
          status: result.report.warnings.length > 0 ? "warning" : "verified",
        }));
      } catch (verificationError) {
        if (!isMounted.current) return;

        updateResponse(response.id, (current) => ({
          ...current,
          status: "failed",
          metadata: {
            ...current.metadata,
            verificationError: verificationError instanceof Error ? verificationError.message : String(verificationError),
          },
        }));
        setLastUpdated(new Date().toISOString());
      }
    },
    [updateResponse],
  );

  const pullBotOutputs = useCallback(async () => {
    setIsPolling(true);
    setError(null);

    try {
      const outputs = await fetchBotOutputs(latestResponseId);

      if (!isMounted.current || outputs.length === 0) {
        return;
      }

      const enriched = enrichBotOutputs(outputs);
      setResponses((prev) => [...prev, ...enriched]);
      setLastUpdated(new Date().toISOString());

      for (const response of enriched) {
        await handleVerification(response);
      }
    } catch (pollError) {
      if (!isMounted.current) return;
      setError(pollError instanceof Error ? pollError.message : String(pollError));
    } finally {
      if (isMounted.current) {
        setIsPolling(false);
      }
    }
  }, [handleVerification, latestResponseId]);

  const manualRefresh = useCallback(async () => {
    await pullBotOutputs();

    const pendingIds = responses
      .filter(
        (response) =>
          isAssistantResponse(response) && (response.status === "verifying" || response.status === "pending"),
      )
      .map((response) => response.id);

    if (pendingIds.length === 0) {
      return;
    }

    await Promise.all(
      pendingIds.map(async (responseId) => {
        try {
          const report = await fetchComplianceReport(responseId);
          if (!isMounted.current) return;

          setReports((prev) => ({
            ...prev,
            [responseId]: report,
          }));
          setLastUpdated(new Date().toISOString());

          updateResponse(responseId, (current) => ({
            ...current,
            status: report.warnings.length > 0 ? "warning" : "verified",
          }));
        } catch (refreshError) {
          if (!isMounted.current) return;
          setError(refreshError instanceof Error ? refreshError.message : String(refreshError));
        }
      }),
    );
  }, [pullBotOutputs, responses, updateResponse]);

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

