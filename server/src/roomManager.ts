import { UnoGame } from '@uno/shared';

const rooms = new Map<string, UnoGame>();

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateRoomCode(): string {
  let code: string;
  do {
    code = Array.from({ length: 5 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
  } while (rooms.has(code));
  return code;
}

export function createRoom(hostId: string): UnoGame {
  const code = generateRoomCode();
  const game = new UnoGame(code, hostId);
  rooms.set(code, game);
  return game;
}

export function getRoom(roomCode: string): UnoGame | undefined {
  return rooms.get(roomCode.toUpperCase());
}

export function deleteRoom(roomCode: string): void {
  rooms.delete(roomCode.toUpperCase());
}

export function isRoomEmpty(game: UnoGame): boolean {
  return game.players.every((p) => !p.isConnected) || game.players.length === 0;
}
