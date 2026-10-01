import type { Document } from "../types";
import { API_URL } from "./client";

export async function uploadDocument(file: File): Promise<Document> {
  const formData = new FormData();

  formData.append("file", file);

  const response = await fetch(`${API_URL}/api/v1/documents`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);

    throw new Error(data?.error || "Failed to upload document");
  }

  return response.json();
}

export async function processDocument(documentId: string): Promise<void> {
  const response = await fetch(
    `${API_URL}/api/v1/documents/${documentId}/process`,
    {
      method: "POST",
    },
  );

  if (!response.ok) {
    const data = await response.json().catch(() => null);

    throw new Error(data?.error || "Failed to process document");
  }
}
