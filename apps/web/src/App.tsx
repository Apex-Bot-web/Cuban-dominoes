import { useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { HomeScreen } from './screens/HomeScreen';
import { LobbyScreen } from './screens/LobbyScreen';
import { MultiplayerGameScreen } from './screens/MultiplayerGameScreen';
import { SoloGameScreen } from './screens/SoloGameScreen';
import type { PlayerView, RoomView } from './types/socket';

type Screen =
  | { tag: 'home' }
  | { tag: 'solo' }
  | { tag: 'lobby'; socket: Socket; room: RoomView }
  | { tag: 'mp-game'; socket: Socket; view: PlayerView; room: RoomView };

export default function App() {
  const [screen, setScreen] = useState<Screen>({ tag: 'home' });

  // Clean up socket on unmount (shouldn't happen but be safe)
  useEffect(() => {
    return () => {
      if (screen.tag === 'lobby' || screen.tag === 'mp-game') {
        screen.socket.disconnect();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function leave() {
    if (screen.tag === 'lobby' || screen.tag === 'mp-game') {
      screen.socket.disconnect();
    }
    setScreen({ tag: 'home' });
  }

  return (
    <div className="h-full overflow-hidden">
      {screen.tag === 'home' && (
        <HomeScreen
          onSolo={() => setScreen({ tag: 'solo' })}
          onMultiplayer={(socket, room) => setScreen({ tag: 'lobby', socket, room })}
        />
      )}

      {screen.tag === 'solo' && (
        <SoloGameScreen onLeave={() => setScreen({ tag: 'home' })} />
      )}

      {screen.tag === 'lobby' && (
        <LobbyScreen
          socket={screen.socket}
          initialRoom={screen.room}
          onGameStart={(view, room) =>
            setScreen({ tag: 'mp-game', socket: screen.socket, view, room })
          }
          onLeave={leave}
        />
      )}

      {screen.tag === 'mp-game' && (
        <MultiplayerGameScreen
          socket={screen.socket}
          initialView={screen.view}
          room={screen.room}
          onLeave={leave}
        />
      )}
    </div>
  );
}
