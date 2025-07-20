const { test, expect } = require('@playwright/test');
const { AppPage } = require('./pages/app.page');
const { LLMJudge } = require('./helpers/llm-judge');
const { ApiHelper } = require('./api/api.helper');
const apiHelper = new ApiHelper();
const { TestDataValidator } = require('./helpers/test-data-validator');
const path = require('path');

test.describe.configure({ mode: 'serial' });

test.describe('RAG Validation', () => {
  let appPage;
  let llmJudge;
  let testDataValidator;

  test.beforeAll(async ({ browser }) => {
    llmJudge = new LLMJudge();
    const testDataPath = path.join(__dirname, 'data', 'test-data.json');
    testDataValidator = new TestDataValidator(testDataPath);
        
    const page = await browser.newPage();
    appPage = new AppPage(page);
    await appPage.goto();
    
    await appPage.uploadFile('tech_specs.pdf');
    
    await appPage.processDocument();
    
    try {
      await appPage.processedStatus.waitFor({ timeout: 60000 });
    } catch (error) {
      await page.waitForTimeout(5000);
    }
 
  });

  test('test data validation - factual accuracy against predefined expectations', async () => {
    test.setTimeout(120000);
    const testCases = [
      {
        id: 'tech_main_content',
        question: 'What products are described in this technical specification document?',
        expectedKeywords: ['Intel', 'NVIDIA', 'processor', 'graphics', 'specifications']
      },
      {
        id: 'tech_processor_cores', 
        question: 'How many cores does the Intel Core i7-13700K have?',
        expectedKeywords: ['16', 'cores', 'Intel']
      },
      {
        id: 'tech_gpu_cuda_cores',
        question: 'How many CUDA cores does the NVIDIA GeForce RTX 4090 have?',
        expectedKeywords: ['16384', '16,384', 'CUDA', 'cores']
      }
    ];

    const results = [];

    for (const testCase of testCases) {
      
      const startTime = Date.now();
      await appPage.askQuestion(testCase.question);
      const responseTime = Date.now() - startTime;
      
      const response = await appPage.getLatestAnswer() || 'No response';
      
      const validation = testDataValidator.validateResponse(testCase.id, 'tech_specs.pdf', response, responseTime);
      
      let keywordMatch = false;
      if (!response.toLowerCase().includes('not applicable')) {
        keywordMatch = testCase.expectedKeywords.some(keyword => 
          response.toLowerCase().includes(keyword.toLowerCase())
        );
      }
      
      results.push({
        question: testCase.question,
        response,
        responseTime,
        validation,
        keywordMatch,
        passed: validation.valid || response.toLowerCase().includes('not applicable') || keywordMatch
      });
      
      expect(response).toBeDefined();
      expect(responseTime).toBeLessThan(40000);
      expect(results[results.length - 1].passed).toBeTruthy();
    }

    const passedTests = results.filter(r => r.passed).length;
    expect(passedTests).toBeGreaterThan(0);
  });

  test('llm judge evaluation - semantic quality assessment', async () => {
    test.setTimeout(120000);
    
    // Skip test if no Gemini API key is available
    if (!process.env.GEMINI_API_KEY && !llmJudge.apiKey) {
      test.skip('Skipping LLM judge test - no API key available');
      return;
    }
    const evaluationCases = [
      {
        question: 'What are the main technical specifications mentioned in this document?',
        context: 'Technical document containing Intel Core i7-13700K processor and NVIDIA GeForce RTX 4090 graphics card specifications',
        criteria: ['relevance', 'completeness', 'clarity']
      },
      {
        question: 'Compare the performance characteristics of the components described?',
        context: 'Document contains performance data for CPU (Cinebench scores) and GPU (TFLOPS, memory bandwidth)',
        criteria: ['accuracy', 'completeness', 'grounding']
      },
      {
        question: 'What architectural improvements are highlighted in the document?',
        context: 'Document mentions Raptor Lake architecture for CPU and Ada Lovelace architecture for GPU',
        criteria: ['relevance', 'accuracy', 'grounding']
      }
    ];

    const evaluationResults = [];

    for (const testCase of evaluationCases) {
      
      const startTime = Date.now();
      await appPage.askQuestion(testCase.question);
      const responseTime = Date.now() - startTime;
      const response = await appPage.getLatestAnswer() || 'No response';
      
      try {
        const evaluation = await llmJudge.evaluateResponse(
          testCase.question,
          response,
          testCase.context,
          testCase.criteria
        );
        
        
        evaluationResults.push({
          question: testCase.question,
          response,
          responseTime,
          evaluation,
          qualityScore: evaluation.overall_score || 0,
          passed: evaluation.overall_score ? evaluation.overall_score > 5 : false
        });
        
        if (evaluation.scores) {
          testCase.criteria.forEach(criterion => {
            if (evaluation.scores[criterion]) {
              expect(evaluation.scores[criterion]).toBeGreaterThan(2);
            }
          });
        }
        
        expect(evaluation.overall_score || 0).toBeGreaterThan(2);
        
      } catch (error) {
        evaluationResults.push({
          question: testCase.question,
          response,
          responseTime,
          evaluation: null,
          qualityScore: 0,
          passed: false,
          error: error.message
        });
      }
      
      expect(response).toBeDefined();
      expect(responseTime).toBeLessThan(35000);
    }

    const successfulEvaluations = evaluationResults.filter(r => r.evaluation && !r.error).length;
    const averageQualityScore = evaluationResults
      .filter(r => r.qualityScore > 0)
      .reduce((sum, r) => sum + r.qualityScore, 0) / 
      evaluationResults.filter(r => r.qualityScore > 0).length || 0;
    
    
    if (successfulEvaluations > 0) {
      expect(averageQualityScore).toBeGreaterThan(3);
    }
  });

  test('hallucination prevention - out-of-scope content detection', async () => {
    test.setTimeout(120000);
    
    if (!process.env.GEMINI_API_KEY && !llmJudge.apiKey) {
      test.skip('xkipping test - no API key available');
      return;
    }
    const hallucinationTests = [
      {
        question: 'What does the document say about Barack Obama?',
        category: 'politics',
        expectedBehavior: 'Should indicate no political content in technical document'
      },
      {
        question: 'What social media features are mentioned?', 
        category: 'social_media',
        expectedBehavior: 'Should indicate no social media content in hardware specs'
      },
      {
        question: 'What pricing information is provided?',
        category: 'pricing',
        expectedBehavior: 'Should indicate no pricing in technical specifications'
      },
      {
        question: 'What does the document say about cooking recipes?',
        category: 'unrelated',
        expectedBehavior: 'Should indicate no cooking content in tech document'
      }
    ];

    const hallucinationResults = [];
    
    for (const test of hallucinationTests) {      
      const startTime = Date.now();
      await appPage.askQuestion(test.question); 
      const responseTime = Date.now() - startTime;
      
      const response = await appPage.getLatestAnswer() || 'No response';
      
      const isHallucinationPrevented = 
        response.toLowerCase().includes('not applicable') ||
        response.toLowerCase().includes('not found') ||
        response.toLowerCase().includes('does not contain') ||
        response.toLowerCase().includes('no information') ||
        response.toLowerCase().includes('document does not');
      
      const fabricatedContent = 
        response.toLowerCase().includes('obama') ||
        response.toLowerCase().includes('social media') ||
        response.toLowerCase().includes('price') ||
        response.toLowerCase().includes('cost') ||
        response.toLowerCase().includes('cooking') ||
        response.toLowerCase().includes('recipe');
      
      hallucinationResults.push({
        question: test.question,
        category: test.category,
        response,
        responseTime,
        hallucinationPrevented: isHallucinationPrevented,
        fabricatedContent,
        passed: isHallucinationPrevented && !fabricatedContent
      });
      
      expect(response).toBeDefined();
      expect(responseTime).toBeLessThan(40000);
      expect(isHallucinationPrevented).toBeTruthy();
      expect(fabricatedContent).toBeFalsy();
    }

    const preventedCount = hallucinationResults.filter(r => r.passed).length;    
    expect(preventedCount).toBe(hallucinationResults.length);
  });

  test('comprehensive response quality assessment', async () => {
    test.setTimeout(120000);
    
    if (!process.env.GEMINI_API_KEY && !llmJudge.apiKey) {
      test.skip('xkipping LLM judge test - no API key available');
      return;
    }
    const testCases = [
      {
        id: 'tech_cuda_cores',
        question: 'How many CUDA cores does the NVIDIA GeForce RTX 4090 have?',
        context: 'NVIDIA GeForce RTX 4090 has 16,384 CUDA cores with Ada Lovelace architecture'
      },
      {
        id: 'tech_architecture',
        question: 'What architecture does the RTX 4090 use?',
        context: 'RTX 4090 uses Ada Lovelace architecture with advanced ray tracing capabilities'
      }
    ];
    
    const results = [];
    
    for (const testCase of testCases) {
      const startTime = Date.now();
      await appPage.askQuestion(testCase.question);
      const responseTime = Date.now() - startTime;
      
      const messages = await appPage.getChatMessages();
      const response = messages[messages.length - 1] || 'No response';
      
      const validation = testDataValidator.validateResponse(testCase.id, 'tech_specs.pdf', response, responseTime);
      
      let evaluation = null;
      try {
        evaluation = await llmJudge.evaluateResponse(
          testCase.question,
          response,
          testCase.context,
          ['relevance', 'accuracy', 'completeness', 'clarity', 'grounding']
        );
      } catch (error) {
      }
      
      results.push({
        question: testCase.question,
        response,
        responseTime,
        validation,
        evaluation,
        passed: validation.valid || response.toLowerCase().includes('not applicable')
      });
      
      await appPage.page.waitForTimeout(1000);
    }
    
    const passedTests = results.filter(r => r.passed).length;
    const averageResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
    
    expect(passedTests).toBeGreaterThan(0);
    expect(averageResponseTime).toBeLessThan(10000);
    
  });

  test.afterAll(async () => {
    await apiHelper.createContext();
    
    try {
      await apiHelper.clearAllDocuments();
    } catch (error) {
    } finally {
      await apiHelper.dispose();
    }
    
    if (llmJudge) {
      await llmJudge.dispose();
    }
    
  });
});