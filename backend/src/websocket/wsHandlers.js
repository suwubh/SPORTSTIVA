// src/websocket/wsHandlers.js
// WebSocket connection handlers and message processing logic

import { validateMessage, sanitizeData } from "./wsValidation.js";

/**
 * Store active WebSocket connections
 * Structure: Map<matchId, Set<WebSocket>>
 * This allows efficient broadcasting to all clients subscribed to a specific match
 */
const subscriptions = new Map();

/**
 * Store client metadata
 * Structure: Map<WebSocket, { matchIds: Set, isAlive: boolean, id: string }>
 */
const clients = new Map();

let clientIdCounter = 0;

/**
 * Handle new WebSocket connection
 * @param {WebSocket} ws - WebSocket client connection
 * @param {Request} req - HTTP request object
 */
const handleConnection = (ws) => {
  // Generate unique client ID
  const clientId = `client-${++clientIdCounter}`;

  // Initialize client metadata
  clients.set(ws, {
    id: clientId,
    matchIds: new Set(), // Matches this client is subscribed to
    isAlive: true, // For heartbeat tracking
    connectedAt: new Date(),
  });

  console.log(`New WebSocket connection: ${clientId}`);
  console.log(`Total connections: ${clients.size}`);

  // Send welcome message
  ws.send(
    JSON.stringify({
      type: "connected",
      clientId: clientId,
      message: "Connected to Sportz WebSocket server",
    }),
  );

  // Set up message handler
  ws.on("message", (data) => handleMessage(ws, data));

  // Set up pong handler for heartbeat
  ws.on("pong", () => handlePong(ws));

  // Set up close handler
  ws.on("close", () => handleDisconnect(ws));

  // Set up error handler
  ws.on("error", (error) => handleError(ws, error));
};

/**
 * Handle incoming WebSocket messages
 * @param {WebSocket} ws - WebSocket client connection
 * @param {Buffer} data - Raw message data
 */
const handleMessage = (ws, data) => {
  const client = clients.get(ws);

  // Convert buffer to string
  const rawMessage = data.toString();

  // Validate message
  const validation = validateMessage(rawMessage);

  if (!validation.valid) {
    console.log(`Invalid message from ${client.id}: ${validation.error}`);
    ws.send(
      JSON.stringify({
        type: "error",
        message: validation.error,
      }),
    );
    return;
  }

  const message = validation.message;
  console.log(`Message from ${client.id}:`, message.type);

  // Handle different message types
  switch (message.type) {
    case "subscribe":
      handleSubscribe(ws, message.matchId);
      break;

    case "unsubscribe":
      handleUnsubscribe(ws, message.matchId);
      break;

    case "ping":
      // Respond to client ping with pong
      ws.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
      break;

    default:
      ws.send(
        JSON.stringify({
          type: "error",
          message: "Unknown message type",
        }),
      );
  }
};

/**
 * Subscribe client to match updates
 * @param {WebSocket} ws - WebSocket client connection
 * @param {number} matchId - Match ID to subscribe to
 */
const handleSubscribe = (ws, matchId) => {
  const client = clients.get(ws);

  // Add match to client's subscriptions
  client.matchIds.add(matchId);

  // Add client to match subscription list
  if (!subscriptions.has(matchId)) {
    subscriptions.set(matchId, new Set());
  }
  subscriptions.get(matchId).add(ws);

  console.log(`${client.id} subscribed to match ${matchId}`);
  console.log(
    `Match ${matchId} has ${subscriptions.get(matchId).size} subscribers`,
  );

  // Send confirmation
  ws.send(
    JSON.stringify({
      type: "subscribed",
      matchId: matchId,
      message: `Subscribed to match ${matchId}`,
    }),
  );
};

/**
 * Unsubscribe client from match updates
 * @param {WebSocket} ws - WebSocket client connection
 * @param {number} matchId - Match ID to unsubscribe from
 */
const handleUnsubscribe = (ws, matchId) => {
  const client = clients.get(ws);

  // Remove match from client's subscriptions
  client.matchIds.delete(matchId);

  // Remove client from match subscription list
  if (subscriptions.has(matchId)) {
    subscriptions.get(matchId).delete(ws);

    // Clean up empty subscription sets
    if (subscriptions.get(matchId).size === 0) {
      subscriptions.delete(matchId);
    }
  }

  console.log(`${client.id} unsubscribed from match ${matchId}`);

  // Send confirmation
  ws.send(
    JSON.stringify({
      type: "unsubscribed",
      matchId: matchId,
      message: `Unsubscribed from match ${matchId}`,
    }),
  );
};

/**
 * Handle pong response from client (heartbeat)
 * @param {WebSocket} ws - WebSocket client connection
 */
const handlePong = (ws) => {
  const client = clients.get(ws);
  if (client) {
    client.isAlive = true;
  }
};

/**
 * Handle client disconnect
 * @param {WebSocket} ws - WebSocket client connection
 */
const handleDisconnect = (ws) => {
  const client = clients.get(ws);

  if (client) {
    console.log(`Client disconnected: ${client.id}`);

    // Remove client from all match subscriptions
    client.matchIds.forEach((matchId) => {
      if (subscriptions.has(matchId)) {
        subscriptions.get(matchId).delete(ws);

        // Clean up empty subscription sets
        if (subscriptions.get(matchId).size === 0) {
          subscriptions.delete(matchId);
        }
      }
    });

    // Remove client metadata
    clients.delete(ws);

    console.log(`Total connections: ${clients.size}`);
  }
};

/**
 * Handle WebSocket errors
 * @param {WebSocket} ws - WebSocket client connection
 * @param {Error} error - Error object
 */
const handleError = (ws, error) => {
  const client = clients.get(ws);
  console.error(
    `WebSocket error for ${client?.id || "unknown"}:`,
    error.message,
  );
};

/**
 * Broadcast message to all clients subscribed to a specific match
 * @param {number} matchId - Match ID
 * @param {Object} data - Data to broadcast
 */
const broadcastToMatch = (matchId, data) => {
  const subscribers = subscriptions.get(matchId);

  if (!subscribers || subscribers.size === 0) {
    console.log(`No subscribers for match ${matchId}`);
    return;
  }

  // Sanitize data before broadcasting
  const sanitizedData = sanitizeData(data);
  const message = JSON.stringify(sanitizedData);

  console.log(
    `Broadcasting to ${subscribers.size} subscribers of match ${matchId}`,
  );

  // Send to all subscribers with backpressure handling
  let successCount = 0;
  let failureCount = 0;

  subscribers.forEach((client) => {
    try {
      // Check if client is ready to receive data
      if (client.readyState === 1) {
        // WebSocket.OPEN
        // Check buffered amount for backpressure
        if (client.bufferedAmount < 1024 * 1024) {
          // 1MB threshold
          client.send(message);
          successCount++;
        } else {
          console.warn(`Client has high buffered amount, skipping send`);
          failureCount++;
        }
      }
    } catch (error) {
      console.error("Error broadcasting to client:", error);
      failureCount++;
    }
  });

  console.log(
    `Broadcast complete: ${successCount} sent, ${failureCount} failed`,
  );
};

/**
 * Broadcast message to all connected clients
 * @param {Object} data - Data to broadcast
 */
const broadcastToAll = (data) => {
  const sanitizedData = sanitizeData(data);
  const message = JSON.stringify(sanitizedData);

  console.log(`Broadcasting to all ${clients.size} clients`);

  clients.forEach((clientData, ws) => {
    try {
      if (ws.readyState === 1 && ws.bufferedAmount < 1024 * 1024) {
        ws.send(message);
      }
    } catch (error) {
      console.error("Error broadcasting to client:", error);
    }
  });
};

/**
 * Get statistics about current connections
 * @returns {Object} - Connection statistics
 */
const getStats = () => {
  return {
    totalClients: clients.size,
    totalSubscriptions: subscriptions.size,
    subscriptionDetails: Array.from(subscriptions.entries()).map(
      ([matchId, subs]) => ({
        matchId,
        subscriberCount: subs.size,
      }),
    ),
  };
};

export {
  handleConnection,
  broadcastToMatch,
  broadcastToAll,
  getStats,
  clients,
};
