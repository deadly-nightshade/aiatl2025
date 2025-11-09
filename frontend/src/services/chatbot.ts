const CHATBOT_BASE_URL = import.meta.env.VITE_CHATBOT_BASE_URL ?? "http://localhost:7001";

async function handleChatbotResponse(response: Response): Promise<unknown> {
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Chatbot request failed with status ${response.status}`);
  }

  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
}

export async function sendPromptToChatbot(prompt: string): Promise<string> {
  const response = await fetch(new URL("/api/chat", CHATBOT_BASE_URL).toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message: prompt }),
  });

  const data = await handleChatbotResponse(response);

  if (typeof data === "string") {
    return data;
  }

  if (data && typeof data === "object") {
    if ("message" in data && typeof (data as Record<string, unknown>).message === "string") {
      return (data as Record<string, string>).message;
    }

    if ("response" in data && typeof (data as Record<string, unknown>).response === "string") {
      return (data as Record<string, string>).response;
    }

    if ("text" in data && typeof (data as Record<string, unknown>).text === "string") {
      return (data as Record<string, string>).text;
    }
  }

  return JSON.stringify(data);
}

