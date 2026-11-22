/**
 * Unified Data Repository Layer
 * Interacts with MongoDB Atlas via Mongoose models when connected (readyState === 1),
 * with an in-memory replica store fallback to guarantee 100% testability and zero crashes.
 */

const mongoose = require('mongoose');
const HeaderInspection = require('./HeaderInspection');
const CookieRecord = require('./CookieRecord');
const DfaTransitionLog = require('./DfaTransitionLog');

// In-Memory Backup Collections
const memoryStore = {
  headerInspections: [],
  cookieRecords: [],
  transitionLogs: []
};

function generateId() {
  return new mongoose.Types.ObjectId().toString();
}

const DataStore = {
  /**
   * Header Inspection CRUD
   */
  async saveHeaderInspection(data) {
    if (mongoose.connection.readyState === 1) {
      const doc = new HeaderInspection(data);
      return await doc.save();
    }
    const record = {
      _id: generateId(),
      ...data,
      createdAt: data.createdAt || new Date()
    };
    memoryStore.headerInspections.unshift(record);
    return record;
  },

  async getHeaderInspections(limit = 50, skip = 0) {
    if (mongoose.connection.readyState === 1) {
      return await HeaderInspection.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
    }
    return memoryStore.headerInspections.slice(skip, skip + limit);
  },

  async getHeaderInspectionById(id) {
    if (mongoose.connection.readyState === 1) {
      return await HeaderInspection.findById(id);
    }
    return memoryStore.headerInspections.find((h) => h._id.toString() === id.toString()) || null;
  },

  async deleteHeaderInspection(id) {
    if (mongoose.connection.readyState === 1) {
      return await HeaderInspection.findByIdAndDelete(id);
    }
    const index = memoryStore.headerInspections.findIndex((h) => h._id.toString() === id.toString());
    if (index !== -1) {
      return memoryStore.headerInspections.splice(index, 1)[0];
    }
    return null;
  },

  async countHeaderInspections() {
    if (mongoose.connection.readyState === 1) {
      return await HeaderInspection.countDocuments();
    }
    return memoryStore.headerInspections.length;
  },

  /**
   * Cookie Record CRUD
   */
  async createCookie(data) {
    if (mongoose.connection.readyState === 1) {
      const doc = new CookieRecord(data);
      return await doc.save();
    }
    const record = {
      _id: generateId(),
      ...data,
      history: data.history || [],
      validationIssues: data.validationIssues || [],
      securityWarnings: data.securityWarnings || [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    memoryStore.cookieRecords.unshift(record);
    return record;
  },

  async getCookies(filter = {}) {
    if (mongoose.connection.readyState === 1) {
      return await CookieRecord.find(filter).sort({ updatedAt: -1 });
    }
    return memoryStore.cookieRecords.filter((c) => {
      if (filter.currentState && c.currentState !== filter.currentState) return false;
      return true;
    });
  },

  async getCookieById(id) {
    if (mongoose.connection.readyState === 1) {
      return await CookieRecord.findById(id);
    }
    return memoryStore.cookieRecords.find((c) => c._id.toString() === id.toString()) || null;
  },

  async updateCookie(id, updateData) {
    if (mongoose.connection.readyState === 1) {
      return await CookieRecord.findByIdAndUpdate(
        id,
        { ...updateData, updatedAt: new Date() },
        { new: true }
      );
    }
    const cookie = memoryStore.cookieRecords.find((c) => c._id.toString() === id.toString());
    if (cookie) {
      Object.assign(cookie, updateData, { updatedAt: new Date() });
      return cookie;
    }
    return null;
  },

  async deleteCookie(id) {
    if (mongoose.connection.readyState === 1) {
      return await CookieRecord.findByIdAndDelete(id);
    }
    const index = memoryStore.cookieRecords.findIndex((c) => c._id.toString() === id.toString());
    if (index !== -1) {
      return memoryStore.cookieRecords.splice(index, 1)[0];
    }
    return null;
  },

  async countCookies() {
    if (mongoose.connection.readyState === 1) {
      const total = await CookieRecord.countDocuments();
      const active = await CookieRecord.countDocuments({ currentState: 'ACTIVE' });
      const issued = await CookieRecord.countDocuments({ currentState: 'ISSUED' });
      const expired = await CookieRecord.countDocuments({ currentState: 'EXPIRED' });
      const revoked = await CookieRecord.countDocuments({ currentState: 'REVOKED' });
      return { total, active, issued, expired, revoked };
    }
    const total = memoryStore.cookieRecords.length;
    let active = 0, issued = 0, expired = 0, revoked = 0;
    memoryStore.cookieRecords.forEach((c) => {
      if (c.currentState === 'ACTIVE') active++;
      else if (c.currentState === 'ISSUED') issued++;
      else if (c.currentState === 'EXPIRED') expired++;
      else if (c.currentState === 'REVOKED') revoked++;
    });
    return { total, active, issued, expired, revoked };
  },

  /**
   * DFA Transition Log CRUD
   */
  async logTransition(data) {
    if (mongoose.connection.readyState === 1) {
      const doc = new DfaTransitionLog(data);
      return await doc.save();
    }
    const log = {
      _id: generateId(),
      ...data,
      timestamp: new Date()
    };
    memoryStore.transitionLogs.unshift(log);
    return log;
  },

  async getTransitionLogs(cookieId = null, limit = 100) {
    if (mongoose.connection.readyState === 1) {
      const query = cookieId ? { cookieId } : {};
      return await DfaTransitionLog.find(query).sort({ timestamp: -1 }).limit(limit);
    }
    let logs = memoryStore.transitionLogs;
    if (cookieId) {
      logs = logs.filter((l) => l.cookieId === cookieId);
    }
    return logs.slice(0, limit);
  },

  /**
   * Diagnostics & Statistics Aggregator
   */
  async getDashboardStats() {
    let headerCount = 0;
    let validHeadersSum = 0;
    let invalidHeadersSum = 0;
    let totalInspections = 0;
    let securityWarningsCount = 0;
    const severityCounts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFORMATIONAL: 0 };

    if (mongoose.connection.readyState === 1) {
      totalInspections = await HeaderInspection.countDocuments();
      const inspections = await HeaderInspection.find().limit(100);
      inspections.forEach((insp) => {
        headerCount += (insp.totalCount || 0);
        validHeadersSum += (insp.validCount || 0);
        invalidHeadersSum += (insp.invalidCount || 0);
        if (insp.securityReport && insp.securityReport.counts) {
          Object.keys(severityCounts).forEach((sev) => {
            severityCounts[sev] += (insp.securityReport.counts[sev] || 0);
          });
          securityWarningsCount += (insp.securityReport.totalFindings || 0);
        }
      });
    } else {
      totalInspections = memoryStore.headerInspections.length;
      memoryStore.headerInspections.forEach((insp) => {
        headerCount += (insp.totalCount || 0);
        validHeadersSum += (insp.validCount || 0);
        invalidHeadersSum += (insp.invalidCount || 0);
        if (insp.securityReport && insp.securityReport.counts) {
          Object.keys(severityCounts).forEach((sev) => {
            severityCounts[sev] += (insp.securityReport.counts[sev] || 0);
          });
          securityWarningsCount += (insp.securityReport.totalFindings || 0);
        }
      });
    }

    const cookieStats = await this.countCookies();
    const totalAssessed = validHeadersSum + invalidHeadersSum;
    const successRate = totalAssessed > 0 ? Math.round((validHeadersSum / totalAssessed) * 100) : 100;

    return {
      totalInspections,
      totalHeaders: headerCount,
      validHeadersCount: validHeadersSum,
      invalidHeadersCount: invalidHeadersSum,
      validationSuccessPercentage: successRate,
      cookies: cookieStats,
      securityWarnings: {
        total: securityWarningsCount,
        breakdown: severityCounts
      }
    };
  }
};

module.exports = DataStore;
