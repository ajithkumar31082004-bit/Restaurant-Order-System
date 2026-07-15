const User = require('../models/User');
const pool = require('../config/database');

const userController = {
  // Get logged-in user profile
  async getProfile(req, res, next) {
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  },

  // Update profile
  async updateProfile(req, res, next) {
    try {
      const { name, phone } = req.body;
      const updatedUser = await User.updateProfile(req.user.id, { name, phone });
      if (!updatedUser) {
        return res.status(400).json({ success: false, message: 'No valid fields provided to update' });
      }
      res.json({ success: true, message: 'Profile updated successfully', user: updatedUser });
    } catch (error) {
      next(error);
    }
  },

  // Get favorites
  async getFavorites(req, res, next) {
    try {
      const [rows] = await pool.execute(`
        SELECT f.*, c.name as category_name
        FROM favorites fav
        JOIN foods f ON fav.food_id = f.id
        JOIN categories c ON f.category_id = c.id
        WHERE fav.user_id = ?
      `, [req.user.id]);
      res.json({ success: true, data: rows });
    } catch (error) {
      next(error);
    }
  },

  // Add to favorites
  async addFavorite(req, res, next) {
    try {
      const { foodId } = req.body;
      if (!foodId) {
        return res.status(400).json({ success: false, message: 'foodId is required' });
      }
      const [exists] = await pool.execute('SELECT * FROM favorites WHERE user_id = ? AND food_id = ?', [req.user.id, foodId]);
      if (exists.length > 0) {
        return res.json({ success: true, message: 'Food item is already favorited' });
      }
      await pool.execute('INSERT INTO favorites (user_id, food_id) VALUES (?, ?)', [req.user.id, foodId]);
      res.json({ success: true, message: 'Added to favorites' });
    } catch (error) {
      next(error);
    }
  },

  // Remove from favorites
  async removeFavorite(req, res, next) {
    try {
      const { foodId } = req.params;
      const [result] = await pool.execute('DELETE FROM favorites WHERE user_id = ? AND food_id = ?', [req.user.id, foodId]);
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: 'Favorite not found' });
      }
      res.json({ success: true, message: 'Removed from favorites' });
    } catch (error) {
      next(error);
    }
  },

  // Get saved addresses
  async getAddresses(req, res, next) {
    try {
      const [rows] = await pool.execute('SELECT * FROM addresses WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
      res.json({ success: true, data: rows });
    } catch (error) {
      next(error);
    }
  },

  // Add address
  async addAddress(req, res, next) {
    try {
      const { label, address_line, city, pincode } = req.body;
      if (!label || !address_line || !city || !pincode) {
        return res.status(400).json({ success: false, message: 'All fields are required' });
      }
      const [result] = await pool.execute(
        'INSERT INTO addresses (user_id, label, address_line, city, pincode) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, label, address_line, city, pincode]
      );
      res.status(201).json({ success: true, data: { id: result.insertId } });
    } catch (error) {
      next(error);
    }
  },

  // Delete address
  async deleteAddress(req, res, next) {
    try {
      const { id } = req.params;
      const [result] = await pool.execute('DELETE FROM addresses WHERE id = ? AND user_id = ?', [id, req.user.id]);
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: 'Address not found or unauthorized' });
      }
      res.json({ success: true, message: 'Address deleted successfully' });
    } catch (error) {
      next(error);
    }
  },

  // Wallet Add Balance Simulator
  async addWalletBalance(req, res, next) {
    try {
      const { amount, deductPoints } = req.body;
      if (!amount || amount <= 0) {
        return res.status(400).json({ success: false, message: 'Amount must be greater than zero' });
      }
      await pool.execute('UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?', [amount, req.user.id]);
      // Optionally deduct loyalty points for wallet cash redemption
      if (deductPoints && deductPoints > 0) {
        await pool.execute(
          'UPDATE users SET rewards_points = GREATEST(0, rewards_points - ?) WHERE id = ?',
          [deductPoints, req.user.id]
        );
      }
      const user = await User.findById(req.user.id);
      res.json({ success: true, message: 'Balance added successfully', user });
    } catch (error) {
      next(error);
    }
  },

  // Add loyalty reward points (called internally on order placement)
  async addRewardsPoints(req, res, next) {
    try {
      const { points } = req.body;
      if (!points || points <= 0) {
        return res.status(400).json({ success: false, message: 'Points must be greater than zero' });
      }
      await pool.execute(
        'UPDATE users SET rewards_points = rewards_points + ? WHERE id = ?',
        [points, req.user.id]
      );
      const user = await User.findById(req.user.id);
      res.json({ success: true, message: `${points} points added to your account`, user });
    } catch (error) {
      next(error);
    }
  },

  // Redeem loyalty points for a reward
  async redeemRewardsPoints(req, res, next) {
    try {
      const { cost, rewardName } = req.body;
      if (!cost || cost <= 0) {
        return res.status(400).json({ success: false, message: 'Cost must be greater than zero' });
      }
      // Check current points
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });
      if ((user.rewards_points || 0) < cost) {
        return res.status(400).json({
          success: false,
          message: `Insufficient points. You need ${cost - user.rewards_points} more points.`
        });
      }
      await pool.execute(
        'UPDATE users SET rewards_points = rewards_points - ? WHERE id = ?',
        [cost, req.user.id]
      );
      const updatedUser = await User.findById(req.user.id);
      res.json({
        success: true,
        message: `Successfully redeemed ${cost} points for ${rewardName || 'reward'}!`,
        user: updatedUser
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = userController;
