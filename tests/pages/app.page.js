const { expect } = require('@playwright/test');

class AppPage {
  constructor(page) {
    this.page = page;
    
    // Updated selectors based on working codegen script
    this.chooseFileButton = page.getByRole('button', { name: 'Choose File' });
    this.fileInput = page.locator('input[type="file"]');  // Direct file input for programmatic upload
    this.uploadButton = page.getByRole('button').nth(1);  // Upload button (second button)
    this.processButton = page.getByRole('button', { name: 'Process file' });
    this.chatInput = page.getByRole('textbox', { name: /Ask a question about the/ });
    this.chatSendButton = page.getByRole('button', { name: 'Ask Question' });
    this.chatProcessingButton = page.locator('button:has-text("Processing...")');
    this.unprocessedStatus = page.getByText('Unprocessed');
    this.processedStatus = page.locator('div:has-text("Processed")');
    this.referencesHeading = page.getByRole('heading', { name: 'References:' });
    
    // Enhanced selectors for chat response validation
    this.answerContainer = page.locator('div.p-4.bg-secondary.rounded-md');
    this.referencesContainer = page.locator('div:has(h3:has-text("References:"))');
    this.loadingSpinner = page.locator('svg.lucide-loader-circle');
    this.searchIcon = page.locator('svg.lucide-search');
    
    // Legacy selectors (keeping for backward compatibility where needed)
    this.documentsList = '.space-y-2';
    this.chatMessages = '.bg-secondary';
    this.loadingIndicator = '[data-lucide="loader-2"]';
    this.errorMessage = '[data-testid="error"]';
    this.clearAllButton = 'button:has-text("Clear All")';
    this.deleteButton = 'button[aria-label="Delete file"]';
  }

  async goto() {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
  }

  async uploadFile(filePath) {
    // Upload file programmatically without opening file picker
    await this.fileInput.setInputFiles(filePath);
    await this.uploadButton.click();
    await this.waitForUploadComplete();
  }

  async uploadMultipleFiles(filePaths) {
    // Upload multiple files one by one since the input doesn't support multiple files
    for (let i = 0; i < filePaths.length; i++) {
      await this.fileInput.setInputFiles(filePaths[i]);
      await this.uploadButton.click();
      await this.waitForUploadComplete();
      await this.page.waitForTimeout(1000);
    }
  }

  async processDocument(documentId) {
    if (documentId) {
      // Strategy 1: Look for document-specific selectors with data attributes
      const processSelector = `[data-document-id="${documentId}"] button[aria-label="Process file"]`;
      const fallbackSelector = `button[data-document-id="${documentId}"]:has-text("Process")`;
      
      try {
        await this.page.locator(processSelector).click({ timeout: 5000 });
      } catch {
        try {
          await this.page.locator(fallbackSelector).click({ timeout: 5000 });
        } catch {
          // Strategy 2: Find by document filename and then locate the process button in the same container
          try {
            const documentRow = this.page.locator(`text=story.pdf`).first();
            const processButtonInRow = documentRow.locator('..').locator('button[aria-label="Process file"]');
            await processButtonInRow.click({ timeout: 5000 });
          } catch {
            // Strategy 3: Use first available process button
            await this.processButton.first().click({ timeout: 10000 });
          }
        }
      }
    } else {
      // If no documentId provided, use the first available process button
      await this.processButton.first().click({ timeout: 10000 });
    }
    await this.waitForProcessingComplete();
  }

  async askQuestion(question) {
    
    // Wait for any previous processing to complete
    await this.waitForReadyState();
    
    // Clear input and enter new question
    await this.chatInput.click();
    await this.chatInput.clear();
    await this.chatInput.fill(question);
    
    // Verify button is ready before clicking
    await this.chatSendButton.waitFor({ state: 'visible' });
    await expect(this.chatSendButton).toHaveText('Ask Question');
    
    // Submit question
    await this.chatSendButton.click();
    
    // Wait for complete response
    await this.waitForCompleteResponse();
    
  }

  async waitForReadyState() {
    try {
      // Ensure no processing is happening
      await expect(this.chatProcessingButton).toBeHidden({ timeout: 5000 });
      await expect(this.chatSendButton).toHaveText('Ask Question');
      await expect(this.chatSendButton).toBeEnabled();
    } catch (error) {
      await this.page.waitForTimeout(2000);
    }
  }

  async waitForCompleteResponse() {
    
    // Step 1: Wait for processing to begin
    try {
      await expect(this.chatProcessingButton).toBeVisible({ timeout: 10000 });
      await expect(this.chatProcessingButton).toHaveText('Processing...');
    } catch (error) {
    }
    
    // Step 2: Wait for processing to complete
    try {
      await expect(this.chatProcessingButton).toBeHidden({ timeout: 30000 });
      await expect(this.chatSendButton).toHaveText('Ask Question');
    } catch (error) {
      // Check if page is still valid before waiting
      if (!this.page.isClosed()) {
        await this.page.waitForTimeout(5000);
      }
    }
    
    // Step 3: Wait for answer to appear
    let answerReceived = false;
    for (let i = 0; i < 10; i++) {
      // Check if page is still valid
      if (this.page.isClosed()) {
        break;
      }
      
      await this.page.waitForTimeout(1000);
      const answerCount = await this.answerContainer.count();
      if (answerCount > 0) {
        answerReceived = true;
        break;
      }
    }
    
    if (!answerReceived) {
    }
    
    // Step 4: Final wait to ensure response is complete
    if (!this.page.isClosed()) {
      await this.page.waitForTimeout(2000);
    }
  }

  async askQuestionWithValidation(question) {
    console.log(`❓ Asking question: "${question}"`);
    
    // Step 1: Fill and submit question
    await this.chatInput.click();
    await this.chatInput.fill(question);
    
    // Step 2: Verify initial button state and click
    await expect(this.chatSendButton).toHaveText('Ask Question');
    await expect(this.searchIcon).toBeVisible();
    
    const startTime = Date.now();
    await this.chatSendButton.click();
    
    // Step 3: Verify processing state
    console.log('⏳ Verifying processing state...');
    await expect(this.chatProcessingButton).toBeVisible({ timeout: 5000 });
    await expect(this.chatProcessingButton).toHaveText('Processing...');
    await expect(this.loadingSpinner).toBeVisible();
    
    // Step 4: Wait for response completion
    console.log('⏳ Waiting for response...');
    await expect(this.chatProcessingButton).toBeHidden({ timeout: 30000 });
    await expect(this.chatSendButton).toBeVisible();
    await expect(this.chatSendButton).toHaveText('Ask Question');
    await expect(this.searchIcon).toBeVisible();
    
    const responseTime = Date.now() - startTime;
    
    return responseTime;
  }

  async waitForUploadComplete() {
    // Wait for document to appear with Unprocessed status
    try {
      await this.waitForDocumentStatus('Unprocessed');
    } catch {
      // Fallback to original method
      await this.page.waitForSelector(this.loadingIndicator, { state: 'hidden', timeout: 30000 });
      await this.page.waitForTimeout(1000);
    }
  }

  async waitForProcessingComplete() {
    // Wait for document status to change to Processed
    try {
      await this.waitForDocumentStatus('Processed');
    } catch (error) {
      try {
        // Fallback to original method
        await this.page.waitForSelector(this.loadingIndicator, { state: 'hidden', timeout: 60000 });
        await this.page.waitForTimeout(3000);
      } catch (fallbackError) {
        await this.page.waitForTimeout(5000);
      }
    }
  }

  async waitForResponse() {
    // Wait for chat response with References heading
    const hasResponse = await this.waitForChatResponse();
    if (!hasResponse) {
      // Fallback to original method
      await this.page.waitForSelector(this.loadingIndicator, { state: 'hidden', timeout: 30000 });
      await this.page.waitForTimeout(1000);
    }
  }

  async getDocumentsList() {
    try {
      // Try multiple strategies to get document list content
      await this.page.waitForTimeout(2000); // Wait for documents to appear
      
      // Strategy 1: Look for document filenames in the page
      const pageContent = await this.page.textContent('body');
      if (pageContent.includes('.pdf')) {
        return pageContent;
      }
      
      // Strategy 2: Look for specific document container
      const documentContainer = await this.page.locator(this.documentsList).textContent().catch(() => null);
      if (documentContainer) {
        return documentContainer;
      }
      
      // Strategy 3: Look for any text that contains file names
      const allText = await this.page.locator('text=/.*\.pdf.*/').allTextContents().catch(() => []);
      if (allText.length > 0) {
        return allText.join(' ');
      }
      
      return '';
    } catch (error) {
      return '';
    }
  }

  async getChatMessages() {
    try {
      return await this.page.locator(this.chatMessages).allTextContents();
    } catch {
      return [];
    }
  }

  async getLatestAnswer() {
    try {
      // Wait a moment for any rendering to complete
      await this.page.waitForTimeout(1000);
      
      const answerCount = await this.answerContainer.count();
      if (answerCount === 0) {
        return null;
      }
      
      const answers = await this.answerContainer.allTextContents();
      const latestAnswer = answers.length > 0 ? answers[answers.length - 1].trim() : null;
      return latestAnswer;
    } catch (error) {
      return null;
    }
  }

  async validateResponseStructure() {
    const validation = {
      hasAnswer: false,
      hasReferences: false,
      answer: null,
      responseTime: null
    };

    try {
      // Check for answer
      const answerCount = await this.answerContainer.count();
      if (answerCount > 0) {
        validation.hasAnswer = true;
        validation.answer = await this.getLatestAnswer();
      }

      // Check for references
      const referencesCount = await this.referencesContainer.count();
      if (referencesCount > 0) {
        validation.hasReferences = true;
      }

      return validation;
    } catch (error) {
      return validation;
    }
  }

  async clearAllDocuments() {
    try {
      await this.page.click(this.clearAllButton);
      await this.page.waitForTimeout(2000);
    } catch {
    }
  }

  async getErrorMessage() {
    try {
      // Try multiple strategies to find error messages
      
      // Strategy 1: Look for specific error selector
      const specificError = await this.page.locator(this.errorMessage).textContent().catch(() => null);
      if (specificError) {
        return specificError;
      }
      
      // Strategy 2: Look for common error text patterns
      const errorPatterns = [
        'text=/.*error.*/i',
        'text=/.*invalid.*/i', 
        'text=/.*failed.*/i',
        'text=/.*not supported.*/i',
        'text=/.*not allowed.*/i'
      ];
      
      for (const pattern of errorPatterns) {
        const errorText = await this.page.locator(pattern).first().textContent().catch(() => null);
        if (errorText) {
          return errorText;
        }
      }
      
      // Strategy 3: Check for any alert or notification elements
      const alertSelectors = [
        '[role="alert"]',
        '.alert',
        '.error',
        '.notification',
        '.toast'
      ];
      
      for (const selector of alertSelectors) {
        const alertText = await this.page.locator(selector).textContent().catch(() => null);
        if (alertText) {
          return alertText;
        }
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  async isElementVisible(selector) {
    try {
      return await this.page.locator(selector).isVisible();
    } catch {
      return false;
    }
  }

  // New methods based on working codegen flow
  async waitForDocumentStatus(status = 'Unprocessed') {
    if (status === 'Unprocessed') {
      await this.unprocessedStatus.waitFor({ timeout: 10000 });
    } else if (status === 'Processed') {
      await this.processedStatus.waitFor({ timeout: 60000 });
    }
  }

  async isDocumentProcessed() {
    try {
      await this.processedStatus.waitFor({ timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  async isDocumentUnprocessed() {
    try {
      await this.unprocessedStatus.waitFor({ timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  async waitForChatResponse() {
    // Wait for References heading to appear (indicates response is complete)
    try {
      await this.referencesHeading.waitFor({ timeout: 30000 });
      return true;
    } catch {
      return false;
    }
  }
}

module.exports = { AppPage };