import type { ChatMessage, Seat } from '../types/socket';

// displaySeat = (originalSeat - mySeat + 4) % 4
// 0=me(bottom), 1=right, 2=top, 3=left
const BUBBLE_CLASS = [
  'bottom-[34%] left-1/2 -translate-x-1/2 items-center',
  'top-[38%] right-16 -translate-y-1/2 items-end',
  'top-[18%] left-1/2 -translate-x-1/2 items-center',
  'top-[38%] left-16 -translate-y-1/2 items-start',
];

interface ChatBubblesProps {
  messages: ChatMessage[];
  mySeat: Seat;
}

export function ChatBubbles({ messages, mySeat }: ChatBubblesProps) {
  return (
    <>
      {messages.map((msg) => {
        const displaySeat = (msg.seat - mySeat + 4) % 4;
        const cls = BUBBLE_CLASS[displaySeat] ?? BUBBLE_CLASS[0];
        return (
          <div
            key={msg.id}
            className={`absolute z-20 pointer-events-none flex flex-col gap-0.5 ${cls}`}
          >
            <div className="animate-chat-bubble flex flex-col items-center gap-0.5">
              <span className="text-4xl drop-shadow-lg leading-none">{msg.emoji}</span>
              <span className="text-white/80 text-[9px] font-bold bg-black/50 rounded-full px-2 py-0.5 whitespace-nowrap">
                {msg.displayName}
              </span>
            </div>
          </div>
        );
      })}
    </>
  );
}
