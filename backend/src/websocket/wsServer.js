// src/websocket/wsServer.js
// WebSocket server initialization with heartbeat and health monitoring

import { Server } from "ws";
import { handleConnection, clients } from "./wsHandlers.js";

/**
 * Initialize WebSocket Server
 * @param {http.Server} server - HTTP server instance to attach WebSocket to
 * @returns {WebSocket.Server} - WebSocket server instance
 */
const initWebSocketServer = (server) => {
  // Create WebSocket server
  const wss = new Server({
    server,
    // Path for WebSocket connections
    path: "/ws",
    // Maximum payload size (1MB) to prevent abuse
    maxPayload: 1024 * 1024,
    // Client tracking
    clientTracking: true,
    // Verify client before upgrade
    verifyClient: (info, callback) => {
      // Add custom verification logic here if needed
      // For now, accept all connections
      callback(true);
    },
  });

  console.log(" WebSocket server initialized on path: /ws");

  // Handle new connections
  wss.on("connection", handleConnection);

  // Handle server-level errors
  wss.on("error", (error) => {
    console.error(" WebSocket Server Error:", error);
  });

  // Set up heartbeat mechanism to detect dead connections
  setupHeartbeat(wss);

  return wss;
};

/**
 * Heartbeat Mechanism
 * Periodically pings clients to check if they're still alive
 * Terminates dead connections to free up resources
 *
 * @param {WebSocket.Server} wss - WebSocket server instance
 */
const setupHeartbeat = (wss) => {
  // Get heartbeat interval from env or use default (30 seconds)
  const heartbeatInterval =
    parseInt(process.env.WS_HEARTBEAT_INTERVAL) || 30000;

  console.log(
    `Heartbeat mechanism enabled (interval: ${heartbeatInterval}ms)`,
  );

  /**
   * Heartbeat interval timer
   * Runs every X seconds to check client connections
   */
  const interval = setInterval(() => {
    let aliveCount = 0;
    let deadCount = 0;

    // Check each connected client
    clients.forEach((clientData, ws) => {
      // If client didn't respond to last ping, terminate connection
      if (clientData.isAlive === false) {
        console.log(` Terminating dead connection: ${clientData.id}`);
        deadCount++;
        ws.terminate();
        return;
      }

      // Mark as not alive until pong is received
      clientData.isAlive = false;

      // Send ping to client
      try {
        ws.ping();
        aliveCount++;
      } catch (error) {
        console.error(`Error pinging ${clientData.id}:`, error.message);
      }
    });

    if (aliveCount > 0 || deadCount > 0) {
      console.log(
        ` Heartbeat: ${aliveCount} pinged, ${deadCount} terminated`,
      );
    }
  }, heartbeatInterval);

  /**
   * Clean up interval when server closes
   */
  wss.on("close", () => {
    clearInterval(interval);
    console.log(" Heartbeat mechanism stopped");
  });
};

/**
 * Gracefully shutdown WebSocket server
 * @param {WebSocket.Server} wss - WebSocket server instance
 */
const shutdownWebSocketServer = (wss) => {
  console.log(" Shutting down WebSocket server...");

  // Close all active connections
  clients.forEach((clientData, ws) => {
    if (ws.readyState === 1) {
      ws.send(
        JSON.stringify({
          type: "server_shutdown",
          message: "Server is shutting down",
        }),
      );
      ws.close(1001, "Server shutting down");
    } else {
      ws.terminate();
    }
  });

  // Close the server
  wss.close(() => {
    console.log(" WebSocket server closed");
  });
};

export default {
  initWebSocketServer,
  shutdownWebSocketServer,
};
