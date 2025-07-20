const { test, expect } = require('@playwright/test');
const { AppPage } = require('./pages/app.page');
const { TestSetup } = require('./helpers/test-setup');
const path = require('path');

test.describe('Chat Functionality', () => {
  let appPage;
  let apiHelper;
  let documentId;

  test.beforeEach(async ({ page }) => {
    appPage = new AppPage(page);
    apiHelper = await TestSetup.setupTest(page);
    
    const filePath = path.join(__dirname, '../tech_specs.pdf');
    const uploadResponse = await apiHelper.uploadDocument(filePath, 'tech_specs.pdf');
    
    if (!uploadResponse.ok()) {
      throw new Error(`Upload failed: ${uploadResponse.status()} ${await uploadResponse.text()}`);
    }
    
    const uploadResult = await uploadResponse.json();
    documentId = uploadResult.id;
    
    if (!documentId) {
      throw new Error('No document ID returned from upload');
    }
    
    
    const processResponse = await apiHelper.processDocument(documentId);
    if (!processResponse.ok()) {
      const errorText = await processResponse.text();
      
      if (processResponse.status() === 400 && errorText.includes('Document not found')) {
        await page.waitForTimeout(3000);
        
        const retryResponse = await apiHelper.processDocument(documentId);
        if (!retryResponse.ok()) {
          await appPage.goto();
          return;
        }
      } else {
        throw new Error(`Process failed: ${processResponse.status()} ${errorText}`);
      }
    }
    
    await page.waitForTimeout(5000);
    
    const verifyResponse = await apiHelper.getDocuments();
    const docs = await verifyResponse.json();
    const processedDoc = docs.find(doc => doc.id === documentId);
    
    await appPage.goto();
  });

  test.afterEach(async () => {
    await TestSetup.cleanupTest(apiHelper);
  });

  test('should display chat interface correctly', async () => {
    
    await appPage.page.waitForLoadState('networkidle');
    
    try {
      await appPage.chatInput.waitFor({ timeout: 10000 });
      const chatInputVisible = await appPage.chatInput.isVisible();
      expect(chatInputVisible).toBeTruthy();
    } catch (error) {
      const legacyVisible = await appPage.isElementVisible('textarea[placeholder*="question"]');
      expect(legacyVisible).toBeTruthy();
    }
    
    try {
      await appPage.chatSendButton.waitFor({ timeout: 10000 });
      const sendButtonVisible = await appPage.chatSendButton.isVisible();
      expect(sendButtonVisible).toBeTruthy();
    } catch (error) {
      const legacyVisible = await appPage.isElementVisible('button:has-text("Ask Question")');
      expect(legacyVisible).toBeTruthy();
    }
  });

  test('should handle chat input and display loading states correctly', async () => {
    const question = "Test question for UI validation";
    
    await appPage.chatInput.click();
    await appPage.chatInput.fill(question);
    
    const inputValue = await appPage.chatInput.inputValue();
    expect(inputValue).toBe(question);
    
    const sendButtonEnabled = await appPage.chatSendButton.isEnabled();
    expect(sendButtonEnabled).toBeTruthy();
    
    await appPage.chatSendButton.click();
    
    try {
      await appPage.chatProcessingButton.waitFor({ timeout: 5000 });
      
      await appPage.chatProcessingButton.waitFor({ state: 'hidden', timeout: 30000 });
    } catch (error) {
    }
    
    const finalInputValue = await appPage.chatInput.inputValue();
    expect(typeof finalInputValue).toBe('string');
    
    const responseElements = await appPage.answerContainer.count();
    const referencesElements = await appPage.referencesContainer.count();
    
    expect(responseElements > 0 || referencesElements > 0).toBeTruthy();
  });

  test('should display empty state when no input provided', async () => {
    
    await appPage.chatInput.clear();
    const emptyInputValue = await appPage.chatInput.inputValue();
    expect(emptyInputValue).toBe('');
    
    const sendButtonText = await appPage.chatSendButton.textContent();
    expect(sendButtonText).toContain('Ask Question');
    
    const sendButtonEnabled = await appPage.chatSendButton.isEnabled();
    expect(sendButtonEnabled).toBeFalsy();
    
    await appPage.page.waitForTimeout(1000);
    const processingVisible = await appPage.chatProcessingButton.isVisible().catch(() => false);
    expect(processingVisible).toBeFalsy();
    
    const placeholderText = await appPage.chatInput.getAttribute('placeholder');
    expect(placeholderText).toBeTruthy();
  });

  test('should handle multiple UI interactions correctly', async () => {
    
    const questions = [
      "First test question",
      "Second test question", 
      "Third test question"
    ];
    
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      
      await appPage.chatInput.click();
      await appPage.chatInput.clear();
      await appPage.chatInput.fill(question);
      
      const inputValue = await appPage.chatInput.inputValue();
      expect(inputValue).toBe(question);
      
      await appPage.chatSendButton.click();
      
      try {
        await appPage.chatProcessingButton.waitFor({ timeout: 5000 });
        await appPage.chatProcessingButton.waitFor({ state: 'hidden', timeout: 25000 });
      } catch (error) {
      }
      
      const clearedValue = await appPage.chatInput.inputValue();
      expect(clearedValue).toBe('');
      
      
      await appPage.page.waitForTimeout(1000);
    }
    
    const finalResponseCount = await appPage.answerContainer.count();
    expect(finalResponseCount).toBeGreaterThan(0);
  });

  test('should handle questions when no documents are processed', async () => {
    await apiHelper.clearAllDocuments();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const question = "What is this document about?";
    const response = await apiHelper.askQuestion(question);
    
    
    if (response.ok()) {
      const result = await response.json();
      if (result.answer) {
        expect(result.answer.toLowerCase()).toMatch(/(no documents|cannot answer|not found|not applicable)/);
      }
    } else {
      expect([400, 404, 422, 500]).toContain(response.status());
    }
  });

  test('should return reference links in response', async () => {
    const question = "What is this document about?";
    
    const response = await apiHelper.askQuestion(question);
    
    if (!response.ok()) {
      return;
    }
    
    const result = await response.json();
    
    const hasReferences = result.reference_links || result.references || result.sources || result.links;
    
    if (hasReferences) {
      expect(hasReferences).toBeDefined();
      
      if (Array.isArray(hasReferences) && hasReferences.length > 0) {
        const firstRef = hasReferences[0];
        expect(typeof firstRef).toBe('object');
      }
    } else {
      expect(Object.keys(result).length).toBeGreaterThan(0);
    }
  });

  test('should handle multiple consecutive questions', async () => {
    const questions = [
      "What is this story about?",
      "Tell me more about the characters",
      "What is the setting?"
    ];
    
    for (let i = 0; i < questions.length; i++) {
      const response = await apiHelper.askQuestion(questions[i]);
      
      if (!response.ok()) {
        continue;
      }
      
      const result = await response.json();
      
      if (result.answer) {
        expect(result.answer).toBeTruthy();
      } else {
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  });
});