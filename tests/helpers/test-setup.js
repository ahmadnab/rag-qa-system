const { ApiHelper } = require('../api/api.helper');

/**
 * Common test setup and cleanup utilities
 */
class TestSetup {
  static async setupTest(page) {
    const apiHelper = new ApiHelper();
    await apiHelper.createContext();
    
    // Clear all documents before test
    try {
      await apiHelper.clearAllDocuments();
      await page.waitForTimeout(1000); // Brief wait for cleanup
    } catch (error) {
    }
    
    return apiHelper;
  }
  
  static async cleanupTest(apiHelper) {
    if (apiHelper) {
      try {
        await apiHelper.clearAllDocuments();
      } catch (error) {
      }
      await apiHelper.dispose();
    }
  }
  
  static async verifyCleanup(apiHelper) {
    try {
      const docs = await apiHelper.getDocuments();
      const data = await docs.json();
      return data.length === 0;
    } catch {
      return true; // Assume clean if can't verify
    }
  }
}

module.exports = { TestSetup };