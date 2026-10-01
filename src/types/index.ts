export type Document = {
  id: string;
  original_name: string;
  mime_type: string;
  file_size: number;
  status: "uploaded" | "processing" | "ready" | "failed";
  error_message?: string;
  created_at: string;
  updated_at: string;
};

export type Chat = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

export type Source = {
  document_id: string;
  document_name: string;
  page_number?: number;
  chunk_index: number;
  similarity: number;
};
export type MessageStatus =
  | "idle"
  | "searching"
  | "generating"
  | "streaming"
  | "done"
  | "error";

export type Message = {
  id: string;

  role: "user" | "assistant";

  content: string;

  sources?: Source[];

  status?: MessageStatus;

  error?: string;
};
