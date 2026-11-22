const express = require('express');
const router = express.Router();
const { analyzeSecurity } = require('../engine/securityAnalyzer');
const { parseRawHeaders, parseSetCookieString } = require('../engine/headerParser');

/**
 * POST /api/security/scan
 * Deep cybersecurity scanner for headers and cookies
 */
router.post('/scan', (req, res) => {
  try {
    const { rawHeaders = '', cookies = [] } = req.body;

    let parsedHeaders = [];
    let extractedCookies = [...cookies];

    if (rawHeaders) {
      const inspection = parseRawHeaders(rawHeaders);
      parsedHeaders = inspection.headers;

      inspection.headers.forEach((h) => {
        if (h.isCookieHeader && h.name.toLowerCase() === 'set-cookie') {
          const c = parseSetCookieString(h.value);
          if (c) extractedCookies.push(c);
        }
      });
    }

    const report = analyzeSecurity(parsedHeaders, extractedCookies);

    return res.status(200).json({
      success: true,
      data: report
    });
  } catch (err) {
    console.error('Error in /api/security/scan:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
