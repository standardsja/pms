import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { prisma } from '../prismaClient';

let io: SocketIOServer | null = null;

/**
 * Initialize WebSocket server for real-time updates
 */
export function initWebSocket(httpServer: HTTPServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket) => {
    console.log(`[WebSocket] Client connected: ${socket.id}`);

    // Join idea-specific room
    socket.on('subscribe:idea', (ideaId: number) => {
      socket.join(`idea:${ideaId}`);
      console.log(`[WebSocket] ${socket.id} subscribed to idea:${ideaId}`);
    });

    // Leave idea-specific room
    socket.on('unsubscribe:idea', (ideaId: number) => {
      socket.leave(`idea:${ideaId}`);
      console.log(`[WebSocket] ${socket.id} unsubscribed from idea:${ideaId}`);
    });

    // Join committee room
    socket.on('subscribe:committee', () => {
      socket.join('committee');
      console.log(`[WebSocket] ${socket.id} subscribed to committee`);
    });

    // Leave committee room
    socket.on('unsubscribe:committee', () => {
      socket.leave('committee');
      console.log(`[WebSocket] ${socket.id} unsubscribed from committee`);
    });

    // Join global ideas feed
    socket.on('subscribe:ideas', () => {
      socket.join('ideas');
      console.log(`[WebSocket] ${socket.id} subscribed to ideas feed`);
    });

    // Leave global ideas feed
    socket.on('unsubscribe:ideas', () => {
      socket.leave('ideas');
      console.log(`[WebSocket] ${socket.id} unsubscribed from ideas feed`);
    });

    socket.on('disconnect', () => {
      console.log(`[WebSocket] Client disconnected: ${socket.id}`);
    });
  });

  console.log('[WebSocket] Server initialized');
  return io;
}

/**
 * Get WebSocket server instance
 */
export function getIO(): SocketIOServer | null {
  return io;
}

/**
 * Emit new idea created event
 */
export function emitIdeaCreated(idea: any): void {
  if (!io) return;
  
  io.to('ideas').emit('idea:created', {
    id: idea.id,
    title: idea.title,
    category: idea.category,
    submittedAt: idea.submittedAt,
    voteCount: idea.voteCount,
  });

  io.to('committee').emit('idea:pending', {
    id: idea.id,
    title: idea.title,
    category: idea.category,
    submittedAt: idea.submittedAt,
  });

  console.log(`[WebSocket] Emitted idea:created for idea ${idea.id}`);
}

/**
 * Emit idea status changed event
 */
export function emitIdeaStatusChanged(ideaId: number, oldStatus: string, newStatus: string): void {
  if (!io) return;

  const event = {
    ideaId,
    oldStatus,
    newStatus,
    timestamp: new Date(),
  };

  io.to(`idea:${ideaId}`).emit('idea:status-changed', event);
  io.to('ideas').emit('idea:updated', { ideaId, status: newStatus });
  io.to('committee').emit('idea:status-changed', event);

  console.log(`[WebSocket] Emitted status change for idea ${ideaId}: ${oldStatus} -> ${newStatus}`);
}

/**
 * Emit vote updated event
 */
export function emitVoteUpdated(ideaId: number, voteCount: number, trendingScore?: number): void {
  if (!io) return;

  io.to(`idea:${ideaId}`).emit('idea:vote-updated', {
    ideaId,
    voteCount,
    trendingScore,
    timestamp: new Date(),
  });

  io.to('ideas').emit('idea:updated', { ideaId, voteCount, trendingScore });

  console.log(`[WebSocket] Emitted vote update for idea ${ideaId}: ${voteCount} votes`);
}

/**
 * Emit comment added event
 */
export function emitCommentAdded(ideaId: number, comment: any): void {
  if (!io) return;

  io.to(`idea:${ideaId}`).emit('idea:comment-added', {
    ideaId,
    comment: {
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt,
      author: comment.author,
    },
  });

  console.log(`[WebSocket] Emitted comment added for idea ${ideaId}`);
}

/**
 * Emit batch approval event
 */
export function emitBatchApproval(ideaIds: number[], action: 'APPROVE' | 'REJECT', count: number): void {
  if (!io) return;

  const event = {
    ideaIds,
    action,
    count,
    timestamp: new Date(),
  };

  io.to('committee').emit('ideas:batch-updated', event);
  io.to('ideas').emit('ideas:batch-updated', event);

  // Emit individual updates
  ideaIds.forEach(ideaId => {
    io?.to(`idea:${ideaId}`).emit('idea:status-changed', {
      ideaId,
      newStatus: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
    });
  });

  console.log(`[WebSocket] Emitted batch ${action} for ${count} ideas`);
}

/**
 * Emit trending scores updated event
 */
export function emitTrendingUpdated(): void {
  if (!io) return;

  io.to('ideas').emit('trending:updated', {
    timestamp: new Date(),
  });

  console.log('[WebSocket] Emitted trending scores updated');
}

/**
 * Broadcast system notification
 */
export function broadcastNotification(message: string, type: 'info' | 'success' | 'warning' | 'error'): void {
  if (!io) return;

  io.emit('notification', {
    message,
    type,
    timestamp: new Date(),
  });

  console.log(`[WebSocket] Broadcast notification: ${type} - ${message}`);
}
