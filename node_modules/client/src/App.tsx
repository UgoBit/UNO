import { useEffect, useState } from 'react';
import type { CardColor, GameRules, PersonalGameState } from '@uno/shared';
import { socket } from './socket';
import Lobby from './components/Lobby';
import WaitingRoom from './components/WaitingRoom';
import GameBoard from './components/GameBoard';

type View = 'lobby' | 'room';

function App() {
  const [view, setView] = useState<View>('lobby');
  const [gameState, setGameState] = useState<PersonalGameState | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    function handleRoomJoined() {
      setErrorMessage(null);
      setView('room');
    }
    function handleStateUpdate(state: PersonalGameState) {
      setGameState(state);
    }
    function handleError({ message }: { message: string }) {
      setErrorMessage(message);
    }

    socket.on('room_joined', handleRoomJoined);
    socket.on('state_update', handleStateUpdate);
    socket.on('error_message', handleError);

    return () => {
      socket.off('room_joined', handleRoomJoined);
      socket.off('state_update', handleStateUpdate);
      socket.off('error_message', handleError);
    };
  }, []);

  function handleCreate(name: string) {
    setErrorMessage(null);
    socket.emit('create_room', { name });
  }

  function handleJoin(name: string, roomCode: string) {
    setErrorMessage(null);
    socket.emit('join_room', { roomCode, name });
  }

  function handleStart() {
    socket.emit('start_game');
  }

  function handlePlayCard(cardId: string, chosenColor?: CardColor) {
    socket.emit('play_card', { cardId, chosenColor });
  }

  function handleDrawCard() {
    socket.emit('draw_card');
  }

  function handleCallUno() {
    socket.emit('call_uno');
  }

  function handleCatchUno(targetId: string) {
    socket.emit('catch_uno', { targetId });
  }

  function handleBreakStack() {
    socket.emit('break_stack');
  }

  function handlePassTurn() {
    socket.emit('pass_turn');
  }

  function handleAccuseLiar() {
    socket.emit('accuse_liar');
  }

  function handleUpdateRules(rules: Partial<GameRules>) {
    socket.emit('update_rules', { rules });
  }

  function handleLeave() {
    socket.emit('leave_room');
    setGameState(null);
    setErrorMessage(null);
    setView('lobby');
  }

  if (view === 'lobby' || !gameState) {
    return <Lobby onCreate={handleCreate} onJoin={handleJoin} errorMessage={errorMessage} />;
  }

  if (gameState.status === 'waiting') {
    return (
      <WaitingRoom
        state={gameState}
        onStart={handleStart}
        onLeave={handleLeave}
        onUpdateRules={handleUpdateRules}
      />
    );
  }

  return (
    <GameBoard
      state={gameState}
      onPlayCard={handlePlayCard}
      onBreakStack={handleBreakStack}
      onPassTurn={handlePassTurn}
      onDrawCard={handleDrawCard}
      onCallUno={handleCallUno}
      onCatchUno={handleCatchUno}
      onAccuseLiar={handleAccuseLiar}
      onLeave={handleLeave}
    />
  );
}

export default App;
