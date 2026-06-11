import { useCallback, useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';
import type { ChatMessage, Seat } from '../types/socket';

let counter = 0;

export function useChatMessages(socket: Socket) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    function onChatMessage(payload: { seat: Seat; displayName: string; emoji: string }) {
      const msg: ChatMessage = { ...payload, id: String(++counter) };
      setMessages((prev) => [...prev, msg]);
      setTimeout(() => {
        setMessages((prev) => prev.filter((m) => m.id !== msg.id));
      }, 3500);
    }
    socket.on('chat:message', onChatMessage);
    return () => { socket.off('chat:message', onChatMessage); };
  }, [socket]);

  const sendEmoji = useCallback(
    (emoji: string) => { socket.emit('chat:send', { emoji }); },
    [socket],
  );

  return { messages, sendEmoji };
}
