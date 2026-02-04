// src/models/Match.js
// Database model for match operations (CRUD operations)

import { query } from "../config/db.js";

/**
 * Match Model
 * Handles all database operations related to matches and commentary
 */
class Match {
  /**
   * Get all matches from the database
   * @returns {Promise<Array>} - Array of match objects
   */
  static async getAll() {
    const result = await query(
      `SELECT * FROM matches ORDER BY created_at DESC`,
    );
    return result.rows;
  }

  /**
   * Get a single match by ID
   * @param {number} id - Match ID
   * @returns {Promise<Object>} - Match object
   */
  static async getById(id) {
    const result = await query(`SELECT * FROM matches WHERE id = $1`, [id]);
    return result.rows[0];
  }

  /**
   * Get all live matches
   * @returns {Promise<Array>} - Array of live match objects
   */
  static async getLiveMatches() {
    const result = await query(
      `SELECT * FROM matches WHERE status = 'live' ORDER BY start_time DESC`,
    );
    return result.rows;
  }

  /**
   * Create a new match
   * @param {Object} matchData - Match data
   * @returns {Promise<Object>} - Created match object
   */
  static async create({
    home_team,
    away_team,
    team_home,
    team_away,
    start_time,
  }) {
    const resolvedHomeTeam = home_team ?? team_home;
    const resolvedAwayTeam = away_team ?? team_away;
    const result = await query(
      `INSERT INTO matches (home_team, away_team, start_time, status)
       VALUES ($1, $2, $3, 'scheduled')
       RETURNING *`,
      [resolvedHomeTeam, resolvedAwayTeam, start_time || new Date()],
    );
    return result.rows[0];
  }

  /**
   * Update match score
   * @param {number} id - Match ID
   * @param {Object} scoreData - Score data
   * @returns {Promise<Object>} - Updated match object
   */
  static async updateScore(id, {
    home_score,
    away_score,
    score_home,
    score_away,
  }) {
    const resolvedHomeScore = home_score ?? score_home;
    const resolvedAwayScore = away_score ?? score_away;
    const result = await query(
      `UPDATE matches 
       SET home_score = $1, away_score = $2
       WHERE id = $3
       RETURNING *`,
      [resolvedHomeScore, resolvedAwayScore, id],
    );
    return result.rows[0];
  }

  /**
   * Update match status (scheduled, live, finished)
   * @param {number} id - Match ID
   * @param {string} status - New status
   * @returns {Promise<Object>} - Updated match object
   */
  static async updateStatus(id, status) {
    const result = await query(
      `UPDATE matches 
       SET status = $1
       WHERE id = $2
       RETURNING *`,
      [status, id],
    );
    return result.rows[0];
  }

  /**
   * Delete a match
   * @param {number} id - Match ID
   * @returns {Promise<boolean>} - Success status
   */
  static async delete(id) {
    await query(`DELETE FROM matches WHERE id = $1`, [id]);
    return true;
  }

  /**
   * Get all commentary for a specific match
   * @param {number} matchId - Match ID
   * @param {number} limit - Maximum number of comments to retrieve
   * @returns {Promise<Array>} - Array of commentary objects
   */
  static async getCommentary(matchId, limit = 50) {
    const result = await query(
      `SELECT * FROM commentary 
       WHERE match_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2`,
      [matchId, limit],
    );
    // Return in chronological order (oldest first)
    return result.rows.reverse();
  }

  /**
   * Add commentary to a match
   * @param {Object} commentaryData - Commentary data
   * @returns {Promise<Object>} - Created commentary object
   */
  static async addCommentary({ match_id, message, event_type, minute }) {
    const result = await query(
      `INSERT INTO commentary (match_id, message, event_type, minute)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [match_id, message, event_type || "general", minute],
    );
    return result.rows[0];
  }

  /**
   * Get recent commentary across all matches
   * @param {number} limit - Maximum number of comments to retrieve
   * @returns {Promise<Array>} - Array of commentary objects with match info
   */
  static async getRecentCommentary(limit = 20) {
    const result = await query(
      `SELECT c.*, m.home_team, m.away_team 
       FROM commentary c
       JOIN matches m ON c.match_id = m.id
       ORDER BY c.created_at DESC
       LIMIT $1`,
      [limit],
    );
    return result.rows;
  }

  /**
   * Delete old commentary (cleanup function)
   * @param {number} days - Delete commentary older than X days
   * @returns {Promise<number>} - Number of rows deleted
   */
  static async deleteOldCommentary(days = 7) {
    const result = await query(
      `DELETE FROM commentary 
       WHERE created_at < NOW() - INTERVAL '${days} days'
       RETURNING id`,
    );
    return result.rowCount;
  }
}

export default Match;



 /**
  * yha basically humlogo ne sql queries ke lie function banae hai taki use bahar use kr sake
  * 
  * example
  * 
  * router.get("/matches", matchController.getAllMatches);
  * 
  * controller ke and function hai getallmathes--
  * 
  * exports.getAllMatches = async (req, res) => {
  try {
    const matches = await Match.getAll(); // calling model
    res.json(matches);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch matches" });
  }
    *
  match ek model hai jiske andar getall function hai
------------ static async getAll() {
  const result = await query(
    `SELECT * FROM matches ORDER BY created_at DESC`
  );
  return result.rows;
}

****
   */
