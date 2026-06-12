import { useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { AccountSetupScreen } from './screens/AccountSetupScreen';
import { FriendsScreen } from './screens/FriendsScreen';
import { HomeScreen } from './screens/HomeScreen';
import { LeaderboardScreen } from './screens/LeaderboardScreen';
import { PrivacyPolicyScreen } from './screens/PrivacyPolicyScreen';
import { TermsScreen } from './screens/TermsScreen';
import { LobbyScreen } from './screens/LobbyScreen';
import { MatchmakingScreen } from './screens/MatchmakingScreen';
import { MultiplayerGameScreen } from './screens/MultiplayerGameScreen';
import { SoloGameScreen } from './screens/SoloGameScreen';
import { StatsScreen } from './screens/StatsScreen';
import type { BotLevel, PlayerView, RoomView } from './types/socket';

function hasAccount(): boolean {
  return !!localStorage.getItem('dominoes-display-name')?.trim();
}

type Screen =
  | { tag: 'account-setup' }
  | { tag: 'home' }
  | { tag: 'solo'; botLevel: BotLevel }
  | { tag: 'lobby'; socket: Socket; room: RoomView }
  | { tag: 'matchmaking'; socket: Socket; displayName: string }
  | { tag: 'mp-game'; socket: Socket; view: PlayerView; room: RoomView }
  | { tag: 'stats' }
  | { tag: 'leaderboard' }
  | { tag: 'friends' }
  | { tag: 'privacy' }
  | { tag: 'terms' };

export default function App() {
  const [screen, setScreen] = useState<Screen>(() =>
    hasAccount() ? { tag: 'home' } : { tag: 'account-setup' },
  );

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
      {screen.tag === 'account-setup' && (
        <AccountSetupScreen
          onDone={() => setScreen({ tag: 'home' })}
          onPrivacy={() => setScreen({ tag: 'privacy' })}
          onTerms={() => setScreen({ tag: 'terms' })}
        />
      )}

      {screen.tag === 'home' && (
        <HomeScreen
          onSolo={(level) => setScreen({ tag: 'solo', botLevel: level })}
          onMultiplayer={(socket, room) => setScreen({ tag: 'lobby', socket, room })}
          onMatchmaking={(socket, displayName) =>
            setScreen({ tag: 'matchmaking', socket, displayName })
          }
          onStats={() => setScreen({ tag: 'stats' })}
          onLeaderboard={() => setScreen({ tag: 'leaderboard' })}
          onFriends={() => setScreen({ tag: 'friends' })}
          onEditAccount={() => setScreen({ tag: 'account-setup' })}
          onPrivacy={() => setScreen({ tag: 'privacy' })}
          onTerms={() => setScreen({ tag: 'terms' })}
        />
      )}

      {screen.tag === 'solo' && (
        <SoloGameScreen botLevel={screen.botLevel} onLeave={() => setScreen({ tag: 'home' })} />
      )}

      {screen.tag === 'stats' && <StatsScreen onBack={() => setScreen({ tag: 'home' })} />}
      {screen.tag === 'leaderboard' && <LeaderboardScreen onBack={() => setScreen({ tag: 'home' })} />}
      {screen.tag === 'friends' && <FriendsScreen onBack={() => setScreen({ tag: 'home' })} />}
      {screen.tag === 'privacy' && <PrivacyPolicyScreen onBack={() => setScreen({ tag: 'home' })} />}
      {screen.tag === 'terms' && <TermsScreen onBack={() => setScreen({ tag: 'home' })} />}

      {screen.tag === 'matchmaking' && (
        <MatchmakingScreen
          socket={screen.socket}
          displayName={screen.displayName}
          onMatched={(view, room) =>
            setScreen({ tag: 'mp-game', socket: screen.socket, view, room })
          }
          onCancel={() => setScreen({ tag: 'home' })}
        />
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
