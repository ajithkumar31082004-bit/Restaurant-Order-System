const { GoogleGenerativeAI } = require('@google/generative-ai');
const pool = require('../config/database');

let genAI = null;

function getGenAI() {
  if (!genAI && process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI;
}

const aiService = {

  // Food Recommendations for a user based on their order history
  async getFoodRecommendations(userId) {
    try {
      // Fetch user's past orders
      const [pastOrders] = await pool.execute(
        `SELECT oi.food_name, SUM(oi.quantity) as times_ordered
         FROM order_items oi JOIN orders o ON oi.order_id = o.id
         WHERE o.user_id = ? GROUP BY oi.food_name ORDER BY times_ordered DESC LIMIT 10`,
        [userId]
      );

      // Fetch all menu items
      const [allFoods] = await pool.execute(
        `SELECT f.name, f.description, f.price, f.is_veg, f.calories, c.name as category
         FROM foods f JOIN categories c ON f.category_id = c.id
         WHERE f.is_available = 1 ORDER BY f.rating DESC LIMIT 30`
      );

      const client = getGenAI();
      if (!client) {
        // Fallback: return top-rated foods if no API key
        return allFoods.slice(0, 5).map(f => ({
          name: f.name, reason: 'Highly rated item', confidence: 0.8
        }));
      }

      const model = client.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const prompt = `You are a restaurant recommendation engine. 
Based on a customer's order history and the available menu, suggest 5 food items they would enjoy.

Customer's previous orders: ${JSON.stringify(pastOrders)}

Available menu items: ${JSON.stringify(allFoods)}

Return ONLY a valid JSON array with exactly 5 items, each with:
{ "name": "food name", "reason": "short reason (1 sentence)", "confidence": 0.0-1.0 }

Do not include any other text, only the JSON array.`;

      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return JSON.parse(text);
    } catch (err) {
      console.error('AI recommendations error:', err.message);
      return [];
    }
  },

  // AI Chatbot for customer queries
  async chat(message, context = {}) {
    try {
      const client = getGenAI();
      if (!client) {
        return { reply: "I'm sorry, the AI assistant is currently unavailable. Please browse our menu or contact staff for help." };
      }

      // Load menu context
      const [foods] = await pool.execute(
        `SELECT f.name, f.price, f.is_veg, f.calories, f.description, c.name as category
         FROM foods f JOIN categories c ON f.category_id = c.id WHERE f.is_available = 1`
      );

      const model = client.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const systemContext = `You are FoodHub's friendly restaurant assistant. Help customers with:
- Menu questions (items, prices, ingredients, allergens, vegetarian options)
- Reservations (how to book, availability)
- Orders (how to order, delivery time, tracking)
- Restaurant info (hours, location, payment methods)

Available menu: ${JSON.stringify(foods.slice(0, 50))}
${context.table ? `Customer is at Table: ${context.table}` : ''}
${context.orderType ? `Order type: ${context.orderType}` : ''}

Be helpful, friendly, and concise. If asked about prices, provide exact prices from the menu.
Do not make up information not in the menu. Keep responses under 100 words.`;

      const result = await model.generateContent(`${systemContext}\n\nCustomer: ${message}`);
      return { reply: result.response.text() };
    } catch (err) {
      console.error('AI chat error:', err.message);
      return { reply: "I'm having trouble connecting right now. Please try again or ask our staff for help!" };
    }
  },

  // Sentiment analysis for customer feedback
  async analyzeSentiment(reviewText) {
    try {
      const client = getGenAI();
      if (!client) return { sentiment: 'neutral', themes: [], score: 0.5 };

      const model = client.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const prompt = `Analyze this restaurant review for sentiment.
Review: "${reviewText}"

Return ONLY valid JSON: { "sentiment": "positive|neutral|negative", "score": 0.0-1.0, "themes": ["food quality", "service", etc], "summary": "one sentence summary" }`;

      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : { sentiment: 'neutral', themes: [], score: 0.5 };
    } catch (err) {
      console.error('AI sentiment error:', err.message);
      return { sentiment: 'neutral', themes: [], score: 0.5 };
    }
  },

  // Demand prediction for busy hours
  async predictDemand() {
    try {
      const [hourlyData] = await pool.execute(`
        SELECT HOUR(created_at) as hour, DAYOFWEEK(created_at) as day_of_week,
               COUNT(*) as orders, SUM(total_amount) as revenue
        FROM orders WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
          AND order_status != 'Cancelled'
        GROUP BY HOUR(created_at), DAYOFWEEK(created_at)
        ORDER BY day_of_week, hour
      `);

      const client = getGenAI();
      if (!client) {
        // Fallback: identify peak hours from data
        const peaks = hourlyData.sort((a,b) => b.orders - a.orders).slice(0, 3);
        return { peak_hours: peaks.map(p => p.hour), insights: 'Based on historical order data', recommendations: [] };
      }

      const model = client.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const prompt = `Analyze this restaurant order data and predict demand patterns.
Historical data (last 30 days): ${JSON.stringify(hourlyData)}

Return ONLY valid JSON with:
{ "peak_hours": [list of top 3 peak hours 0-23], "slow_hours": [list of slow hours], "busy_days": ["Mon","Tue",...], 
  "insights": "2-3 sentence analysis", "staffing_recommendation": "brief recommendation",
  "discount_suggestion": "suggest off-peak discount strategy" }`;

      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : { peak_hours: [], insights: 'Analysis unavailable', recommendations: [] };
    } catch (err) {
      console.error('AI demand prediction error:', err.message);
      return { peak_hours: [], insights: 'Analysis unavailable', recommendations: [] };
    }
  },

  // Summarize all feedback for admin
  async summarizeFeedback() {
    try {
      const [reviews] = await pool.execute(
        `SELECT comment, food_rating, service_rating, ambience_rating, overall_rating
         FROM feedback WHERE is_published = 1 ORDER BY created_at DESC LIMIT 50`
      );
      if (!reviews.length) return { summary: 'No reviews yet', highlights: [], concerns: [] };

      const client = getGenAI();
      if (!client) return { summary: 'AI unavailable', highlights: [], concerns: [] };

      const model = client.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const prompt = `Analyze these restaurant reviews and provide an executive summary.
Reviews: ${JSON.stringify(reviews)}

Return ONLY valid JSON:
{ "summary": "3-4 sentence overall summary", "top_highlights": ["point 1", "point 2", "point 3"],
  "top_concerns": ["concern 1", "concern 2"], "avg_ratings": { "food": 0.0, "service": 0.0, "ambience": 0.0 },
  "recommendation": "1 actionable improvement" }`;

      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : { summary: 'Analysis failed', highlights: [], concerns: [] };
    } catch (err) {
      console.error('AI feedback summary error:', err.message);
      return { summary: 'Analysis unavailable', highlights: [], concerns: [] };
    }
  }
};

module.exports = aiService;
