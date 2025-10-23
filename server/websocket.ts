import { Server as HTTPServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { auth } from "./firebase-admin";

export interface NotificationPayload {
  type: 'post' | 'comment' | 'like' | 'answer' | 'event' | 'achievement';
  userId: string;
  message: string;
  data?: any;
  timestamp: Date;
}

const userConnections = new Map<string, WebSocket[]>();

export function setupWebSocket(httpServer: HTTPServer) {
  const wss = new WebSocketServer({ 
    server: httpServer,
    path: '/ws'
  });

  wss.on('connection', (ws: WebSocket) => {
    let userId: string | null = null;
    let authTimeout: NodeJS.Timeout | null = null;

    // Set a timeout for authentication - close connection if not authenticated in 10 seconds
    authTimeout = setTimeout(() => {
      if (!userId) {
        ws.close(4001, 'Authentication timeout');
      }
    }, 10000);

    ws.on('message', async (message: string) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'auth' && data.token) {
          try {
            // Verify Firebase ID token
            const decodedToken = await auth.verifyIdToken(data.token);
            userId = decodedToken.uid;
            
            // Clear auth timeout
            if (authTimeout) {
              clearTimeout(authTimeout);
              authTimeout = null;
            }
            
            // Store connection
            if (!userConnections.has(userId)) {
              userConnections.set(userId, []);
            }
            userConnections.get(userId)!.push(ws);
            
            // Send confirmation
            ws.send(JSON.stringify({ 
              type: 'connected', 
              message: 'WebSocket authenticated successfully' 
            }));
          } catch (error) {
            console.error('Firebase token verification failed:', error);
            ws.close(4003, 'Authentication failed');
          }
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      if (authTimeout) {
        clearTimeout(authTimeout);
      }
      
      if (userId !== null) {
        const connections = userConnections.get(userId) || [];
        const index = connections.indexOf(ws);
        if (index > -1) {
          connections.splice(index, 1);
        }
        if (connections.length === 0) {
          userConnections.delete(userId);
        }
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  return wss;
}

export function sendNotification(userId: string, notification: NotificationPayload) {
  const connections = userConnections.get(userId);
  
  if (connections && connections.length > 0) {
    const payload = JSON.stringify({
      ...notification,
      notificationType: 'notification'
    });

    connections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    });
  }
}

export function broadcastToChannel(userIds: string[], notification: NotificationPayload) {
  userIds.forEach(userId => {
    sendNotification(userId, notification);
  });
}
