const express = require('express');
const router = express.Router();
const { parseRawHeaders, parseSetCookieString } = require('../engine/headerParser');
const { analyzeSecurity } = require('../engine/securityAnalyzer');
const DataStore = require('../models/dataStore');

/**
 * POST /api/headers/validate
 * Inspects and validates raw HTTP headers with Regex and Security Analysis.
 * Stores result in MongoDB.
 */
router.post('/validate', async (req, res) => {
  try {
    const { rawHeaders, source = 'raw_paste' } = req.body;

    if (!rawHeaders || typeof rawHeaders !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'rawHeaders string field is required in request body.'
      });
    }

    // 1. Module 1 & 2: Parse and Regex Validate Headers
    const inspection = parseRawHeaders(rawHeaders);

    // 2. Extract any cookies from headers for deeper analysis
    const extractedCookies = [];
    inspection.headers.forEach((h) => {
      if (h.isCookieHeader && h.name.toLowerCase() === 'set-cookie') {
        const parsedCookie = parseSetCookieString(h.value);
        if (parsedCookie) {
          extractedCookies.push(parsedCookie);
        }
      }
    });

    // 3. Module 4: Security Analysis
    const securityReport = analyzeSecurity(inspection.headers, extractedCookies);

    // 4. Module 6: Persist in MongoDB
    const recordData = {
      rawText: rawHeaders,
      source,
      totalCount: inspection.totalCount,
      validCount: inspection.validCount,
      invalidCount: inspection.invalidCount,
      headers: inspection.headers,
      validHeaders: inspection.validHeaders,
      invalidHeaders: inspection.invalidHeaders,
      securityReport
    };

    const savedRecord = await DataStore.saveHeaderInspection(recordData);

    return res.status(200).json({
      success: true,
      message: 'Header inspection completed successfully.',
      data: {
        id: savedRecord._id,
        totalCount: inspection.totalCount,
        validCount: inspection.validCount,
        invalidCount: inspection.invalidCount,
        validHeaders: inspection.validHeaders,
        invalidHeaders: inspection.invalidHeaders,
        headers: inspection.headers,
        extractedCookies,
        securityReport,
        createdAt: savedRecord.createdAt
      }
    });
  } catch (err) {
    console.error('Error in /api/headers/validate:', err);
    return res.status(500).json({
      success: false,
      error: 'Internal server error processing header validation.',
      details: err.message
    });
  }
});

/**
 * GET /api/headers/history
 * Retrieves header validation history records.
 */
router.get('/history', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const skip = parseInt(req.query.skip, 10) || 0;

    const records = await DataStore.getHeaderInspections(limit, skip);
    const total = await DataStore.countHeaderInspections();

    return res.status(200).json({
      success: true,
      data: records,
      pagination: {
        total,
        limit,
        skip,
        hasMore: skip + records.length < total
      }
    });
  } catch (err) {
    console.error('Error in GET /api/headers/history:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/headers/history/:id
 * Retrieves a single inspection record by ID.
 */
router.get('/history/:id', async (req, res) => {
  try {
    const record = await DataStore.getHeaderInspectionById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, error: 'Inspection record not found.' });
    }
    return res.status(200).json({ success: true, data: record });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/headers/history/:id
 * Deletes an inspection record.
 */
router.delete('/history/:id', async (req, res) => {
  try {
    const deleted = await DataStore.deleteHeaderInspection(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Record not found to delete.' });
    }
    return res.status(200).json({ success: true, message: 'Record deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
