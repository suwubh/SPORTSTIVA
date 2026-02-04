// src/websocket/wsValidation.js
// WebSocket message validation to ensure data integrity and security

/**
 * Validate incoming WebSocket messages
 * Ensures messages have required fields and proper format
 */

/**
 * Check if a value is a valid JSON string
 * @param {string} str - String to validate
 * @returns {boolean} - True if valid JSON
 */
const isValidJSON = (str) => {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
};

/**
 * Validate subscribe message
 * Expected format: { type: 'subscribe', matchId: number }
 */
const validateSubscribeMessage = (message) => {
  if (!message.type || message.type !== "subscribe") {
    return { valid: false, error: "Invalid message type" };
  }

  if (!message.matchId || typeof message.matchId !== "number") {
    return { valid: false, error: "Invalid or missing matchId" };
  }

  return { valid: true };
};

/**
 * Validate unsubscribe message
 * Expected format: { type: 'unsubscribe', matchId: number }
 */
const validateUnsubscribeMessage = (message) => {
  if (!message.type || message.type !== "unsubscribe") {
    return { valid: false, error: "Invalid message type" };
  }

  if (!message.matchId || typeof message.matchId !== "number") {
    return { valid: false, error: "Invalid or missing matchId" };
  }

  return { valid: true };
};

/**
 * Validate ping/pong message for heartbeat
 * Expected format: { type: 'ping' } or { type: 'pong' }
 */
const validateHeartbeatMessage = (message) => {
  if (!message.type || (message.type !== "ping" && message.type !== "pong")) {
    return { valid: false, error: "Invalid heartbeat message" };
  }

  return { valid: true };
};

/**
 * Main message validator
 * Routes to specific validators based on message type
 * @param {string} rawMessage - Raw WebSocket message
 * @returns {Object} - Validation result with parsed message
 */
const validateMessage = (rawMessage) => {
  // Check if message is valid JSON
  if (!isValidJSON(rawMessage)) {
    return {
      valid: false,
      error: "Invalid JSON format",
    };
  }

  const message = JSON.parse(rawMessage);

  // Check message size (prevent abuse)
  if (rawMessage.length > 10000) {
    return {
      valid: false,
      error: "Message too large",
    };
  }

  // Route to appropriate validator based on type
  switch (message.type) {
    case "subscribe":
      return { ...validateSubscribeMessage(message), message };

    case "unsubscribe":
      return { ...validateUnsubscribeMessage(message), message };

    case "ping":
    case "pong":
      return { ...validateHeartbeatMessage(message), message };

    default:
      return {
        valid: false,
        error: `Unknown message type: ${message.type}`,
      };
  }
};

/**
 * Sanitize data before broadcasting to prevent XSS
 * @param {Object} data - Data to sanitize
 * @returns {Object} - Sanitized data
 */
const sanitizeData = (data) => {
  if (typeof data === "string") {
    return data.replace(/[<>]/g, "");
  }

  if (typeof data === "object" && data !== null) {
    const sanitized = {};
    for (const key in data) {
      sanitized[key] = sanitizeData(data[key]);
    }
    return sanitized;
  }

  return data;
};

module.exports = {
  validateMessage,
  sanitizeData,
  isValidJSON,
};
