import { useEffect, useRef, useState } from "react";

import { streamMessage } from "../api/chats";

import type { Chat, Message, Source } from "../types";

type Props = {
  chat: Chat;
};

export default function ChatBox({ chat }: Props) {
  const [question, setQuestion] = useState("");

  const [messages, setMessages] = useState<Message[]>([]);

  const [generating, setGenerating] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  const conversationRef = useRef<HTMLDivElement | null>(null);

  const shouldAutoScrollRef = useRef(true);

  const frameRef = useRef<number | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (shouldAutoScrollRef.current) {
      scrollToBottom("auto");
    }
  }, [messages]);

  function scrollToBottom(behavior: ScrollBehavior = "auto") {
    const container = conversationRef.current;

    if (!container) {
      return;
    }

    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
    }

    frameRef.current = requestAnimationFrame(() => {
      container.scrollTo({
        top: container.scrollHeight,
        behavior,
      });

      frameRef.current = null;
    });
  }

  function handleScroll() {
    const container = conversationRef.current;

    if (!container) {
      return;
    }

    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;

    shouldAutoScrollRef.current = distanceFromBottom < 120;
  }

  function updateAssistant(id: string, updater: (message: Message) => Message) {
    setMessages((current) =>
      current.map((message) =>
        message.id === id ? updater(message) : message,
      ),
    );
  }

  async function handleSend() {
    const value = question.trim();

    if (!value || generating) {
      return;
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: value,
      status: "done",
    };

    const assistantId = crypto.randomUUID();

    const assistantMessage: Message = {
      id: assistantId,
      role: "assistant",
      content: "",
      sources: [],
      status: "searching",
    };

    setMessages((current) => [...current, userMessage, assistantMessage]);
    shouldAutoScrollRef.current = true;

    requestAnimationFrame(() => {
      scrollToBottom("smooth");
    });

    setQuestion("");
    setGenerating(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    const controller = new AbortController();

    abortControllerRef.current = controller;

    try {
      await streamMessage(
        chat.id,
        value,

        {
          onSources(sources: Source[]) {
            updateAssistant(assistantId, (message) => ({
              ...message,
              sources,
              status: "generating",
            }));
          },

          onDelta(content) {
            updateAssistant(assistantId, (message) => ({
              ...message,

              content: message.content + content,

              status: "streaming",
            }));

            if (shouldAutoScrollRef.current) {
              scrollToBottom("auto");
            }
          },

          onDone() {
            updateAssistant(assistantId, (message) => ({
              ...message,
              status: "done",
            }));

            setGenerating(false);
          },

          onError(message) {
            updateAssistant(assistantId, (current) => ({
              ...current,
              status: "error",
              error: message,
            }));

            setGenerating(false);
          },
        },

        controller.signal,
      );
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        updateAssistant(assistantId, (message) => ({
          ...message,
          status: "done",
        }));

        return;
      }

      updateAssistant(assistantId, (message) => ({
        ...message,
        status: "error",

        error: error instanceof Error ? error.message : "Something went wrong",
      }));
    } finally {
      setGenerating(false);

      abortControllerRef.current = null;
    }
  }

  function handleStop() {
    abortControllerRef.current?.abort();

    abortControllerRef.current = null;

    setGenerating(false);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();

      handleSend();
    }
  }

  function handleTextareaChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    setQuestion(event.target.value);

    const textarea = event.target;

    textarea.style.height = "auto";

    textarea.style.height = `${Math.min(textarea.scrollHeight, 180)}px`;
  }

  return (
    <div className="chatPage">
      <header className="chatTopbar">
        <div>
          <h1>{chat.title}</h1>

          <span>Chat with your documents</span>
        </div>
      </header>

      <main
        ref={conversationRef}
        className="conversation"
        onScroll={handleScroll}
      >
        {messages.length === 0 ? (
          <EmptyChat />
        ) : (
          messages.map((message) => (
            <MessageRow key={message.id} message={message} />
          ))
        )}
      </main>

      <div className="composerWrapper">
        <div className="composer">
          <textarea
            ref={textareaRef}
            value={question}
            placeholder="Ask anything about your documents..."
            rows={1}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            disabled={generating}
          />

          {generating ? (
            <button
              className="sendButton stopButton"
              onClick={handleStop}
              aria-label="Stop generating"
            >
              ■
            </button>
          ) : (
            <button
              className="sendButton"
              onClick={handleSend}
              disabled={!question.trim()}
              aria-label="Send"
            >
              ↑
            </button>
          )}
        </div>

        <p className="composerHint">
          Enter to send · Shift + Enter for new line
        </p>
      </div>
    </div>
  );
}

function MessageRow({ message }: { message: Message }) {
  if (message.role === "user") {
    return (
      <div className="messageRow userRow">
        <div className="userBubble">{message.content}</div>
      </div>
    );
  }

  return (
    <div className="messageRow assistantRow">
      <div className="assistantAvatar">AI</div>

      <div className="assistantContent">
        {message.sources && message.sources.length > 0 && (
          <Sources sources={message.sources} />
        )}

        <AssistantLoading
          status={message.status}
          hasContent={message.content.length > 0}
        />

        {message.content && (
          <div className="assistantText">
            {message.content}

            {message.status === "streaming" && <span className="cursor" />}
          </div>
        )}

        {message.status === "error" && (
          <div className="messageError">
            {message.error ?? "Something went wrong"}
          </div>
        )}
      </div>
    </div>
  );
}

function Sources({ sources }: { sources: Source[] }) {
  return (
    <div className="sourceSection">
      <div className="sourceHeader">Sources</div>

      <div className="sourceList">
        {sources.map((source, index) => (
          <div
            key={`${source.document_id}-${source.chunk_index}`}
            className="sourceCard"
          >
            <div className="sourceIcon">📄</div>

            <div className="sourceInfo">
              <strong>{source.document_name}</strong>

              <span>
                {source.page_number
                  ? `Page ${source.page_number}`
                  : `Chunk ${source.chunk_index}`}
              </span>
            </div>

            <span className="sourceNumber">{index + 1}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AssistantLoading({
  status,
  hasContent,
}: {
  status?: Message["status"];
  hasContent: boolean;
}) {
  if (hasContent) {
    return null;
  }

  if (status === "searching") {
    return <LoadingState text="Searching your documents" />;
  }

  if (status === "generating") {
    return <LoadingState text="Generating response" />;
  }

  return null;
}

function LoadingState({ text }: { text: string }) {
  return (
    <div className="loadingState">
      <div className="thinkingDots">
        <span />
        <span />
        <span />
      </div>

      <span>{text}</span>
    </div>
  );
}

function EmptyChat() {
  return (
    <div className="emptyChat">
      <div className="emptyLogo">AI</div>

      <h2>What can I help you find?</h2>

      <p>Ask questions about the documents you added to this chat.</p>
    </div>
  );
}
