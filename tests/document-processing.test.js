const { test, expect } = require('@playwright/test');
const { AppPage } = require('./pages/app.page');
const { TestSetup } = require('./helpers/test-setup');
const path = require('path');

test.describe('Document Processing', () => {
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
    
    await appPage.goto();
  });

  test.afterEach(async () => {
    await TestSetup.cleanupTest(apiHelper);
  });

  test('should process uploaded document successfully via UI', async () => {
    const beforeProcessing = await apiHelper.getDocuments();
    const beforeDocs = await beforeProcessing.json();
    const docBefore = beforeDocs.find(doc => doc.id === documentId);
    
    await appPage.processDocument(documentId);
    
    await new Promise(resolve => setTimeout(resolve, 8000));
    
    const documentsResponse = await apiHelper.getDocuments();
    const documents = await documentsResponse.json();
    
    const processedDoc = documents.find(doc => doc.id === documentId);
    
    expect(processedDoc).toBeTruthy();
    expect(processedDoc.processed).toBe(true);
  });

  test('should process document via API', async () => {
    const response = await apiHelper.processDocument(documentId);
    
    if (!response.ok()) {
      const errorText = await response.text();
      throw new Error(`Process failed: ${response.status()} ${errorText}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const documentsResponse = await apiHelper.getDocuments();
    expect(documentsResponse.ok()).toBeTruthy();
    
    const documents = await documentsResponse.json();
    
    const processedDoc = documents.find(doc => doc.id === documentId);
    expect(processedDoc).toBeTruthy();
    expect(processedDoc.processed).toBe(true);
  });

  test('should process multiple documents successfully', async () => {
    const filePath2 = path.join(__dirname, '../tech_specs1.pdf');
    const uploadResponse2 = await apiHelper.uploadDocument(filePath2, 'tech_specs1.pdf');
    const uploadResult2 = await uploadResponse2.json();
    const documentId2 = uploadResult2.id;
    
    await apiHelper.processDocument(documentId);
    await apiHelper.processDocument(documentId2);
    
    const documentsResponse = await apiHelper.getDocuments();
    const documents = await documentsResponse.json();
    
    const processedDocs = documents.filter(doc => doc.processed === true);
    expect(processedDocs.length).toBe(2);
  });
});
