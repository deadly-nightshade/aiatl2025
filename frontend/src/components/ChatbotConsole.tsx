import { useMemo, useState } from "react";
import { MessageSquare, RefreshCcw, TriangleAlert } from "lucide-react";

import { ChatInput } from "@/components/ChatInput";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import { recordBotInteraction } from "@/services/ai";
import { sendPromptToChatbot } from "@/services/chatbot";

type InteractionStatus = "pending" | "success" | "error";

interface Interaction {
  id: string;
  prompt: string;
  status: InteractionStatus;
  createdAt: string;
  response?: string;
  completedAt?: string;
  error?: string;
}

interface ChatbotConsoleProps {
  onInteractionRecorded?: () => Promise<void> | void;
}

const generateId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `interaction-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export function ChatbotConsole({ onInteractionRecorded }: ChatbotConsoleProps) {
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [isSending, setIsSending] = useState(false);

  const handleInteractionRecorded = async () => {
    try {
      await onInteractionRecorded?.();
    } catch {
      // no-op: upstream refresh failures should not break UX
    }
  };

  const handleSend = async (prompt: string) => {
    const id = generateId();
    const createdAt = new Date().toISOString();
    const nextInteraction: Interaction = {
      id,
      prompt,
      status: "pending",
      createdAt,
    };

    setInteractions((prev) => [nextInteraction, ...prev]);
    setIsSending(true);

    try {
      const response = await sendPromptToChatbot(prompt);
      const completedAt = new Date().toISOString();

      setInteractions((prev) =>
        prev.map((entry) =>
          entry.id === id
            ? {
                ...entry,
                response,
                status: "success",
                completedAt,
                error: undefined,
              }
            : entry,
        ),
      );

      await recordBotInteraction({
        prompt,
        response,
        metadata: {
          source: "local-chatbot",
          deliveredAt: completedAt,
        },
      });

      await handleInteractionRecorded();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to contact local chatbot";

      setInteractions((prev) =>
        prev.map((entry) =>
          entry.id === id
            ? {
                ...entry,
                status: "error",
                error: message,
              }
            : entry,
        ),
      );
    } finally {
      setIsSending(false);
    }
  };

  const hasInteractions = interactions.length > 0;

  const sortedInteractions = useMemo(
    () => [...interactions].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [interactions],
  );

  return (
    <div className="space-y-6">
      <ChatInput
        onSend={handleSend}
        isLoading={isSending}
        placeholder="Send a prompt to your local chatbot..."
      />

      <Card className="rounded-3xl border border-border/60 bg-card/80 shadow-lg backdrop-blur transition-colors">
        <CardHeader className="border-b bg-gradient-to-r from-info/5 to-primary/5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-info/40 to-primary/40 text-white shadow-glow">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Local Chatbot Session</CardTitle>
              <CardDescription>Track prompts you send and the responses returned on port 7001</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {!hasInteractions ? (
            <div className="rounded-2xl border border-dashed border-border/60 bg-background/40 p-8 text-center text-sm text-muted-foreground">
              Prompts you send to the local chatbot will appear here along with the captured responses.
            </div>
          ) : (
            <div className="space-y-5">
              {sortedInteractions.map((interaction) => (
                <div
                  key={interaction.id}
                  className="rounded-2xl border border-border/40 bg-background/60 p-4 shadow-sm transition-colors"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{new Date(interaction.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      {interaction.completedAt && interaction.status === "success" && (
                        <>
                          <span>•</span>
                          <span>
                            completed {new Date(interaction.completedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </>
                      )}
                    </div>
                    <Badge
                      variant={interaction.status === "success" ? "secondary" : "outline"}
                      className={
                        interaction.status === "success"
                          ? "bg-success/10 text-success border-success/20"
                          : interaction.status === "error"
                            ? "bg-destructive/10 text-destructive border-destructive/20"
                            : "bg-info/10 text-info border-info/20"
                      }
                    >
                      {interaction.status === "pending" && "Awaiting response"}
                      {interaction.status === "success" && "Captured"}
                      {interaction.status === "error" && "Failed"}
                    </Badge>
                  </div>

                  <Separator className="my-4" />

                  <div className="space-y-4 text-sm leading-relaxed">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Prompt</p>
                      <p className="mt-1 whitespace-pre-wrap rounded-xl border border-border/30 bg-background/50 p-3 text-foreground/90">
                        {interaction.prompt}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Chatbot response</p>
                      {interaction.status === "pending" && (
                        <div className="mt-1 rounded-xl border border-info/30 bg-info/10 p-3 text-info">
                          Waiting for local chatbot...
                        </div>
                      )}

                      {interaction.status === "error" && (
                        <div className="mt-1 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-destructive">
                          <TriangleAlert className="h-4 w-4 shrink-0" />
                          <span>{interaction.error ?? "Unable to reach local chatbot"}</span>
                        </div>
                      )}

                      {interaction.status === "success" && (
                        <div className="mt-1 whitespace-pre-wrap rounded-xl border border-border/30 bg-background/50 p-3 text-foreground/90">
                          {interaction.response}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              <div className="flex justify-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => setInteractions([])}
                  disabled={isSending || !hasInteractions}
                >
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Clear local log
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

