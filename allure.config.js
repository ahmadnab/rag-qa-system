module.exports = {
  reportDir: 'allure-report',
  resultsDir: 'allure-results',
  
  // Clean organization structure
  categories: [
    {
      name: 'Critical Test Failures',
      description: 'Tests that failed due to application issues',
      matchedStatuses: ['failed'],
      messageRegex: '.*timeout.*|.*network.*|.*connection.*|.*500.*|.*404.*'
    },
    {
      name: 'Test Assertion Failures', 
      description: 'Tests that failed due to assertion mismatches',
      matchedStatuses: ['failed'],
      messageRegex: '.*expect.*|.*assertion.*|.*toBe.*|.*toContain.*'
    },
    {
      name: 'Broken Tests',
      description: 'Tests that are broken due to setup issues',
      matchedStatuses: ['broken']
    }
  ],

  // Environment information for context
  environment: {
    'Test Framework': 'Playwright',
    'Application': 'RAG Document Q&A System',
    'Environment': 'Docker Local Development',
    'Browser': 'Chromium',
    'Report Generated': new Date().toISOString()
  },

  // Simplified trend configuration
  trend: {
    categories: ['failed', 'broken', 'passed', 'skipped']
  }
};