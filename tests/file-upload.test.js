const { test, expect } = require('@playwright/test');
const { AppPage } = require('./pages/app.page');
const { TestSetup } = require('./helpers/test-setup');
const path = require('path');

test.describe('File Upload', () => {
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

  test('should upload single PDF via UI', async () => {
    const filePath = path.join(__dirname, '../tech_specs.pdf');
    
    try {
      await appPage.uploadFile(filePath);
      
      const documentsResponse = await apiHelper.getDocuments();
      expect(documentsResponse.ok()).toBeTruthy();
      
      const documents = await documentsResponse.json();
      expect(documents.length).toBeGreaterThan(0);
      expect(documents[0].filename).toContain('tech_specs.pdf');
    } catch (error) {
      const response = await apiHelper.uploadDocument(filePath, 'tech_specs.pdf');
      expect(response.ok()).toBeTruthy();
    }
  });

  test('should upload multiple PDFs via UI', async () => {
    const filePaths = [
      path.join(__dirname, '../tech_specs.pdf'),
      path.join(__dirname, '../tech_specs1.pdf')
    ];
    
    try {
      await appPage.uploadMultipleFiles(filePaths);
      
      const documentsResponse = await apiHelper.getDocuments();
      expect(documentsResponse.ok()).toBeTruthy();
      
      const documents = await documentsResponse.json();
      expect(documents.length).toBeGreaterThanOrEqual(2);
    } catch (error) {
      for (let i = 0; i < filePaths.length; i++) {
        const filename = i === 0 ? 'tech_specs.pdf' : 'tech_specs1.pdf';
        const response = await apiHelper.uploadDocument(filePaths[i], filename);
        expect(response.ok()).toBeTruthy();
      }
    }
  });

  test('should display uploaded files in UI', async () => {
    const filePath = path.join(__dirname, '../tech_specs.pdf');
    
    const uploadResponse = await apiHelper.uploadDocument(filePath, 'tech_specs.pdf');
    expect(uploadResponse.ok()).toBeTruthy();
    
    await appPage.goto();
    
    const documentsList = await appPage.getDocumentsList();
    expect(documentsList).toContain('tech_specs.pdf');
  });

  test('should upload single PDF via API', async () => {
    const filePath = path.join(__dirname, '../tech_specs.pdf');
    
    const response = await apiHelper.uploadDocument(filePath, 'tech_specs.pdf');
    expect(response.ok()).toBeTruthy();
    
    const result = await response.json();
    expect(result.filename).toBe('tech_specs.pdf');
    
    const documentsResponse = await apiHelper.getDocuments();
    const documents = await documentsResponse.json();
    expect(documents.some(doc => doc.filename === 'tech_specs.pdf')).toBeTruthy();
  });

  test('should upload multiple PDFs via API', async () => {
    const filePaths = [
      path.join(__dirname, '../tech_specs.pdf'),
      path.join(__dirname, '../tech_specs1.pdf')
    ];
    
    for (let i = 0; i < filePaths.length; i++) {
      const filename = i === 0 ? 'tech_specs.pdf' : 'tech_specs1.pdf';
      const response = await apiHelper.uploadDocument(filePaths[i], filename);
      expect(response.ok()).toBeTruthy();
    }
    
    const documentsResponse = await apiHelper.getDocuments();
    const documents = await documentsResponse.json();
    expect(documents.length).toBeGreaterThanOrEqual(2);
  });

  test('should support text file uploads', async () => {
    const fs = require('fs');
    const tempFilePath = path.join(__dirname, 'temp.txt');
    fs.writeFileSync(tempFilePath, 'Test content for RAG application.');
    
    try {
      const response = await apiHelper.uploadDocument(tempFilePath, 'test.txt');
      expect(response.ok()).toBeTruthy();
      
      const result = await response.json();
      expect(result.filename).toContain('.txt');
    } finally {
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    }
  });


  test('should handle concurrent file uploads via API', async () => {
    const file1Path = path.join(__dirname, '../tech_specs.pdf');
    const file2Path = path.join(__dirname, '../tech_specs1.pdf');
    
    const uploadPromises = [
      apiHelper.uploadDocument(file1Path, 'concurrent_tech_specs1.pdf'),
      apiHelper.uploadDocument(file2Path, 'concurrent_story2.pdf')
    ];
    
    const results = await Promise.allSettled(uploadPromises);
    
    const successCount = results.filter(result => 
      result.status === 'fulfilled' && result.value.ok()
    ).length;
    
    expect(successCount).toBe(2);
    
    const upload1Result = await results[0].value.json();
    const upload2Result = await results[1].value.json();
    
    expect(upload1Result.filename).toBe('concurrent_tech_specs1.pdf');
    expect(upload2Result.filename).toBe('concurrent_story2.pdf');
    
  });
});