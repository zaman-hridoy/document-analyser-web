import { useState } from "react";

import { processDocument, uploadDocument } from "../api/documents";

import type { Document } from "../types";

type Props = {
  onReady: (document: Document) => void;
};

export default function DocumentUpload({ onReady }: Props) {
  const [file, setFile] = useState<File | null>(null);

  const [status, setStatus] = useState("");

  const [loading, setLoading] = useState(false);

  async function handleUpload() {
    if (!file) {
      return;
    }

    try {
      setLoading(true);

      setStatus("Uploading document...");

      const document = await uploadDocument(file);

      setStatus("Processing document...");

      await processDocument(document.id);

      setStatus("Document ready");

      onReady({
        ...document,
        status: "ready",
      });
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <h2>Upload document</h2>

      <input
        type="file"
        accept=".pdf,.txt,.md"
        onChange={(event) => {
          setFile(event.target.files?.[0] ?? null);
        }}
      />

      <button onClick={handleUpload} disabled={!file || loading}>
        {loading ? "Working..." : "Upload"}
      </button>

      {status && <p>{status}</p>}
    </div>
  );
}
