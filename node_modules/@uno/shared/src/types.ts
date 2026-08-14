export type CardColor = 'red' | 'yellow' | 'green' | 'blue' | 'wild';

export type CardValue =
  | '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'
  | 'skip' | 'reverse' | 'draw2'
  | 'wild' | 'wild4';

export interface Card {
  id: string;
  color: CardColor;
  value: CardValue;
}

export interface PublicPlayer {
  id: string;
  name: string;
  handCount: number;
  isConnected: boolean;
  hasCalledUno: boolean;
}

export interface Player extends PublicPlayer {
  hand: Card[];
}

export type GameStatus = 'waiting' | 'playing' | 'finished';

export interface GameRules {
  stacking: boolean;
  jumpIn: boolean;
  chaos: boolean;
  infiniteDraw: boolean;
}

export const DEFAULT_RULES: GameRules = {
  stacking: false,
  jumpIn: false,
  chaos: false,
  infiniteDraw: false,
};

export interface PendingDraw {
  count: number;
  victimId: string;
  canChallenge: boolean;
  accusedId?: string;
}

export interface RevealedHand {
  playerId: string;
  cards: Card[];
  wasLying: boolean;
  resolvedAt: number;
}

export interface StackWindow {
  playerId: string;
  value: CardValue;
  skipCount: number;
  expiresAt: number;
  breakerId: string;
}

export interface PublicGameState {
  roomCode: string;
  players: PublicPlayer[];
  hostId: string;
  currentPlayerId: string | null;
  direction: 1 | -1;
  currentColor: CardColor | null;
  topCard: Card | null;
  discardCount: number;
  deckCount: number;
  status: GameStatus;
  winnerId: string | null;
  awaitingColorChoice: boolean;
  log: string[];
  rules: GameRules;
  pendingDraw: PendingDraw | null;
  lastReveal: RevealedHand | null;
  stackWindow: StackWindow | null;
  hasDrawnThisTurn: boolean;
}

// Payload sent to a specific player, includes their own hand
export interface PersonalGameState extends PublicGameState {
  yourHand: Card[];
  yourId: string;
}

// ----- Socket events -----

export interface ClientToServerEvents {
  create_room: (payload: { name: string }) => void;
  join_room: (payload: { roomCode: string; name: string }) => void;
  start_game: () => void;
  play_card: (payload: { cardId: string; chosenColor?: CardColor }) => void;
  draw_card: () => void;
  call_uno: () => void;
  catch_uno: (payload: { targetId: string }) => void;
  accuse_liar: () => void;
  break_stack: () => void;
  pass_turn: () => void;
  update_rules: (payload: { rules: Partial<GameRules> }) => void;
  leave_room: () => void;
}

export interface ServerToClientEvents {
  room_joined: (payload: { roomCode: string; playerId: string }) => void;
  state_update: (state: PersonalGameState) => void;
  error_message: (payload: { message: string }) => void;
}
