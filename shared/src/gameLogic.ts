import type {
  Card,
  CardColor,
  CardValue,
  Player,
  PersonalGameState,
  PublicPlayer,
  GameStatus,
  GameRules,
  PendingDraw,
  RevealedHand,
  StackWindow,
} from './types';
import { DEFAULT_RULES } from './types';

const STACK_WINDOW_MS = 3000;

const COLORS: CardColor[] = ['red', 'yellow', 'green', 'blue'];
const NUMBER_VALUES: CardValue[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
const ACTION_VALUES: CardValue[] = ['skip', 'reverse', 'draw2'];

let idCounter = 0;
function nextId(): string {
  idCounter += 1;
  return `c${idCounter}_${Math.random().toString(36).slice(2, 8)}`;
}

export function buildDeck(): Card[] {
  const deck: Card[] = [];
  for (const color of COLORS) {
    deck.push({ id: nextId(), color, value: '0' });
    for (const value of NUMBER_VALUES) {
      deck.push({ id: nextId(), color, value });
      deck.push({ id: nextId(), color, value });
    }
    for (const value of ACTION_VALUES) {
      deck.push({ id: nextId(), color, value });
      deck.push({ id: nextId(), color, value });
    }
  }
  for (let i = 0; i < 4; i += 1) {
    deck.push({ id: nextId(), color: 'wild', value: 'wild' });
    deck.push({ id: nextId(), color: 'wild', value: 'wild4' });
  }
  return deck;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function cardIsPlayable(card: Card, topCard: Card, currentColor: CardColor): boolean {
  if (card.color === 'wild') return true;
  if (card.color === currentColor) return true;
  if (card.value === topCard.value) return true;
  return false;
}

const MAX_LOG = 30;

export class UnoGame {
  roomCode: string;
  hostId: string;
  players: Player[] = [];
  deck: Card[] = [];
  discard: Card[] = [];
  currentPlayerIndex = 0;
  direction: 1 | -1 = 1;
  currentColor: CardColor | null = null;
  status: GameStatus = 'waiting';
  winnerId: string | null = null;
  log: string[] = [];
  rules: GameRules = { ...DEFAULT_RULES };
  pendingDraw: PendingDraw | null = null;
  lastReveal: RevealedHand | null = null;
  stackWindow: StackWindow | null = null;
  hasDrawnThisTurn = false;
  private pendingChallengeColor: CardColor | null = null;

  constructor(roomCode: string, hostId: string) {
    this.roomCode = roomCode;
    this.hostId = hostId;
  }

  setRules(rules: Partial<GameRules>) {
    if (this.status !== 'waiting') throw new Error('Impossible de changer les règles après le début de la partie.');
    this.rules = { ...this.rules, ...rules };
  }

  private pushLog(msg: string) {
    this.log.push(msg);
    if (this.log.length > MAX_LOG) this.log.shift();
  }

  addPlayer(id: string, name: string) {
    if (this.players.find((p) => p.id === id)) return;
    if (this.status !== 'waiting') {
      throw new Error('La partie a déjà commencé.');
    }
    this.players.push({
      id,
      name,
      hand: [],
      handCount: 0,
      isConnected: true,
      hasCalledUno: false,
    });
    this.pushLog(`${name} a rejoint la partie.`);
  }

  removePlayer(id: string) {
    const player = this.players.find((p) => p.id === id);
    if (!player) return;
    if (this.status === 'waiting') {
      this.players = this.players.filter((p) => p.id !== id);
      this.pushLog(`${player.name} a quitté la partie.`);
      if (this.hostId === id && this.players.length > 0) {
        this.hostId = this.players[0].id;
      }
    } else {
      player.isConnected = false;
      this.pushLog(`${player.name} s'est déconnecté.`);
    }
  }

  private currentPlayer(): Player {
    return this.players[this.currentPlayerIndex];
  }

  start() {
    if (this.status !== 'waiting') throw new Error('La partie a déjà commencé.');
    if (this.players.length < 2) throw new Error('Il faut au moins 2 joueurs.');

    this.deck = shuffle(buildDeck());
    this.discard = [];
    this.players.forEach((p) => {
      p.hand = this.deck.splice(0, 7);
      p.handCount = p.hand.length;
      p.hasCalledUno = false;
    });

    let firstCard = this.deck.pop()!;
    while (firstCard.color === 'wild') {
      this.deck.unshift(firstCard);
      this.deck = shuffle(this.deck);
      firstCard = this.deck.pop()!;
    }
    this.discard.push(firstCard);
    this.currentColor = firstCard.color;
    this.currentPlayerIndex = 0;
    this.direction = 1;
    this.status = 'playing';
    this.winnerId = null;
    this.pushLog('La partie commence !');

    if (firstCard.value === 'skip') {
      this.advanceTurn();
    } else if (firstCard.value === 'reverse') {
      this.direction = -1;
    } else if (firstCard.value === 'draw2') {
      this.forceDraw(this.currentPlayer(), 2);
      this.advanceTurn();
    }
  }

  private advanceTurn(steps = 1) {
    const n = this.players.length;
    for (let i = 0; i < steps; i += 1) {
      this.currentPlayerIndex = (this.currentPlayerIndex + this.direction + n) % n;
    }
    this.hasDrawnThisTurn = false;
  }

  private ensureDeck(minCount: number) {
    while (this.deck.length < minCount) {
      if (this.discard.length <= 1) {
        // Not enough cards anywhere; nothing more to do.
        break;
      }
      const top = this.discard.pop()!;
      const rest = shuffle(this.discard);
      this.deck.push(...rest);
      this.discard = [top];
    }
  }

  private forceDraw(player: Player, count: number) {
    this.ensureDeck(count);
    const drawn = this.deck.splice(0, count);
    player.hand.push(...drawn);
    player.handCount = player.hand.length;
    player.hasCalledUno = false;
  }

  catchUno(callerId: string, targetId: string) {
    if (this.status !== 'playing') throw new Error('La partie n\'est pas en cours.');
    if (callerId === targetId) throw new Error('Vous ne pouvez pas vous contrer vous-même.');
    const caller = this.players.find((p) => p.id === callerId);
    const target = this.players.find((p) => p.id === targetId);
    if (!caller) throw new Error('Joueur introuvable.');
    if (!target) throw new Error('Cible introuvable.');
    if (target.hand.length !== 1 || target.hasCalledUno) {
      throw new Error(`${target.name} n'est pas en infraction.`);
    }
    this.forceDraw(target, 2);
    this.pushLog(`${caller.name} contre ${target.name} qui pioche 2 cartes !`);
  }

  playCard(playerId: string, cardId: string, chosenColor?: CardColor) {
    if (this.status !== 'playing') throw new Error('La partie n\'est pas en cours.');

    // While an "Identique" stack window is open, only its owner may continue
    // stacking matching cards; everyone else must wait or break the window.
    if (this.stackWindow) {
      if (playerId !== this.stackWindow.playerId) {
        throw new Error('Un empilement est en cours ; attendez ou cassez le tour.');
      }
      this.extendStack(playerId, cardId);
      return;
    }

    // While a draw is pending (+2/+4 in the air), only the victim may act,
    // and only by drawing, accusing, or (if Chaos is on) stacking a +2/+4.
    if (this.pendingDraw && playerId !== this.pendingDraw.victimId) {
      throw new Error('Un joueur doit d\'abord réagir à la pioche en cours.');
    }

    const actingPlayer = this.players.find((p) => p.id === playerId);
    if (!actingPlayer) throw new Error('Joueur introuvable.');

    const isCurrent = this.currentPlayer().id === playerId;

    if (!isCurrent) {
      if (!this.rules.jumpIn) throw new Error('Ce n\'est pas votre tour.');
      const cardIndex = actingPlayer.hand.findIndex((c) => c.id === cardId);
      if (cardIndex === -1) throw new Error('Carte introuvable dans votre main.');
      const jumpCard = actingPlayer.hand[cardIndex];
      const topCardForJump = this.discard[this.discard.length - 1];
      if (!topCardForJump || jumpCard.color !== topCardForJump.color || jumpCard.value !== topCardForJump.value) {
        throw new Error('Cette carte ne correspond pas exactement à la carte du dessus (Saute-mouton).');
      }
      this.currentPlayerIndex = this.players.findIndex((p) => p.id === playerId);
      this.pushLog(`${actingPlayer.name} fait un Saute-mouton !`);
    }

    const player = this.currentPlayer();
    const cardIndex = player.hand.findIndex((c) => c.id === cardId);
    if (cardIndex === -1) throw new Error('Carte introuvable dans votre main.');
    const card = player.hand[cardIndex];

    // Resolving a pending draw by stacking (Chaos rule only).
    if (this.pendingDraw) {
      if (!this.rules.chaos || (card.value !== 'draw2' && card.value !== 'wild4')) {
        throw new Error('Vous devez piocher ou accuser le +4 en cours.');
      }
      if (card.value === 'wild4' && !chosenColor) {
        throw new Error('Vous devez choisir une couleur.');
      }
      player.hand.splice(cardIndex, 1);
      player.handCount = player.hand.length;
      this.discard.push(card);

      const previousColorForChallenge = this.currentColor;
      this.currentColor = card.value === 'wild4' ? chosenColor! : card.color;
      const addAmount = card.value === 'wild4' ? 4 : 2;

      if (player.hand.length === 0) {
        this.status = 'finished';
        this.winnerId = player.id;
        this.pushLog(`${player.name} gagne la partie !`);
        this.pendingDraw = null;
        return;
      }
      this.checkUnoPenaltyDeferred(player);

      const nextIndex = (this.currentPlayerIndex + this.direction + this.players.length) % this.players.length;
      const nextVictim = this.players[nextIndex];
      this.pendingDraw = {
        count: this.pendingDraw.count + addAmount,
        victimId: nextVictim.id,
        canChallenge: card.value === 'wild4',
        accusedId: card.value === 'wild4' ? player.id : undefined,
      };
      this.pendingChallengeColor = card.value === 'wild4' ? previousColorForChallenge : null;
      this.pushLog(`${player.name} empile un ${card.value === 'wild4' ? '+4' : '+2'} ! (${this.pendingDraw.count} cartes en jeu)`);
      this.advanceTurn(1);
      return;
    }

    const topCard = this.discard[this.discard.length - 1];
    if (!isCurrent) {
      // Jump-in cards are always legal by definition (exact match); skip normal color check.
    } else if (!this.currentColor || !cardIsPlayable(card, topCard, this.currentColor)) {
      throw new Error('Cette carte ne peut pas être jouée.');
    }

    if (card.color === 'wild' && !chosenColor) {
      throw new Error('Vous devez choisir une couleur.');
    }

    player.hand.splice(cardIndex, 1);
    player.handCount = player.hand.length;
    this.discard.push(card);

    const previousColor = this.currentColor;
    this.currentColor = card.color === 'wild' ? chosenColor! : card.color;

    if (player.hand.length === 0) {
      this.status = 'finished';
      this.winnerId = player.id;
      this.pushLog(`${player.name} gagne la partie !`);
      return;
    }

    this.checkUnoPenaltyDeferred(player);

    switch (card.value) {
      case 'skip':
        this.pushLog(`${player.name} joue Skip.`);
        this.advanceTurn(2);
        break;
      case 'reverse':
        this.pushLog(`${player.name} joue Inversion.`);
        this.direction = this.direction === 1 ? -1 : 1;
        if (this.players.length === 2) {
          this.advanceTurn(2);
        } else {
          this.advanceTurn(1);
        }
        break;
      case 'draw2': {
        if (this.rules.chaos) {
          const nextIndex = (this.currentPlayerIndex + this.direction + this.players.length) % this.players.length;
          this.pendingDraw = { count: 2, victimId: this.players[nextIndex].id, canChallenge: false };
          this.pendingChallengeColor = null;
          this.pushLog(`${player.name} joue +2 ! (2 cartes en jeu)`);
          this.advanceTurn(1);
        } else {
          this.advanceTurn(1);
          const victim = this.currentPlayer();
          this.forceDraw(victim, 2);
          this.pushLog(`${player.name} joue +2, ${victim.name} pioche 2 cartes.`);
          this.advanceTurn(1);
        }
        break;
      }
      case 'wild4': {
        const nextIndex = (this.currentPlayerIndex + this.direction + this.players.length) % this.players.length;
        this.pendingDraw = { count: 4, victimId: this.players[nextIndex].id, canChallenge: true, accusedId: player.id };
        this.pendingChallengeColor = previousColor;
        this.pushLog(`${player.name} joue +4 !`);
        this.advanceTurn(1);
        break;
      }
      default:
        this.pushLog(`${player.name} joue ${card.color} ${card.value}.`);
        if (this.rules.stacking) {
          this.openStackWindow(player, card.value);
        } else {
          this.advanceTurn(1);
        }
        break;
    }
  }

  private openStackWindow(player: Player, value: CardValue) {
    const breakerIndex = (this.currentPlayerIndex + this.direction + this.players.length) % this.players.length;
    this.stackWindow = {
      playerId: player.id,
      value,
      skipCount: 0,
      expiresAt: Date.now() + STACK_WINDOW_MS,
      breakerId: this.players[breakerIndex].id,
    };
  }

  private extendStack(playerId: string, cardId: string) {
    const window = this.stackWindow!;
    const player = this.players.find((p) => p.id === playerId)!;
    const cardIndex = player.hand.findIndex((c) => c.id === cardId);
    if (cardIndex === -1) throw new Error('Carte introuvable dans votre main.');
    const card = player.hand[cardIndex];
    if (card.value !== window.value) {
      throw new Error('Cette carte doit avoir le même chiffre pour empiler.');
    }

    player.hand.splice(cardIndex, 1);
    player.handCount = player.hand.length;
    this.discard.push(card);
    this.currentColor = card.color;
    this.pushLog(`${player.name} empile un ${card.color} ${card.value} !`);

    if (player.hand.length === 0) {
      this.status = 'finished';
      this.winnerId = player.id;
      this.pushLog(`${player.name} gagne la partie !`);
      this.stackWindow = null;
      return;
    }
    this.checkUnoPenaltyDeferred(player);

    window.skipCount += 1;
    window.expiresAt = Date.now() + STACK_WINDOW_MS;
  }

  breakStack(playerId: string) {
    if (this.status !== 'playing') throw new Error('La partie n\'est pas en cours.');
    if (!this.stackWindow) throw new Error('Aucun empilement en cours.');
    if (this.stackWindow.breakerId !== playerId) throw new Error('Vous ne pouvez pas casser ce tour.');

    const owner = this.players.find((p) => p.id === this.stackWindow!.playerId);
    const breaker = this.players.find((p) => p.id === playerId);
    this.stackWindow = null;
    this.advanceTurn(1);
    this.pushLog(`${breaker?.name ?? '...'} casse l'empilement de ${owner?.name ?? '...'} !`);
  }

  // Called periodically by the server; resolves the window once its timer has expired.
  resolveStackWindowTimeout(): boolean {
    if (!this.stackWindow) return false;
    if (Date.now() < this.stackWindow.expiresAt) return false;
    const owner = this.players.find((p) => p.id === this.stackWindow!.playerId);
    const steps = this.stackWindow.skipCount + 1;
    this.stackWindow = null;
    this.advanceTurn(steps);
    this.pushLog(`${owner?.name ?? '...'} termine son empilement (${steps} carte${steps > 1 ? 's' : ''}).`);
    return true;
  }

  accuseLiar(playerId: string) {
    if (this.status !== 'playing') throw new Error('La partie n\'est pas en cours.');
    if (!this.pendingDraw || !this.pendingDraw.canChallenge) throw new Error('Aucun +4 à contester.');
    if (this.pendingDraw.victimId !== playerId) throw new Error('Seule la victime du +4 peut accuser.');

    const accused = this.players.find((p) => p.id === this.pendingDraw!.accusedId);
    const victim = this.players.find((p) => p.id === playerId);
    if (!accused || !victim) throw new Error('Joueur introuvable.');

    const previousColor = this.pendingChallengeColor;
    const hadMatchingCard = previousColor ? accused.hand.some((c) => c.color === previousColor) : false;

    this.lastReveal = { playerId: accused.id, cards: [...accused.hand], wasLying: hadMatchingCard, resolvedAt: Date.now() };

    if (hadMatchingCard) {
      this.forceDraw(accused, 6);
      this.pushLog(`${victim.name} accuse ${accused.name} de menteur : démasqué ! ${accused.name} pioche 6 cartes.`);
    } else {
      this.forceDraw(victim, 6);
      this.pushLog(`${victim.name} accuse ${accused.name} à tort et pioche 6 cartes !`);
    }

    this.pendingDraw = null;
    this.pendingChallengeColor = null;
    this.advanceTurn(1);
  }

  // hand.length===1 case is checked right after playing; store flag reset
  private checkUnoPenaltyDeferred(player: Player) {
    if (player.hand.length !== 1) {
      player.hasCalledUno = false;
    }
  }

  callUno(playerId: string) {
    const player = this.players.find((p) => p.id === playerId);
    if (!player) throw new Error('Joueur introuvable.');
    if (player.hand.length !== 1) throw new Error('Vous ne pouvez dire UNO que s\'il vous reste 1 carte.');
    player.hasCalledUno = true;
    this.pushLog(`${player.name} dit UNO !`);
  }

  drawCard(playerId: string) {
    if (this.status !== 'playing') throw new Error('La partie n\'est pas en cours.');
    if (this.stackWindow) throw new Error('Un empilement est en cours ; attendez ou cassez le tour.');
    const player = this.currentPlayer();
    if (player.id !== playerId) throw new Error('Ce n\'est pas votre tour.');

    if (this.pendingDraw) {
      if (this.pendingDraw.victimId !== playerId) throw new Error('Ce n\'est pas votre tour.');
      const count = this.pendingDraw.count;
      this.forceDraw(player, count);
      this.pushLog(`${player.name} pioche ${count} carte${count > 1 ? 's' : ''}.`);
      this.pendingDraw = null;
      this.pendingChallengeColor = null;
      this.advanceTurn(1);
      return;
    }

    if (this.hasDrawnThisTurn) {
      throw new Error('Vous avez déjà pioché ce tour ; jouez la carte piochée ou passez.');
    }

    if (this.rules.infiniteDraw) {
      let drawnCount = 0;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        this.ensureDeck(1);
        if (this.deck.length === 0) break;
        const card = this.deck.shift()!;
        player.hand.push(card);
        drawnCount += 1;
        if (card.color === 'wild' || card.color === this.currentColor) break;
      }
      player.handCount = player.hand.length;
      player.hasCalledUno = false;
      if (drawnCount === 0) {
        this.advanceTurn(1);
        return;
      }
      this.pushLog(`${player.name} pioche ${drawnCount} carte${drawnCount > 1 ? 's' : ''} jusqu'à obtenir une carte jouable.`);
      this.advanceTurn(1);
      return;
    }

    this.ensureDeck(1);
    if (this.deck.length === 0) {
      // No cards left anywhere, just pass turn.
      this.advanceTurn(1);
      return;
    }
    const card = this.deck.shift()!;
    player.hand.push(card);
    player.handCount = player.hand.length;
    player.hasCalledUno = false;
    this.pushLog(`${player.name} pioche une carte.`);
    // Never auto-advance the turn here, and never reveal whether the drawn
    // card is playable: the player must always explicitly play it or pass,
    // so opponents can't infer playability from the timing of the turn change.
    this.hasDrawnThisTurn = true;
  }

  passTurn(playerId: string) {
    if (this.status !== 'playing') throw new Error('La partie n\'est pas en cours.');
    if (this.stackWindow) throw new Error('Un empilement est en cours ; attendez ou cassez le tour.');
    if (this.pendingDraw) throw new Error('Vous devez d\'abord réagir à la pioche en cours.');
    const player = this.currentPlayer();
    if (player.id !== playerId) throw new Error('Ce n\'est pas votre tour.');
    if (!this.hasDrawnThisTurn) throw new Error('Vous devez piocher avant de passer votre tour.');
    this.pushLog(`${player.name} passe son tour.`);
    this.advanceTurn(1);
  }

  private toPublicPlayer(p: Player): PublicPlayer {
    return {
      id: p.id,
      name: p.name,
      handCount: p.hand.length,
      isConnected: p.isConnected,
      hasCalledUno: p.hasCalledUno,
    };
  }

  getPersonalState(playerId: string): PersonalGameState {
    const me = this.players.find((p) => p.id === playerId);
    const topCard = this.discard.length > 0 ? this.discard[this.discard.length - 1] : null;
    return {
      roomCode: this.roomCode,
      players: this.players.map((p) => this.toPublicPlayer(p)),
      hostId: this.hostId,
      currentPlayerId: this.status === 'playing' ? this.currentPlayer().id : null,
      direction: this.direction,
      currentColor: this.currentColor,
      topCard,
      discardCount: this.discard.length,
      deckCount: this.deck.length,
      status: this.status,
      winnerId: this.winnerId,
      awaitingColorChoice: false,
      rules: this.rules,
      pendingDraw: this.pendingDraw,
      lastReveal: this.lastReveal,
      stackWindow: this.stackWindow,
      hasDrawnThisTurn: this.hasDrawnThisTurn,
      log: this.log,
      yourHand: me ? me.hand : [],
      yourId: playerId,
    };
  }
}
