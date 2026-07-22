import { forwardRef } from "react";
import { MessageCircle } from "lucide-react";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { ChatMessagesSkeleton } from "@/components/chat/ChatMessagesSkeleton";
import { getDateLabel, shouldShowDateHeader } from "@/lib/chatFormatters";

type Message = {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string | null;
  image_url: string | null;
  is_read: boolean;
  created_at: string;
  delivered_at?: string | null;
  read_at?: string | null;
  edited_at?: string | null;
  original_content?: string | null;
  reply_to_id?: string | null;
  reply_content?: string | null;
  reply_sender_id?: string | null;
  is_pinned?: boolean;
  unsent_at?: string | null;
  has_edit_history?: boolean;
  reactions?: { emoji: string; reactor_id: string }[];
  pending?: boolean;
};

type Props = {
  messages: Message[];
  loading: boolean;
  myId: string;
  otherName: string;
  otherPhoto: string | null;
  searchQuery: string;
  highlightedMsgId: string | null;
  searchOpen: boolean;
  onOpenActions: (m: Message, rect: DOMRect, el?: HTMLElement | null) => void;
  onQuickReact: (m: Message, emoji: string) => void;
  onStartReply: (m: Message) => void;
  onShowEditHistory: (m: Message) => void;
  onJumpToReply: (id: string) => void;
};

export const ChatMessageList = forwardRef<HTMLDivElement, Props>(function ChatMessageList(
  {
    messages,
    loading,
    myId,
    otherName,
    otherPhoto,
    searchQuery,
    highlightedMsgId,
    searchOpen,
    onOpenActions,
    onQuickReact,
    onStartReply,
    onShowEditHistory,
    onJumpToReply,
  },
  listRef,
) {
  let lastMineId: string | null = null;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].sender_id === myId) {
      lastMineId = messages[i].id;
      break;
    }
  }

  return (
    <div
      ref={listRef}
      className={`chat-scroll flex-1 overflow-y-auto overflow-x-hidden px-3 sm:px-5 md:px-6 pb-2 ${
        searchOpen ? "pt-7" : "pt-4"
      } space-y-1`}
    >
      {loading && messages.length === 0 && <ChatMessagesSkeleton />}
      {!loading && messages.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <MessageCircle className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">
            {searchQuery ? "কোনো মেসেজ পাওয়া যায়নি" : "এখনো কোনো মেসেজ নেই"}
          </p>
          {!searchQuery && (
            <p className="text-xs mt-1">নিচের বক্সে লিখে প্রথম মেসেজ শুরু করুন</p>
          )}
        </div>
      )}
      {messages.map((msg, idx) => {
        const isMine = msg.sender_id === myId;
        const showDateHeader = !searchQuery && shouldShowDateHeader(messages, idx);
        const prev = idx > 0 ? messages[idx - 1] : null;
        const next = idx < messages.length - 1 ? messages[idx + 1] : null;
        const sameAsNext =
          next &&
          next.sender_id === msg.sender_id &&
          new Date(next.created_at).getTime() - new Date(msg.created_at).getTime() <
            5 * 60 * 1000;
        const sameAsPrev =
          prev &&
          prev.sender_id === msg.sender_id &&
          new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime() <
            5 * 60 * 1000;
        const showTail = !sameAsNext;
        const showAvatar = !isMine && !sameAsNext;
        return (
          <div key={msg.id} className={msg.pending ? "opacity-70" : ""}>
            {showDateHeader && (
              <div className="flex justify-center my-3">
                <span className="text-xs text-muted-foreground bg-muted/60 px-3 py-0.5 rounded-full">
                  {getDateLabel(msg.created_at)}
                </span>
              </div>
            )}
            {!sameAsPrev && !isMine && (
              <div className="text-xs text-muted-foreground ml-10 mb-0.5">{otherName}</div>
            )}
            <MessageBubble
              msg={msg}
              isMine={isMine}
              myId={myId}
              otherName={otherName}
              showTail={showTail}
              showAvatar={showAvatar}
              avatarUrl={otherPhoto}
              onOpenActions={(m, rect, el) => onOpenActions(m, rect, el)}
              onQuickReact={(m, e) => onQuickReact(m, e)}
              onStartReply={(m) => onStartReply(m)}
              onShowEditHistory={(m) => onShowEditHistory(m)}
              onJumpToReply={onJumpToReply}
              isDelivered={!!msg.delivered_at || !!msg.is_read}
              showReceipt={isMine && (showTail || msg.id === lastMineId)}
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
