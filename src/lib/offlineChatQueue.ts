import { sendMessage } from "@/lib/chatSession";

const QUEUE_KEY = "aponjon_offline_message_queue";

export interface QueuedChatMessage {
  id: string;
  token: string;
  receiverId: string;
  content: string | null;
  imageUrl: string | null;
  replyToId: string | null;
  createdAt: number;
}

function readQueue(): QueuedChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as QueuedChatMessage[]) : [];
  } catch {
    window.localStorage.removeItem(QUEUE_KEY);
    return [];
  }
}

function writeQueue(queue: QueuedChatMessage[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

function notifyQueueChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("offline-chat-queue-changed"));
}

export function getOfflineQueue() {
  return readQueue();
}

export function getOfflineQueueCountForContact(receiverId: string) {
  return readQueue().filter((item) => item.receiverId === receiverId).length;
}

export function enqueueOfflineMessage(message: Omit<QueuedChatMessage, "id" | "createdAt">) {
  const queued: QueuedChatMessage = {
    ...message,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
  };
  const next = [...readQueue(), queued];
  writeQueue(next);
  notifyQueueChange();
  return queued;
}

export function removeQueuedMessage(id: string) {
  const next = readQueue().filter((item) => item.id !== id);
  writeQueue(next);
  notifyQueueChange();
}

export async function flushOfflineQueue(onDelivered?: (message: QueuedChatMessage) => void) {
  if (typeof navigator !== "undefined" && !navigator.onLine) return { sent: 0, remaining: readQueue().length };

  const queue = readQueue();
  if (queue.length === 0) return { sent: 0, remaining: 0 };

  let sent = 0;
  for (const item of queue) {
    try {
      await sendMessage(item.token, item.receiverId, item.content || undefined, item.imageUrl || undefined, item.replyToId || undefined);
      removeQueuedMessage(item.id);
      sent += 1;
      onDelivered?.(item);
    } catch {
      break;
    }
  }

  return { sent, remaining: readQueue().length };
}