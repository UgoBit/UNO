"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRoom = createRoom;
exports.getRoom = getRoom;
exports.deleteRoom = deleteRoom;
exports.isRoomEmpty = isRoomEmpty;
const shared_1 = require("@uno/shared");
const rooms = new Map();
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function generateRoomCode() {
    let code;
    do {
        code = Array.from({ length: 5 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
    } while (rooms.has(code));
    return code;
}
function createRoom(hostId) {
    const code = generateRoomCode();
    const game = new shared_1.UnoGame(code, hostId);
    rooms.set(code, game);
    return game;
}
function getRoom(roomCode) {
    return rooms.get(roomCode.toUpperCase());
}
function deleteRoom(roomCode) {
    rooms.delete(roomCode.toUpperCase());
}
function isRoomEmpty(game) {
    return game.players.every((p) => !p.isConnected) || game.players.length === 0;
}
