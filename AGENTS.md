# Projet UNO en ligne — Contexte et conventions

## Vue d'ensemble

Monorepo npm workspaces situé sous `c:\Users\ugobi\Desktop\Bureau\Pro\Projets\UNO`.
- Workspaces : `shared/`, `server/`, `client/`.
- Pas de base de données — l'état des salons est stocké en mémoire uniquement (perdu au redémarrage du serveur).

## Stack technique

- **Partagé** : TypeScript (`shared/`).
- **Serveur** : Express + Socket.io (`server/`).
- **Client** : Vite + React + TypeScript + TailwindCSS (`client/`).

## Scripts de développement

- `npm run dev:server` — démarre le serveur sur le port `3001`.
- `npm run dev:client` — démarre le client Vite sur le port `5173`.

## Architecture

### `shared/`

- `shared/src/types.ts` — types communs : `Card`, `GameState`, événements Socket.io (`ClientToServerEvents`, `ServerToClientEvents`).
- `shared/src/gameLogic.ts` — classe `UnoGame` gérant :
  - le deck,
  - les règles du jeu,
  - les tours,
  - les cartes spéciales (+2, +4, skip, reverse, wild),
  - la pénalité UNO.

### `server/`

- `server/src/index.ts` — point d'entrée Express + Socket.io. Gère les événements :
  - `create_room`
  - `join_room`
  - `start_game`
  - `play_card`
  - `draw_card`
  - `call_uno`
  - `leave_room`
- `server/src/roomManager.ts` — gestion des salons en mémoire via une `Map`. Les codes de salon font 5 caractères.

### `client/`

- `src/socket.ts` — singleton `socket.io-client`. L'URL du serveur est lue via `VITE_SERVER_URL` (défaut : `http://localhost:3001`).
- `src/components/Lobby.tsx`, `WaitingRoom.tsx`, `GameBoard.tsx`, `Card.tsx`.
- `src/App.tsx` — orchestre les vues (lobby / salle d'attente / jeu) via les événements Socket.io.

## Conventions à respecter

- Préserver la séparation `shared` / `server` / `client`.
- Les types et la logique de jeu doivent rester dans `shared/` afin d'être réutilisés par les deux autres workspaces.
- Les événements Socket.io doivent être documentés ou mis à jour dans `shared/src/types.ts`.
- Le client doit rester agnostique de l'hébergement du serveur : l'URL est configurable via `VITE_SERVER_URL`.

## Déploiement

### Client (Vercel)

Le client est un SPA Vite déployé sur Vercel.

1. Pousser le repo sur GitHub.
2. Sur Vercel, créer un projet en important ce repo.
3. Dans les paramètres du projet Vercel :
   - **Root Directory** : `client`
   - Les valeurs de `client/vercel.json` sont utilisées automatiquement.
4. Ajouter la variable d’environnement `VITE_SERVER_URL` pointant vers l’URL du serveur (ex. `https://uno-server-xxxx.onrender.com`).
5. Redéployer.

### Serveur (Render)

Le serveur Socket.io nécessite un processus Node.js persistant, donc il ne peut pas être hébergé sur Vercel.

1. Pousser le repo sur GitHub.
2. Sur Render, créer un **Web Service** à partir du repo.
   - **Root Directory** : `server`
   - **Build Command** : `npm install && npm run build -w server`
   - **Start Command** : `npm run start -w server`
3. Ajouter les variables d’environnement :
   - `NODE_ENV=production`
   - `PORT=3001`
4. Le fichier `server/render.yaml` peut aussi être utilisé comme blueprint.

### Notes importantes

- L’état des salons est stocké en mémoire : il disparaît à chaque redémarrage du serveur.
- L’offre gratuite de Render met le serveur en veille après 15 min d’inactivité. La première connexion réveille le service en ~30 s.
- Le CORS du serveur est configuré avec `origin: '*'`, compatible avec n’importe quelle URL Vercel.
- Reste à faire : tests multi-joueurs manuels.
