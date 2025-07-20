const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  maxFailures: 0, // Continue running all tests even if some fail
  reporter: [
    ['allure-playwright', {
      detail: true,
      outputFolder: 'allure-results',
      suiteTitle: false,
      categories: [
        {
          name: '🚨 Critical Failures',
          matchedStatuses: ['failed'],
          messageRegex: '.*timeout.*|.*network.*|.*connection.*|.*500.*'
        },
        {
          name: '❌ Test Failures', 
          matchedStatuses: ['failed'],
          messageRegex: '.*expect.*|.*assertion.*|.*toBe.*'
        },
        {
          name: '⚠️ Broken Tests',
          matchedStatuses: ['broken']
        }
      ],
      environmentInfo: {
        'Application': 'RAG Document Q&A System',
        'Environment': 'Docker Local',
        'Browser': 'Chromium',
        'Base URL': process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:8000',
        'Test Framework': 'Playwright'
      }
    }],
    ['list']
  ],
  timeout: 30 * 60 * 1000, // 30 minutes
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:8000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'rag-validation',
      testMatch: '**/rag-validation.test.js',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'other-tests',
      testMatch: ['**/chat-functionality.test.js', '**/document-processing.test.js', '**/error-handling.test.js', '**/file-upload.test.js', '**/ui-structure.test.js', '**/websocket-communication.test.js'],
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // webServer configuration removed - using external docker-compose setup
});