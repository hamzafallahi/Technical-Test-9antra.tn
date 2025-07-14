const express = require('express');
const router = express.Router();
const { User } = require('../db');

/**
 * @route GET /api/settings/preferences
 * @desc Get user preferences and settings
 * @access Private
 */
router.get('/preferences', async (req, res) => {
  try {
    // Use user ID from session or JWT token
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Get user preferences from database
    const user = await User.findByPk(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Return preferences from user settings
    // If user has preferences stored in the database
    const preferences = user.preferences || {};
    
    // If no preferences exist in DB but in session, use those
    if (req.session && req.session.preferences) {
      Object.assign(preferences, req.session.preferences);
    }
    
    res.json(preferences);
  } catch (error) {
    console.error('Error fetching preferences:', error);
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
});

/**
 * @route POST /api/settings/preferences
 * @desc Update user preferences and settings
 * @access Private
 */
router.post('/preferences', async (req, res) => {
  try {
    // Use user ID from session or JWT token
    const userId = req.user?.id;
    
    // For testing/development, allow preferences to be saved in session
    // even if not authenticated
    if (!userId) {
      if (!req.session) {
        req.session = {};
      }
      if (!req.session.preferences) {
        req.session.preferences = {};
      }
      
      // Save preferences to session
      Object.assign(req.session.preferences, req.body);
      return res.json({ success: true, preferences: req.session.preferences });
    }
    
    // Get user from database
    const user = await User.findByPk(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Update user preferences
    const currentPreferences = user.preferences || {};
    const updatedPreferences = { ...currentPreferences, ...req.body };
    
    // Save to database
    await user.update({ preferences: updatedPreferences });
    
    res.json({ success: true, preferences: updatedPreferences });
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

module.exports = router; 