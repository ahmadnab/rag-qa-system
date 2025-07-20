const fs = require('fs');
const path = require('path');

/**
 * Test Data Validator
 * 
 * Validates RAG responses against predefined test data expectations
 * Provides deterministic, rule-based validation for factual accuracy
 */
class TestDataValidator {
  constructor(testDataPath) {
    this.testDataPath = testDataPath;
    this.testData = null;
    this.loadTestData();
  }

  loadTestData() {
    try {
      const dataFile = fs.readFileSync(this.testDataPath, 'utf8');
      this.testData = JSON.parse(dataFile);
    } catch (error) {
      this.testData = { document_tests: {}, quality_benchmarks: {} };
    }
  }

  /**
   * Validate a response against test data expectations
   */
  validateResponse(testId, documentName, response, responseTime = null) {
    const docTests = this.testData.document_tests[documentName];
    if (!docTests) {
      return {
        valid: false,
        error: `No test data found for document: ${documentName}`
      };
    }

    // Find the test case
    const testCase = this.findTestCase(docTests, testId);
    if (!testCase) {
      return {
        valid: false,
        error: `Test case not found: ${testId}`
      };
    }

    const validation = {
      testId,
      documentName,
      category: testCase.category || 'unknown',
      valid: true,
      errors: [],
      warnings: [],
      metrics: {}
    };

    // Validate based on test case type
    if (testCase.expectedKeywords) {
      this.validateKeywords(response, testCase, validation);
    }

    if (testCase.prohibitedContent) {
      this.validateProhibitedContent(response, testCase, validation);
    }

    if (testCase.acceptableResponses) {
      this.validateAcceptableResponses(response, testCase, validation);
    }

    if (testCase.expectedBehavior) {
      this.validateExpectedBehavior(response, testCase, validation);
    }

    // Validate response time if provided
    if (responseTime !== null) {
      this.validateResponseTime(responseTime, validation);
    }

    // Validate response length
    this.validateResponseLength(response, validation);

    // Overall validation result
    validation.valid = validation.errors.length === 0;
    
    return validation;
  }

  findTestCase(docTests, testId) {
    // Search in factual questions
    let testCase = docTests.factual_questions?.find(test => test.id === testId);
    if (testCase) return testCase;

    // Search in hallucination tests  
    testCase = docTests.hallucination_tests?.find(test => test.id === testId);
    if (testCase) return testCase;

    // Search in edge cases
    testCase = docTests.edge_cases?.find(test => test.id === testId);
    if (testCase) return testCase;

    return null;
  }

  validateKeywords(response, testCase, validation) {
    const responseText = response.toLowerCase();
    const keywords = testCase.expectedKeywords.map(k => k.toLowerCase());
    
    const foundKeywords = keywords.filter(keyword => 
      responseText.includes(keyword)
    );

    validation.metrics.keywordsFound = foundKeywords.length;
    validation.metrics.keywordsExpected = keywords.length;

    if (testCase.mustContainAny === true) {
      // Must contain at least one keyword
      if (foundKeywords.length === 0) {
        validation.errors.push(`No expected keywords found. Expected any of: ${keywords.join(', ')}`);
      }
    } else if (testCase.mustContainAny === false) {
      // Should contain some keywords for better quality
      if (foundKeywords.length === 0) {
        validation.warnings.push(`No expected keywords found. Consider including: ${keywords.join(', ')}`);
      }
    }

    validation.metrics.keywordMatchRate = foundKeywords.length / keywords.length;
  }

  validateProhibitedContent(response, testCase, validation) {
    const responseText = response.toLowerCase();
    const prohibited = testCase.prohibitedContent.map(p => p.toLowerCase());
    
    const foundProhibited = prohibited.filter(content => 
      responseText.includes(content)
    );

    validation.metrics.prohibitedContentFound = foundProhibited.length;

    if (foundProhibited.length > 0) {
      validation.errors.push(`Prohibited content found: ${foundProhibited.join(', ')}`);
    }
  }

  validateAcceptableResponses(response, testCase, validation) {
    const responseText = response.toLowerCase();
    const acceptable = testCase.acceptableResponses.map(r => r.toLowerCase());
    
    const isAcceptable = acceptable.some(acceptableResponse => 
      responseText.includes(acceptableResponse)
    );

    if (!isAcceptable) {
      validation.warnings.push(`Response doesn't match acceptable patterns: ${testCase.acceptableResponses.join(', ')}`);
    }
  }

  validateExpectedBehavior(response, testCase, validation) {
    const responseText = response.toLowerCase();
    
    switch (testCase.expectedBehavior) {
      case 'should_reject':
        const rejectionIndicators = [
          'not applicable',
          'cannot answer',
          'not found',
          'not mentioned',
          'don\'t know',
          'no information',
          'sorry'
        ];
        
        const hasRejection = rejectionIndicators.some(indicator => 
          responseText.includes(indicator)
        );
        
        if (!hasRejection) {
          validation.errors.push('Expected rejection response but got substantive answer');
        }
        break;

      case 'should_error':
        // This should be validated at the API level, not response content
        validation.warnings.push('should_error behavior should be validated at HTTP status level');
        break;

      case 'graceful_handling':
        // Should not be empty and should not contain error messages
        if (response.trim().length === 0) {
          validation.errors.push('Empty response for edge case');
        }
        break;
    }
  }

  validateResponseTime(responseTime, validation) {
    const benchmarks = this.testData.quality_benchmarks?.response_time_ms || {};
    
    validation.metrics.responseTime = responseTime;
    
    if (responseTime <= (benchmarks.excellent || 1000)) {
      validation.metrics.responseTimeRating = 'excellent';
    } else if (responseTime <= (benchmarks.good || 3000)) {
      validation.metrics.responseTimeRating = 'good';
    } else if (responseTime <= (benchmarks.acceptable || 10000)) {
      validation.metrics.responseTimeRating = 'acceptable';
    } else {
      validation.metrics.responseTimeRating = 'poor';
      validation.warnings.push(`Slow response time: ${responseTime}ms`);
    }
  }

  validateResponseLength(response, validation) {
    const benchmarks = this.testData.quality_benchmarks?.response_length || {};
    const length = response.length;
    
    validation.metrics.responseLength = length;
    
    if (length < (benchmarks.minimum || 10)) {
      validation.errors.push(`Response too short: ${length} characters`);
    } else if (length > (benchmarks.maximum || 2000)) {
      validation.warnings.push(`Response very long: ${length} characters`);
    } else if (length >= (benchmarks.optimal_min || 50) && length <= (benchmarks.optimal_max || 500)) {
      validation.metrics.lengthRating = 'optimal';
    } else {
      validation.metrics.lengthRating = 'acceptable';
    }
  }

  /**
   * Get all test cases for a document
   */
  getTestCases(documentName) {
    const docTests = this.testData.document_tests[documentName];
    if (!docTests) return [];

    const allTests = [];

    // Add factual questions
    if (docTests.factual_questions) {
      allTests.push(...docTests.factual_questions.map(test => ({
        ...test,
        type: 'factual'
      })));
    }

    // Add hallucination tests
    if (docTests.hallucination_tests) {
      allTests.push(...docTests.hallucination_tests.map(test => ({
        ...test,
        type: 'hallucination'
      })));
    }

    // Add edge cases
    if (docTests.edge_cases) {
      allTests.push(...docTests.edge_cases.map(test => ({
        ...test,
        type: 'edge_case'
      })));
    }

    return allTests;
  }

  /**
   * Get quality benchmarks
   */
  getQualityBenchmarks() {
    return this.testData.quality_benchmarks || {};
  }

  /**
   * Generate validation summary
   */
  generateSummary(validations) {
    const summary = {
      totalTests: validations.length,
      passed: validations.filter(v => v.valid).length,
      failed: validations.filter(v => !v.valid).length,
      warnings: validations.reduce((sum, v) => sum + v.warnings.length, 0),
      categories: {},
      avgResponseTime: 0,
      avgResponseLength: 0
    };

    // Calculate averages
    const responseTimes = validations.map(v => v.metrics.responseTime).filter(t => t !== undefined);
    const responseLengths = validations.map(v => v.metrics.responseLength).filter(l => l !== undefined);
    
    if (responseTimes.length > 0) {
      summary.avgResponseTime = Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length);
    }
    
    if (responseLengths.length > 0) {
      summary.avgResponseLength = Math.round(responseLengths.reduce((a, b) => a + b, 0) / responseLengths.length);
    }

    // Group by category
    validations.forEach(validation => {
      const category = validation.category || 'unknown';
      if (!summary.categories[category]) {
        summary.categories[category] = { total: 0, passed: 0 };
      }
      summary.categories[category].total++;
      if (validation.valid) {
        summary.categories[category].passed++;
      }
    });

    summary.successRate = summary.totalTests > 0 ? (summary.passed / summary.totalTests) : 0;

    return summary;
  }
}

module.exports = { TestDataValidator };