import { io } from 'socket.io-client';

let socket = null;

export const initializeSocket = (token) => {
  if (!socket) {
    const serverURL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
    
    socket = io(serverURL, {
      auth: {
        token: token
      },
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  }

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const joinBoard = (boardId) => {
  if (socket) {
    socket.emit('join-board', boardId);
  }
};

export const leaveBoard = (boardId) => {
  if (socket) {
    socket.emit('leave-board', boardId);
  }
};