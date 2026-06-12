import { useCallback, useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';
import type { ChatMessage, Seat } from '../types/socket';

let counter = 0;

export function useChatMessages(socket: Socket) {
  // Floating bubbles shown on the board — max 1 per seat to prevent clustering
  const [floatingMessages, setFloatingMessages] = useState<ChatMessage[]>([]);
  // Full scrollable history in the chat panel
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

  useEffect(() => {
    function onChatMessage(payload: { seat: Seat; displayName: string; emoji?: string; text?: string }) {
      const msg: ChatMessage = { ...payload, id: String(++counter) };
      setFloatingMessages((prev) => [...prev.filter((m) => m.seat !== msg.seat), msg]);
      setChatHistory((prev) => [...prev.slice(-49), msg]);
      setTimeout(() => {
        setFloatingMessages((prev) => prev.filter((m) => m.id !== msg.id));
      }, 3500);
    }
    socket.on('chat:message', onChatMessage);
    return () => { socket.off('chat:message', onChatMessage); };
  }, [socket]);

  const sendEmoji = useCallback(
    (emoji: string) => { socket.emit('chat:send', { emoji }); },
    [socket],
  );

  const sendText = useCallback(
    (text: string) => {
      const t = text.trim().slice(0, 120);
      if (t) socket.emit('chat:send', { text: t });
    },
    [socket],
  );

  return { floatingMessages, chatHistory, sendEmoji, sendText };
}
