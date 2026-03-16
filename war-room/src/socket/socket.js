import { io } from 'socket.io-client';

let socket = null;

export function initializeSocket(token) {
    // Prevent duplicate connections
    if (socket) {
        return socket;
    }

    // Get the API URL and remove /api if present
    let baseUrl = import.meta.env.VITE_API_URL;
    if (baseUrl.endsWith('/api')) {
        baseUrl = baseUrl.slice(0, -4);
    }

    // Connect with specific configuration
    socket = io(baseUrl, {
        auth: { token },
        transports: ["websocket"],
    });

    // Log connection events for debugging
    socket.on('connect', () => {
        console.log('Socket connected:', socket.id);
    });

    socket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
    });

    return socket;
}

export function getSocket() {
    return socket;
}

export function disconnectSocket() {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
}
