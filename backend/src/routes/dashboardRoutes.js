const express = require('express');
const router = express.Router();
const DataStore = require('../models/dataStore');

/**
 * GET /api/dashboard/stats
 * Aggregates statistics for the dashboard
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await DataStore.getDashboardStats();
    return res.status(200).json({
      success: true,
      data: stats
    });
  } catch (err) {
    console.error('Error fetching dashboard stats:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/dashboard/recent-activity
 * Returns recent inspections, created cookies, and transition logs
 */
router.get('/recent-activity', async (req, res) => {
  try {
    const [inspections, cookies, transitions] = await Promise.all([
      DataStore.getHeaderInspections(5, 0),
      DataStore.getCookies(),
      DataStore.getTransitionLogs(null, 10)
    ]);

    return res.status(200).json({
      success: true,
      data: {
        recentInspections: inspections,
        recentCookies: cookies.slice(0, 5),
        recentTransitions: transitions
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
