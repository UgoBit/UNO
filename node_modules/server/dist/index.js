"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const cors_1 = __importDefault(require("cors"));
const socket_io_1 = require("socket.io");
const roomManager_1 = require("./roomManager");
const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.get('/health', (_req, res) => {
    res.json({ ok: true });
});
const httpServer = http_1.default.createServer(app);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: '*',
    },
});
// Track which room + name each socket belongs to.
const socketRoom = new Map();
// Track the auto-resolve timer for each room's "Identique" stack window.
const stackTimers = new Map();
function clearStackTimer(roomCode) {
    const timer = stackTimers.get(roomCode);
    if (timer) {
        clearTimeout(timer);
        stackTimers.delete(roomCode);
    }
}
function scheduleStackTimer(roomCode, game) {
    clearStackTimer(roomCode);
    if (!game.stackWindow)
        return;
    const delay = Math.max(0, game.stackWindow.expiresAt - Date.now());
    const timer = setTimeout(() => {
        const resolved = game.resolveStackWindowTimeout();
        if (resolved) {
            broadcastState(game);
        }
        scheduleStackTimer(roomCode, game);
    }, delay);
    stackTimers.set(roomCode, timer);
}
function broadcastState(game) {
    game.players.forEach((p) => {
        io.to(p.id).emit('state_update', game.getPersonalState(p.id));
    });
}
function sendError(socketId, message) {
    io.to(socketId).emit('error_message', { message });
}
io.on('connection', (socket) => {
    socket.on('create_room', ({ name }) => {
        try {
            const cleanName = (name || '').trim().slice(0, 20) || 'Joueur';
            const game = (0, roomManager_1.createRoom)(socket.id);
            game.addPlayer(socket.id, cleanName);
            socketRoom.set(socket.id, game.roomCode);
            socket.join(game.roomCode);
            socket.emit('room_joined', { roomCode: game.roomCode, playerId: socket.id });
            broadcastState(game);
        }
        catch (err) {
            sendError(socket.id, err.message || 'Erreur inconnue.');
        }
    });
    socket.on('join_room', ({ roomCode, name }) => {
        try {
            const game = (0, roomManager_1.getRoom)(roomCode);
            if (!game) {
                sendError(socket.id, 'Ce salon n\'existe pas.');
                return;
            }
            const cleanName = (name || '').trim().slice(0, 20) || 'Joueur';
            game.addPlayer(socket.id, cleanName);
            socketRoom.set(socket.id, game.roomCode);
            socket.join(game.roomCode);
            socket.emit('room_joined', { roomCode: game.roomCode, playerId: socket.id });
            broadcastState(game);
        }
        catch (err) {
            sendError(socket.id, err.message || 'Erreur inconnue.');
        }
    });
    socket.on('start_game', () => {
        const roomCode = socketRoom.get(socket.id);
        if (!roomCode)
            return;
        const game = (0, roomManager_1.getRoom)(roomCode);
        if (!game)
            return;
        try {
            if (game.hostId !== socket.id) {
                sendError(socket.id, 'Seul l\'hôte peut démarrer la partie.');
                return;
            }
            game.start();
            broadcastState(game);
        }
        catch (err) {
            sendError(socket.id, err.message || 'Erreur inconnue.');
        }
    });
    socket.on('play_card', ({ cardId, chosenColor }) => {
        const roomCode = socketRoom.get(socket.id);
        if (!roomCode)
            return;
        const game = (0, roomManager_1.getRoom)(roomCode);
        if (!game)
            return;
        try {
            game.playCard(socket.id, cardId, chosenColor);
            broadcastState(game);
            scheduleStackTimer(roomCode, game);
        }
        catch (err) {
            sendError(socket.id, err.message || 'Erreur inconnue.');
        }
    });
    socket.on('break_stack', () => {
        const roomCode = socketRoom.get(socket.id);
        if (!roomCode)
            return;
        const game = (0, roomManager_1.getRoom)(roomCode);
        if (!game)
            return;
        try {
            game.breakStack(socket.id);
            broadcastState(game);
            scheduleStackTimer(roomCode, game);
        }
        catch (err) {
            sendError(socket.id, err.message || 'Erreur inconnue.');
        }
    });
    socket.on('accuse_liar', () => {
        const roomCode = socketRoom.get(socket.id);
        if (!roomCode)
            return;
        const game = (0, roomManager_1.getRoom)(roomCode);
        if (!game)
            return;
        try {
            game.accuseLiar(socket.id);
            broadcastState(game);
        }
        catch (err) {
            sendError(socket.id, err.message || 'Erreur inconnue.');
        }
    });
    socket.on('update_rules', ({ rules }) => {
        const roomCode = socketRoom.get(socket.id);
        if (!roomCode)
            return;
        const game = (0, roomManager_1.getRoom)(roomCode);
        if (!game)
            return;
        try {
            if (game.hostId !== socket.id) {
                sendError(socket.id, 'Seul l\'hôte peut modifier les règles.');
                return;
            }
            game.setRules(rules);
            broadcastState(game);
        }
        catch (err) {
            sendError(socket.id, err.message || 'Erreur inconnue.');
        }
    });
    socket.on('draw_card', () => {
        const roomCode = socketRoom.get(socket.id);
        if (!roomCode)
            return;
        const game = (0, roomManager_1.getRoom)(roomCode);
        if (!game)
            return;
        try {
            game.drawCard(socket.id);
            broadcastState(game);
        }
        catch (err) {
            sendError(socket.id, err.message || 'Erreur inconnue.');
        }
    });
    socket.on('pass_turn', () => {
        const roomCode = socketRoom.get(socket.id);
        if (!roomCode)
            return;
        const game = (0, roomManager_1.getRoom)(roomCode);
        if (!game)
            return;
        try {
            game.passTurn(socket.id);
            broadcastState(game);
        }
        catch (err) {
            sendError(socket.id, err.message || 'Erreur inconnue.');
        }
    });
    socket.on('call_uno', () => {
        const roomCode = socketRoom.get(socket.id);
        if (!roomCode)
            return;
        const game = (0, roomManager_1.getRoom)(roomCode);
        if (!game)
            return;
        try {
            game.callUno(socket.id);
            broadcastState(game);
        }
        catch (err) {
            sendError(socket.id, err.message || 'Erreur inconnue.');
        }
    });
    socket.on('catch_uno', ({ targetId }) => {
        const roomCode = socketRoom.get(socket.id);
        if (!roomCode)
            return;
        const game = (0, roomManager_1.getRoom)(roomCode);
        if (!game)
            return;
        try {
            game.catchUno(socket.id, targetId);
            broadcastState(game);
        }
        catch (err) {
            sendError(socket.id, err.message || 'Erreur inconnue.');
        }
    });
    socket.on('leave_room', () => {
        handleDisconnect(socket.id);
    });
    socket.on('disconnect', () => {
        handleDisconnect(socket.id);
    });
});
function handleDisconnect(socketId) {
    const roomCode = socketRoom.get(socketId);
    if (!roomCode)
        return;
    const game = (0, roomManager_1.getRoom)(roomCode);
    socketRoom.delete(socketId);
    if (!game)
        return;
    game.removePlayer(socketId);
    if ((0, roomManager_1.isRoomEmpty)(game)) {
        clearStackTimer(roomCode);
        (0, roomManager_1.deleteRoom)(roomCode);
        return;
    }
    broadcastState(game);
}
httpServer.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Serveur UNO démarré sur le port ${PORT}`);
});
