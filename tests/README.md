# Note : There were couple of issue while automating the entire RAG autmation flow through API, that's why I've used the UI approach and have validated the API's separately. I've had a great deal of help from AI while crating this automation suite and have learned a lot in this process. I've documented all the learnings in a separate document.

# RAG Application Test Suite

This test suite provides comprehensive end-to-end testing for the RAG (Retrieval-Augmented Generation) application using Playwright with Allure reporting.

## Table of Contents
- [Test Overview](#test-overview)
- [How to Run Tests](#how-to-run-tests)
- [Test Categories](#test-categories)
- [Approach Analysis](#approach-analysis)
- [Bug Documentation](#bug-documentation)
- [Test Reporting](#test-reporting)

## Test Overview

The test suite covers all core functionalities of the RAG application:
- Document upload and processing (single and multiple files)
- Chat functionality and Q&A workflows
- RAG accuracy validation with LLM judge evaluation
- Error handling and edge cases
- UI structure validation
- WebSocket communication testing

## How to Run Tests

### Prerequisites
- Docker and Docker Compose installed
- Node.js (for local development)
- Application running via `docker-compose up`

### Running Tests Locally

1. **Install dependencies:**
   ```bash
   npm install
   npm run setup
   ```

2. **Start the application:**
   ```bash
   docker-compose up
   ```

3. **Run all tests:**
   ```bash
   npm test
   ```

4. **Run specific test categories:**
   ```bash
   # File upload tests
   npx playwright test file-upload.test.js

   # Chat functionality
   npx playwright test chat-functionality.test.js

   # RAG validation with LLM judge
   npx playwright test rag-validation.test.js

   # Error handling
   npx playwright test error-handling.test.js

   # UI structure validation
   npx playwright test ui-structure.test.js

   # WebSocket testing (bonus)
   npx playwright test websocket.test.js
   ```

5. **Run with UI mode (for debugging):**
   ```bash
   npm run test:ui
   ```

6. **Run in headed mode:**
   ```bash
   npm run test:headed
   ```

### Running Tests in Docker

Tests are designed to run inside Docker for consistency across environments:

```bash
# Build and run test container
docker build -t rag-tests .
docker run --network="host" rag-tests
```

### Generating Test Reports

```bash
# Generate and open Allure reports
npm run report

# If report gets stuck loading, use:
npm run report:serve

# Clean previous reports
npm run report:clean
```

## Test Categories

### 1. Document Processing Tests (`document-processing.test.js`)
- **Purpose**: Validates document upload, processing, and vector store integration
- **Coverage**: 
  - UI-based document processing workflow
  - API-based document processing
  - Vector store validation
  - Processing status verification

### 2. File Upload Tests (`file-upload.test.js`)
- **Purpose**: Tests file upload functionality via both UI and API
- **Coverage**:
  - Single file upload (PDF, TXT)
  - Multiple file uploads
  - Concurrent uploads (stress testing)
  - UI fallback mechanisms

### 3. Chat Functionality Tests (`chat-functionality.test.js`)
- **Purpose**: Validates chat interface and basic Q&A functionality
- **Coverage**:
  - Message sending and receiving
  - Chat history management
  - Response formatting
  - Basic question-answer workflows

### 4. RAG Validation Tests (`rag-validation.test.js`)
- **Purpose**: Comprehensive RAG system validation with LLM judge evaluation
- **Coverage**:
  - Factual accuracy testing against predefined expectations
  - Semantic quality assessment using LLM judge
  - Hallucination prevention testing
  - Response quality metrics (relevance, accuracy, completeness)

### 5. Error Handling Tests (`error-handling.test.js`)
- **Purpose**: Tests application resilience and error scenarios
- **Coverage**:
  - Invalid file type handling
  - Large file upload limits
  - Non-existent document processing
  - Malformed API requests
  - Network timeout handling
  - Concurrent request management

### 6. UI Structure Tests (`ui-structure.test.js`)
- **Purpose**: Validates UI components and responsive design
- **Coverage**:
  - File upload element presence
  - Chat interface components
  - Document management area
  - Responsive design across viewports
  - Navigation and interaction testing

### 7. WebSocket Tests (`websocket.test.js`)
- **Purpose**: Tests real-time WebSocket communication
- **Coverage**:
  - WebSocket connection establishment
  - Message transmission and reception
  - Error handling for WebSocket failures
  - Real-time chat functionality

## Approach Analysis

### Advantages of Our Testing Approach

#### 1. **Coverage**
- **End-to-End Testing**: Tests complete user workflows from file upload to Q&A
- **Multi-Layer Validation**: Combines UI testing, API testing, and business logic validation

#### 2. **Technology Stack**
- **Playwright**: Modern, fast, and reliable browser automation
- **Cross-Browser Support**: Tests work across Chromium, Firefox, and WebKit
- **API Integration**: Direct API testing alongside UI testing for comprehensive coverage

#### 3. **RAG Validation**
- **LLM Judge Evaluation**: Uses AI to evaluate response quality semantically
- **Hallucination Detection**: Prevents false information generation
- **Accuracy Metrics**: Measures relevance, completeness, and grounding

#### 4. **QA Features**
- **Allure Reporting**: Visual test reports with screenshots and videos
- **Test Data Management**: Structured test data with expected answers

#### 5. **Integration**
- **Docker Support**: Consistent test execution across environments
- **CI/CD Ready**: Easily integrable into automated pipelines
- **Parallel Execution**: Fast test execution with Playwright's parallel capabilities

### Disadvantages and Limitations

#### 1. **Test Maintenance Overhead**
- **UI Dependency**: Tests may break with UI changes requiring selector updates
- **Complex Setup**: Requires Docker environment and external dependencies (OpenAI API)
- **Data Management**: Need to maintain test data and expected answers

#### 2. **Resource Requirements**
- **Heavy Dependencies**: Playwright browsers and Docker containers require significant resources
- **External API Costs**: LLM judge evaluation uses OpenAI API (cost implications)

#### 3. **Test Reliability Challenges**
- **Timing Issues**: Asynchronous operations may cause flaky tests
- **Network Dependencies**: Tests depend on external services (MongoDB, S3, OpenAI)
- **Environment Sensitivity**: Docker and network configurations can affect test stability


## Bug Documentation

## 1. Ask Without Upload Bug
**Description:** Users can ask questions without uploading a file.

**Steps to Reproduce:**
1. Open the home page of the RAG application.
2. Type any question into the input field.
3. The 'Ask' button becomes active.
4. Click the button — the app begins processing.

**Expected Behavior:** The ask functionality should be disabled until a file is uploaded.

**Workaround:** None

---

## 2. Tooltip Message Bug
**Description:** Tooltip over the upload icon says "no file chosen" even when a file is selected.

**Steps to Reproduce:**
1. Select any file using the upload icon.
2. Hover over the upload icon.
3. Observe tooltip message.

**Expected Behavior:** Tooltip should show the filename or confirm selection.

**Workaround:** NA

---

## 3. Irrelevant Question Error Persistence
**Description:** After asking too many irrelevant questions, the system throws an error and fails to respond to valid ones.

**Steps to Reproduce:**
1. Upload a document.
2. Ask several irrelevant questions.
3. Observe error: "fail to ask question, please ask again."
4. Ask a valid question — it fails to respond.

**Expected Behavior:** System should recover and respond to valid queries.

**Workaround:** Restarting Docker service resolves the issue.

---

## 4. Recursion Limit Bug
**Description:** Recursion limit error persists even after increasing the limit.

**Steps to Reproduce:**
1. Increase recursion limit in line graph configuration (e.g., to 50, then 100).
2. Ask questions until the retrieval limit is hit.
3. Observe error that recursion limit (default 25) is reached.

**Expected Behavior:** Modified limit should be respected.

**Workaround:** None effective so far.

---

## 5. Ask Enabled Without Processing File
**Description:** System allows questions before the uploaded file is processed.

**Steps to Reproduce:**
1. Upload a file.
2. Try to ask a question before the file is fully processed.
3. Observe error: "sorry, this is not a relevant question."

**Expected Behavior:** System should block questions until processing is complete and notify the user.

**Workaround:** NA

## Test Reporting & Visualization

### Simple & Organized Allure Reports
The test suite generates clean, organized Allure reports featuring:

**Key Features:**
- **Visual Organization**: Test suites with emoji icons for instant recognition
- **Smart Categorization**: Organized failure types for quick troubleshooting
- **Rich Documentation**: Screenshots, videos, and detailed error context
- **Environment Tracking**: Clear application and test configuration details
- **Performance Insights**: Test timing and execution analytics


### Accessing Reports
```bash
# Generate and open reports (recommended)
npm run report

# Clean all previous reports
npm run report:clean
```
---
