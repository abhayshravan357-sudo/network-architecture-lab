import { WebSocketServer } from 'ws';
import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';

// Message types (matching y-websocket client)
const messageSync = 0;
const messageAwareness = 1;
const messageQueryAwareness = 3;

// Store for documents (rooms)
const docs = new Map();

// Get or create a Y.Doc for a room
const getDoc = (roomName) => {
  if (!docs.has(roomName)) {
    docs.set(roomName, new Y.Doc());
  }
  return docs.get(roomName);
};

// Broadcast to all clients in a room except sender
const broadcast = (roomName, buf, sender) => {
  const room = rooms.get(roomName);
  if (room) {
    room.clients.forEach((client) => {
      if (client !== sender && client.readyState === 1) {
        client.send(buf);
      }
    });
  }
};

// Broadcast awareness to all clients in room (including sender for awareness)
const broadcastAwareness = (roomName, buf) => {
  const room = rooms.get(roomName);
  if (room) {
    room.clients.forEach((client) => {
      if (client.readyState === 1) {
        client.send(buf);
      }
    });
  }
};

// Store for rooms with clients and awareness
const rooms = new Map();

const getRoom = (roomName) => {
  if (!rooms.has(roomName)) {
    rooms.set(roomName, { clients: new Set(), awareness: new awarenessProtocol.Awareness(getDoc(roomName)) });
  }
  return rooms.get(roomName);
};

// Handle incoming message from a client
const handleMessage = (roomName, ws, buf) => {
  const room = getRoom(roomName);
  const doc = getDoc(roomName);
  const decoder = decoding.createDecoder(buf);
  const encoder = encoding.createEncoder();
  const messageType = decoding.readVarUint(decoder);

  switch (messageType) {
    case messageSync: {
      // Handle sync protocol messages
      const syncMessageType = syncProtocol.readSyncMessage(decoder, encoder, doc, null);
      
      // If we sent a response (encoder has data), broadcast to others
      if (encoding.length(encoder) > 1) {
        broadcast(roomName, encoding.toUint8Array(encoder), ws);
      }
      break;
    }
    
    case messageQueryAwareness: {
      // Client requesting awareness state
      const awareness = room.awareness;
      const encoderAwareness = encoding.createEncoder();
      encoding.writeVarUint(encoderAwareness, messageAwareness);
      encoding.writeVarUint8Array(
        encoderAwareness,
        awarenessProtocol.encodeAwarenessUpdate(awareness, Array.from(awareness.getStates().keys()))
      );
      ws.send(encoding.toUint8Array(encoderAwareness));
      break;
    }
    
    case messageAwareness: {
      // Client sending awareness update
      awarenessProtocol.applyAwarenessUpdate(room.awareness, decoding.readVarUint8Array(decoder), ws);
      // Broadcast awareness to all clients in room
      const encoderAwareness = encoding.createEncoder();
      encoding.writeVarUint(encoderAwareness, messageAwareness);
      encoding.writeVarUint8Array(
        encoderAwareness,
        awarenessProtocol.encodeAwarenessUpdate(room.awareness, Array.from(room.awareness.getStates().keys()))
      );
      broadcastAwareness(roomName, encoding.toUint8Array(encoderAwareness));
      break;
    }
    
    default:
      console.warn(`Unknown message type: ${messageType}`);
  }
};

// Create WebSocket server
const PORT = process.env.PORT || 1234;
const wss = new WebSocketServer({ port: PORT });

console.log(`Yjs WebSocket server running on port ${PORT}`);

wss.on('connection', (ws, req) => {
  // Extract room name from URL path (y-websocket client uses path, not query param)
  // URL format: ws://localhost:1234/<roomname>
  const pathname = new URL(req.url, `http://localhost:${PORT}`).pathname;
  const roomName = pathname.slice(1) || 'default'; // Remove leading '/'
  
  // Get or create the room
  const room = getRoom(roomName);
  room.clients.add(ws);
  
  console.log(`Client connected to room: ${roomName} (${room.clients.size} clients)`);
  
  // Send sync step 1 on connection
  const doc = getDoc(roomName);
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, messageSync);
  syncProtocol.writeSyncStep1(encoder, doc);
  ws.send(encoding.toUint8Array(encoder));
  
  // Broadcast local awareness state
  const awareness = room.awareness;
  if (awareness.getLocalState() !== null) {
    const encoderAwareness = encoding.createEncoder();
    encoding.writeVarUint(encoderAwareness, messageAwareness);
    encoding.writeVarUint8Array(
      encoderAwareness,
      awarenessProtocol.encodeAwarenessUpdate(awareness, [doc.clientID])
    );
    ws.send(encoding.toUint8Array(encoderAwareness));
  }
  
  ws.on('message', (data) => {
    handleMessage(roomName, ws, data);
  });
  
  ws.on('close', () => {
    room.clients.delete(ws);
    // Remove awareness state for this client
    awarenessProtocol.removeAwarenessStates(room.awareness, [doc.clientID]);
    
    // Broadcast awareness removal to remaining clients
    const encoderAwareness = encoding.createEncoder();
    encoding.writeVarUint(encoderAwareness, messageAwareness);
    encoding.writeVarUint8Array(
      encoderAwareness,
      awarenessProtocol.encodeAwarenessUpdate(room.awareness, [])
    );
    broadcastAwareness(roomName, encoding.toUint8Array(encoderAwareness));
    
    console.log(`Client disconnected from room: ${roomName} (${room.clients.size} clients)`);
    
    if (room.clients.size === 0) {
      // Room is empty - optionally clean up after a timeout
      setTimeout(() => {
        const r = rooms.get(roomName);
        if (r && r.clients.size === 0) {
          rooms.delete(roomName);
          docs.delete(roomName);
          console.log(`Room ${roomName} cleaned up`);
        }
      }, 60000); // Keep for 1 min after last client leaves
    }
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

wss.on('error', (error) => {
  console.error('WebSocket server error:', error);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down...');
  wss.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Shutting down...');
  wss.close();
  process.exit(0);
});