const express = require('express');
const router = express.Router();
const aiService = require('../services/aiService');
const { authMiddleware, optionalAuth, roleMiddleware } = require('../middleware/auth');
const pool = require('../config/database');

// GET /api/ai/recommendations/:userId
router.get('/recommendations/:userId', optionalAuth, async (req, res, next) => {
  try {
    const userId = req.params.userId;
    const recommendations = await aiService.getFoodRecommendations(userId);
    res.json({ success: true, data: recommendations });
  } catch (err) { next(err); }
});

// POST /api/ai/chat
router.post('/chat', async (req, res, next) => {
  try {
    const { message, table, order_type } = req.body;
    if (!message) return res.status(400).json({ success: false, message: 'message is required' });
    const response = await aiService.chat(message, { table, orderType: order_type });
    res.json({ success: true, data: response });
  } catch (err) { next(err); }
});

// POST /api/ai/sentiment
router.post('/sentiment', authMiddleware, async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ success: false, message: 'text is required' });
    const result = await aiService.analyzeSentiment(text);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// GET /api/ai/demand-prediction
router.get('/demand-prediction', authMiddleware, roleMiddleware('admin','manager'), async (req, res, next) => {
  try {
    const result = await aiService.predictDemand();
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// GET /api/ai/feedback-summary
router.get('/feedback-summary', authMiddleware, roleMiddleware('admin','manager'), async (req, res, next) => {
  try {
    const result = await aiService.summarizeFeedback();
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// POST /api/ai/feedback  (save feedback + analyze sentiment)
router.post('/feedback', optionalAuth, async (req, res, next) => {
  try {
    const {
      customer_name, order_id,
      food_rating, service_rating, ambience_rating, overall_rating, comment
    } = req.body;

    // Analyze sentiment if comment provided
    let sentiment = null;
    if (comment) {
      const analysis = await aiService.analyzeSentiment(comment);
      sentiment = analysis.sentiment;
    }

    const [result] = await pool.execute(
      `INSERT INTO feedback (user_id, order_id, customer_name, food_rating, service_rating, ambience_rating, overall_rating, comment, sentiment)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [
        req.user?.id || null, order_id || null, customer_name || null,
        food_rating || 5, service_rating || 5, ambience_rating || 5, overall_rating || 5,
        comment || null, sentiment
      ]
    );

    res.status(201).json({ success: true, message: 'Feedback submitted. Thank you!', id: result.insertId });
  } catch (err) { next(err); }
});

// GET /api/ai/feedback
router.get('/feedback', authMiddleware, roleMiddleware('admin','manager'), async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT f.*, u.name as user_name, o.order_id as order_ref
       FROM feedback f
       LEFT JOIN users u ON f.user_id = u.id
       LEFT JOIN orders o ON f.order_id = o.id
       WHERE f.is_published = 1
       ORDER BY f.created_at DESC LIMIT 100`
    );
    res.json({ success: true, count: rows.length, data: rows });
  } catch (err) { next(err); }
});

module.exports = router;
