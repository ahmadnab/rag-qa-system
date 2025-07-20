#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Generating Simple Allure Report...\n');

// Clean previous results
if (fs.existsSync('allure-results')) {
  console.log('🧹 Cleaning previous results...');
  execSync('rm -rf allure-results', { stdio: 'inherit' });
}

if (fs.existsSync('allure-report')) {
  console.log('🧹 Cleaning previous reports...');
  execSync('rm -rf allure-report', { stdio: 'inherit' });
}

// Generate fresh results
console.log('📊 Running tests and generating results...');
try {
  execSync('npx playwright test', { stdio: 'inherit' });
} catch (error) {
  console.log('⚠️  Some tests may have failed, but continuing with report generation...');
}

// Generate report
console.log('📋 Generating Allure report...');
try {
  execSync('npx allure generate allure-results --output allure-report --clean', { stdio: 'inherit' });
  console.log('\n✅ Report generated successfully!');
  console.log('📂 Report location: allure-report/index.html');
  console.log('🌐 To view: npx allure open allure-report');
} catch (error) {
  console.error('❌ Failed to generate report:', error.message);
  process.exit(1);
}