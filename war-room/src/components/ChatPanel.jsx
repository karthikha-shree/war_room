import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { initializeSocket, getSocket } from '../socket/socket';
import { getBoardMessages } from '../api/boardApi';

export default function ChatPanel({ boardId }) {
    const [messages, setMessages] = useState([]);
    const [messageText, setMessageText] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { token, user } = useAuth();
    const messagesEndRef = useRef(null);

    // Auto-scroll to bottom when messages update
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (!boardId || !token) return;

        let cleanupSocket = null;

        // Step 1: Load chat history FIRST
        const loadChatHistory = async () => {
            try {
                setLoading(true);
                setError('');
                setMessages([]); // Clear previous messages
                
                console.log('Loading chat history for board:', boardId);
                const chatHistory = await getBoardMessages(boardId);
                console.log('Chat history loaded:', chatHistory);
                
                // Set chat history in state
                setMessages(chatHistory || []);
                
                return chatHistory || [];
            } catch (err) {
                console.error('Failed to load chat history:', err);
                setError('Failed to load chat history');
                return [];
            }
        };

        // Step 2: Initialize socket AFTER history is loaded
        const setupSocketConnection = () => {
            try {
                console.log('Initializing socket connection...');
                initializeSocket(token);
                const socket = getSocket();

                if (socket) {
                    // Join the board room
                    console.log('Joining board room:', boardId);
                    socket.emit('joinBoard', { boardId });

                    // Remove any existing listeners to prevent duplicates
                    socket.off('newMessage');

                    // Listen for NEW messages (append to existing history)
                    socket.on('newMessage', (message) => {
                        console.log('Received new message:', message);
                        setMessages(prev => {
                            // Prevent duplicates by checking if message already exists
                            const isDuplicate = prev.some(m => 
                                m._id === message._id || 
                                (m.text === message.text && m.user?._id === message.user?._id && Math.abs(new Date(m.createdAt || m.timestamp) - new Date(message.createdAt || message.timestamp)) < 1000)
                            );
                            
                            if (isDuplicate) {
                                console.log('Duplicate message detected, skipping');
                                return prev;
                            }
                            
                            return [...prev, message];
                        });
                    });

                    // Store cleanup function
                    cleanupSocket = () => {
                        console.log('Cleaning up socket listeners');
                        socket.off('newMessage');
                    };
                }
            } catch (err) {
                console.error('Failed to setup socket connection:', err);
                setError('Failed to connect to chat');
            }
        };

        // Execute in sequence: History THEN Socket
        const initializeChat = async () => {
            try {
                // Step 1: Load history first
                await loadChatHistory();
                
                // Step 2: Setup socket after history is loaded
                setupSocketConnection();
                
            } finally {
                setLoading(false);
            }
        };

        initializeChat();

        // Cleanup on unmount or dependency change
        return () => {
            if (cleanupSocket) {
                cleanupSocket();
            }
        };
    }, [boardId, token]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!messageText.trim()) return;

        const socket = getSocket();
        if (socket) {
            // 5. Send message
            socket.emit('sendMessage', {
                boardId,
                text: messageText.trim()
            });
            setMessageText('');
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-50">
            {/* Error message */}
            {error && (
                <div className="p-3 bg-red-50 text-red-700 text-sm border-b border-red-200">
                    {error}
                </div>
            )}

            {/* Messages container */}
            <div className="flex-1 overflow-y-auto px-4 py-2">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-600 text-sm">
                        🔄 Loading chat history...
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-600 text-sm">
                        💬 No messages yet. Start the conversation!
                    </div>
                ) : (
                    <div className="flex flex-col gap-3 py-2">
                        {messages.map((message, index) => {
                            // Extract sender name properly from user object or string
                            const senderName = message.sender || 
                                             (typeof message.user === 'object' ? message.user.name || message.user.email : message.user) || 
                                             'Anonymous';
                            
                            // Check if message is from current user
                            const isOwnMessage = message.user?._id === user?._id;
                            
                            return (
                                <div key={index} className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                                    <div className="flex flex-col">
                                        {!isOwnMessage && (
                                            <span className="text-xs text-gray-500 mb-1 ml-3">
                                                {senderName}
                                            </span>
                                        )}
                                        <div className={`max-w-xs px-4 py-2 rounded-2xl text-sm break-words ${
                                            isOwnMessage 
                                                ? 'bg-blue-500 text-white'
                                                : 'bg-gray-200 text-black'
                                        }`}>
                                            {message.text || message.message}
                                        </div>
                                        {message.timestamp && (
                                            <span className={`text-xs text-gray-500 mt-1 ${
                                                isOwnMessage ? 'text-right mr-2' : 'ml-2'
                                            }`}>
                                                {new Date(message.timestamp).toLocaleTimeString([], {
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>
                )}
            </div>

            {/* Input form */}
            <div className="border-t p-3">
                <form onSubmit={handleSubmit} className="flex gap-3">
                <input
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-full text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <button 
                    type="submit"
                    disabled={!messageText.trim()}
                    className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${
                        messageText.trim() 
                            ? 'bg-blue-500 hover:bg-blue-600 text-white cursor-pointer' 
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                >
                    Send
                </button>
                </form>
            </div>
        </div>
    );
}