import { useState } from "react";

import { createChat } from "../api/chats";

import type { Chat, Document } from "../types";

type Props = {
  document: Document;
  onCreated: (chat: Chat) => void;
};

export default function ChatSetup({ document, onCreated }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    try {
      setLoading(true);

      const chat = await createChat(document.original_name, [document.id]);

      onCreated(chat);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <h2>Create chat</h2>

      <p>
        Document: <strong>{document.original_name}</strong>
      </p>

      <button onClick={handleCreate} disabled={loading}>
        {loading ? "Creating..." : "Create chat"}
      </button>
    </div>
  );
}
