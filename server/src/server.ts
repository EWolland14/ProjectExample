import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { RoomManager } from './roomManager.js';
import { ClientToServerEvents, ServerToClientEvents } from '@rummikub/shared';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

const PORT = parseInt(process.env.PORT || '8080', 10);
const HOST = '0.0.0.0';

app.use(cors());
app.use(express.json());

// Cloud Run Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// Socket.IO setup with permissive CORS for local dev & production
const io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const roomManager = new RoomManager(io);

io.on('connection', socket => {
  // 1. Create Room
  socket.on('create_room', ({ playerName, mode }, callback) => {
    try {
      const { roomCode, playerId } = roomManager.createRoom(socket.id, playerName, mode);
      socket.join(roomCode);
      socket.emit('room_code', roomCode);
      callback({ success: true, roomCode });
      const room = roomManager.getRoomBySocket(socket.id);
      if (room) roomManager.broadcastState(room);
    } catch (err: any) {
      callback({ success: false, error: err.message || 'Failed to create room' });
    }
  });

  // 2. Join Room
  socket.on('join_room', ({ roomCode, playerName }, callback) => {
    try {
      const res = roomManager.joinRoom(socket.id, roomCode, playerName);
      if (res.success) {
        socket.join(roomCode.trim().toUpperCase());
        callback({ success: true });
      } else {
        callback({ success: false, error: res.error });
      }
    } catch (err: any) {
      callback({ success: false, error: err.message || 'Failed to join room' });
    }
  });

  // 3. Add Bot
  socket.on('add_bot', ({ difficulty }) => {
    roomManager.addBot(socket.id, difficulty);
  });

  // 4. Remove Player / Bot
  socket.on('remove_player', ({ playerId }) => {
    roomManager.removePlayer(socket.id, playerId);
  });

  // 5. Start Game
  socket.on('start_game', () => {
    roomManager.startGame(socket.id);
  });

  // 6. Update Board and Rack (Optimistic drag and drop sync)
  socket.on('update_board_and_rack', ({ board, rack }) => {
    roomManager.updateBoardAndRack(socket.id, board, rack);
  });

  // 7. End Turn (Authoritative validation)
  socket.on('end_turn', callback => {
    const res = roomManager.endTurn(socket.id);
    callback(res);
  });

  // 8. Revert Turn
  socket.on('revert_turn', () => {
    roomManager.revertTurn(socket.id);
  });

  // 9. Draw and Pass
  socket.on('draw_and_pass', () => {
    roomManager.drawAndPass(socket.id);
  });

  // 10. Disconnect
  socket.on('disconnect', () => {
    roomManager.handleDisconnect(socket.id);
  });
});

// Production static file serving
// In production container, client is built to `public` or `../client/dist`
const publicPath = path.resolve(__dirname, '../public');
app.use(express.static(publicPath));

// SPA fallback to index.html
app.get('*', (req, res) => {
  const indexPath = path.join(publicPath, 'index.html');
  res.sendFile(indexPath, err => {
    if (err) {
      res.status(200).send('Rummikub Server Running. Client frontend is compiling or running on Vite dev port.');
    }
  });
});

server.listen(PORT, HOST, () => {
  console.log(`🎲 Rummikub Server running on http://${HOST}:${PORT}`);
});
