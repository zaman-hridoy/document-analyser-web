import type { Chat, Source } from "../types";
import { API_URL } from "./client";

export async function createChat(
  title: string,
  documentIds: string[],
): Promise<Chat> {
  const response = await fetch(`${API_URL}/api/v1/chats`, {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
    },

    body: JSON.stringify({
      title,
      document_ids: documentIds,
    }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);

    throw new Error(data?.error || "Failed to create chat");
  }

  return response.json();
}

type StreamCallbacks = {
  onSources: (sources: Source[]) => void;
  onDelta: (content: string) => void;
  onDone: () => void;
  onError: (message: string) => void;
};

export async function streamMessage(
  chatId: string,
  question: string,
  callbacks: StreamCallbacks,
  signal?: AbortSignal,
) {
  const response = await fetch(
    `${API_URL}/api/v1/chats/${chatId}/messages/stream`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        question,
      }),

      signal,
    },
  );

  if (!response.ok) {
    const data = await response.json().catch(() => null);

    throw new Error(data?.error || "Failed to send message");
  }

  if (!response.body) {
    throw new Error("Streaming response is not available");
  }

  const reader = response.body.getReader();

  const decoder = new TextDecoder();

  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();

    if (done) {
      break;
    }

    buffer += decoder.decode(value, {
      stream: true,
    });

    while (true) {
      const boundary = buffer.indexOf("\n\n");

      if (boundary === -1) {
        break;
      }

      const eventBlock = buffer.slice(0, boundary);

      buffer = buffer.slice(boundary + 2);

      handleSSEEvent(eventBlock, callbacks);
    }
  }
}

function handleSSEEvent(block: string, callbacks: StreamCallbacks) {
  const lines = block.split("\n");

  let eventName = "";
  let dataValue = "";

  for (const line of lines) {
    if (line.startsWith("event:")) {
      eventName = line.slice(6).trim();
    }

    if (line.startsWith("data:")) {
      dataValue += line.slice(5).trim();
    }
  }

  if (!dataValue) {
    return;
  }

  let data: any;

  try {
    data = JSON.parse(dataValue);
  } catch {
    return;
  }

  switch (eventName) {
    case "sources":
      callbacks.onSources(data.sources ?? []);
      break;

    case "delta":
      callbacks.onDelta(data.content ?? "");
      break;

    case "done":
      callbacks.onDone();
      break;

    case "error":
      callbacks.onError(data.message ?? "Generation failed");
      break;
  }
}
