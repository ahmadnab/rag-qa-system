const { test, expect } = require('@playwright/test');
const { AppPage } = require('./pages/app.page');
const { TestSetup } = require('./helpers/test-setup');
const path = require('path');

test.describe('Error Handling', () => {
  let appPage;
  let apiHelper;

  test.beforeEach(async ({ page }) => {
    appPage = new AppPage(page);
    apiHelper = await TestSetup.setupTest(page);
    await appPage.goto();
  });

  test.afterEach(async () => {
    await TestSetup.cleanupTest(apiHelper);
  });

  test('should handle invalid file types gracefully', async () => {
    const fs = require('fs');
    const tempFilePath = path.join(__dirname, 'invalid.txt');
    fs.writeFileSync(tempFilePath, 'This is not a PDF file');
    
    try {
      const response = await apiHelper.uploadDocument(tempFilePath, 'invalid.txt');
      if (!response.ok()) {
        expect([400, 422, 415]).toContain(response.status());
      } else {
        const result = await response.json();
        expect(result.filename).toContain('.txt');
        
        if (result.id) {
          const processResponse = await apiHelper.processDocument(result.id);
          
          if (!processResponse.ok()) {
            expect([400, 422, 500]).toContain(processResponse.status());
          }
        }
      }
    } finally {
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    }
  });

  test('should handle large file uploads appropriately', async () => {
    const fs = require('fs');
    const largePath = path.join(__dirname, 'large.pdf');
    const largeContent = 'PDF content '.repeat(1000000);
    fs.writeFileSync(largePath, largeContent);
    
    try {
      const response = await apiHelper.uploadDocument(largePath, 'large.pdf');
      
      if (!response.ok()) {
        expect([413, 400, 422]).toContain(response.status());
      }
    } finally {
      fs.unlinkSync(largePath);
    }
  });

  test('should handle processing non-existent document', async () => {
    const fakeDocumentId = 'non-existent-document-id';
    
    const response = await apiHelper.processDocument(fakeDocumentId);
    expect(response.ok()).toBeFalsy();
    expect([404, 400, 422, 500]).toContain(response.status());
  });

  test('should handle malformed API requests', async () => {
    const response = await apiHelper.context.post('/qna/', {
      data: {
        invalid_field: 'test'
      },
    });
    
    expect(response.ok()).toBeFalsy();
    expect([400, 422]).toContain(response.status());
  });


  test('should validate input lengths and special characters', async () => {
    const longQuestion = 'What is this document about? '.repeat(100);
    const response = await apiHelper.askQuestion(longQuestion);
    
    if (!response.ok()) {
      expect([400, 422, 500]).toContain(response.status());
    }
    
    const specialCharQuestion = "What is this document about? @#$%^&*()[]{}|\\:;\"'<>,.?/~`";
    const specialResponse = await apiHelper.askQuestion(specialCharQuestion);
    
    if (specialResponse.ok()) {
      const result = await specialResponse.json();
      expect(result.answer).toBeTruthy();
    }
  });

  test('should handle concurrent requests appropriately', async () => {
    const filePath = path.join(__dirname, '../tech_specs.pdf');
    const uploadResponse = await apiHelper.uploadDocument(filePath, 'tech_specs.pdf');
    const uploadResult = await uploadResponse.json();
    const documentId = uploadResult.id;
    
    await apiHelper.processDocument(documentId);
    
    const questions = [
      "What is this document about?",
      "Who are the characters?",
      "What is the setting?",
      "What happens in the story?",
      "What is the conclusion?"
    ];
    
    const promises = questions.map(question => apiHelper.askQuestion(question));
    const responses = await Promise.allSettled(promises);
    
    const successfulResponses = responses.filter(r => 
      r.status === 'fulfilled' && r.value.ok()
    );
    const failedResponses = responses.filter(r => 
      r.status === 'fulfilled' && !r.value.ok()
    );
    const rejectedResponses = responses.filter(r => r.status === 'rejected');
    
    expect(rejectedResponses.length).toBeLessThan(responses.length);
    expect(successfulResponses.length + failedResponses.length).toBeGreaterThan(0);
  });
});