import type {
  GetConversationsResponse,
  GetMessagesResponse,
  SendMessagePayload,
  SendMessageResponse,
} from "../types";
import {
  mapConversationsResponse,
  mapMessagesResponse,
  mapMessage,
} from "./chat.mappers";

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed with status ${res.status}`);
  }
  return (await res.json()) as T;
}

export async function getConversations(): Promise<GetConversationsResponse> {
  const res = await fetch("/api/chat/conversations", {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  const json = await parseJson<unknown>(res);
  return mapConversationsResponse(json);
}

export async function getMessages(
  conversationId: string,
): Promise<GetMessagesResponse> {
  const res = await fetch(
    `/api/chat/conversations/${encodeURIComponent(conversationId)}/messages`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    },
  );

  const json = await parseJson<unknown>(res);
  return mapMessagesResponse(json, conversationId);
}

export async function sendMessage(
  payload: SendMessagePayload,
): Promise<SendMessageResponse> {
  const res = await fetch("/api/chat/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const json = await parseJson<{ message?: unknown }>(res);

  if (!json.message) {
    throw new Error("Invalid send message response: missing message");
  }

  return { message: mapMessage(json.message, payload.conversationId) };
}
