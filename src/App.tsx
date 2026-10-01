import { useState } from "react";

import "./App.css";

import ChatBox from "./components/ChatBox";
import ChatSetup from "./components/ChatSetup";
import DocumentUpload from "./components/DocumentUpload";

import type { Chat, Document } from "./types";

function App() {
  const [document, setDocument] = useState<Document | null>(null);

  const [chat, setChat] = useState<Chat | null>(null);

  return (
    <main className="container">
      <header>
        <h1>Local RAG</h1>

        <p>Upload a document and chat with it.</p>
      </header>

      {!document && <DocumentUpload onReady={setDocument} />}

      {document && !chat && (
        <ChatSetup document={document} onCreated={setChat} />
      )}

      {chat && <ChatBox chat={chat} />}
    </main>
  );
}

export default App;
