import { forwardRef } from "react";
import { MessageCircle } from "lucide-react";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { ChatMessagesSkeleton } from "@/components/chat/ChatMessagesSkeleton";
import { getDateLabel, shouldShowDateHeader } from "@/lib/chatFormatters";
import type { AdminChatMessage, AdminChatUser } from "@/components/admin/adminChatTypes";

interface Props {
  messages: AdminChatMessage[];
  loading: boolean;
  hasAnyMessage: boolean;
  myId: string;
  otherUser: AdminChatUser;
  searchOpen: boolean;
  searchQuery: string;
  highlightedMsgId: string | null;
  onOpenActions: (msg: AdminChatMessage, rect: DOMRect | null, el?: HTMLElement | null) => void;
  onQuickReact: (msg: AdminChatMessage, emoji: string) => void;
  onStartReply: (msg: AdminChatMessage) => void;
  onShowEditHistory: (msg: AdminChatMessage) => void;
  onJumpToReply: (id: string) => void;
}

export const AdminChatMessageList = forwardRef<HTMLDivElement, Props>(function AdminChatMessageList(
  {
    messages,
    loading,
    hasAnyMessage,
    myId,
    otherUser,
    searchOpen,
    searchQuery,
    highlightedMsgId,
    onOpenActions,
    onQuickReact,
    onStartReply,
    onShowEditHistory,
    onJumpToReply,
  },
  ref,
) {
  let lastMineId: string | null = null;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].sender_id === myId) { lastMineId = messages[i].id; break; }
  }

  return (
    <div
      ref={ref}
      className={`chat-scroll flex-1 overflow-y-auto overflow-x-hidden px-3 sm:px-4 md:px-5 pb-3 ${searchOpen ? "pt-5" : "pt-3"} space-y-1`}
    >
      {loading && !hasAnyMessage && <ChatMessagesSkeleton />}
      {!loading && messages.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-xs">{searchQuery ? "কোনো মেসেজ পাওয়া যায়নি" : "এখনো কোনো মেসেজ নেই"}</p>
        </div>
      )}

      {messages.map((msg, idx) => {
        const isMine = msg.sender_id === myId;
        const showDateHeader = !searchQuery && shouldShowDateHeader(messages, idx);
        const prev = idx > 0 ? messages[idx - 1] : null;
        const next = idx < messages.length - 1 ? messages[idx + 1] : null;
        const sameAsNext = next && next.sender_id === msg.sender_id
          && (new Date(next.created_at).getTime() - new Date(msg.created_at).getTime() < 5 * 60 * 1000);
        const showTail = !sameAsNext;
        const showAvatar = !isMine && !sameAsNext;
        return (
          <div key={msg.id}>
            {showDateHeader && (
              <div className="flex justify-center my-3">
                <span className="text-micro text-muted-foreground bg-muted/60 px-3 py-0.5 rounded-full">{getDateLabel(msg.created_at)}</span>
              </div>
            )}
            <MessageBubble
              msg={msg as any}
              isMine={isMine}
              myId={myId}
              otherName={otherUser.name}
              showTail={!!showTail}
              showAvatar={!!showAvatar}
              avatarUrl={otherUser.photo_url}
              onOpenActions={(m, rect, el) => onOpenActions(m as AdminChatMessage, rect, el ?? null)}
              onQuickReact={(m, e) => onQuickReact(m as AdminChatMessage, e)}
              onStartReply={(m) => onStartReply(m as AdminChatMessage)}
              onShowEditHistory={(m) => onShowEditHistory(m as AdminChatMessage)}
              onJumpToReply={onJumpToReply}
              isDelivered={!!msg.delivered_at || !!msg.is_read}
              showReceipt={isMine && (!!showTail || msg.id === lastMineId)}
              highlightQuery={searchQuery}
              highlight={msg.id === highlightedMsgId}
            />
          </div>
        );
      })}
      <div className="h-0" />
    </div>
  );
});
