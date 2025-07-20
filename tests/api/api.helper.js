const { request } = require('@playwright/test');

class ApiHelper {
  constructor() {
    this.baseURL = 'http://localhost:8000';
  }

  async createContext() {
    this.context = await request.newContext({
      baseURL: this.baseURL,
    });
    return this.context;
  }

  async uploadDocument(filePath, fileName) {
    const formData = new FormData();
    const fs = require('fs');
    const fileBuffer = fs.readFileSync(filePath);
    const blob = new Blob([fileBuffer]);
    formData.append('file', blob, fileName);

    const response = await this.context.post('/documents/upload/', {
      multipart: {
        file: {
          name: fileName,
          mimeType: 'application/pdf',
          buffer: fileBuffer,
        },
      },
    });
    return response;
  }

  async processDocument(documentId) {
    const response = await this.context.post(`/documents/process/${documentId}`);
    return response;
  }

  async getDocuments() {
    const response = await this.context.get('/documents/');
    return response;
  }

  async deleteDocument(documentId) {
    const response = await this.context.delete(`/documents/${documentId}`);
    return response;
  }

  async clearAllDocuments() {
    const response = await this.context.delete('/documents/clear_all');
    return response;
  }

  async askQuestion(question) {
    const response = await this.context.post('/qna/', {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:8000',
        'Referer': 'http://localhost:8000/',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin'
      },
      data: {
        message: question,  // API expects 'message' field, not 'question'
      },
    });
    return response;
  }

  async getVectorStore() {
    const response = await this.context.get('/vectorstore/');
    return response;
  }

  async ping() {
    const response = await this.context.get('/ping');
    return response;
  }

  async dispose() {
    if (this.context) {
      await this.context.dispose();
    }
  }
}

module.exports = { ApiHelper };