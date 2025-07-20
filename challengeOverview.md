# Assignment

## Overview

You need to run the server by following the instructions provided in the attached zip file. Your task is to create a test pipeline for the application hosted on this server.

## Requirements:

### 1. Run the Application:
- Follow the instructions in the provided zip file's README to run the RAG application using Docker.
- Ensure both the front-end and back-end are up and running and accessible.

### 2. Automate File Upload:
- Automate the process of uploading files to the application.
- Implement automation scripts to upload both a single file and multiple files using the application’s file upload functionality.
- Ensure that the file upload is in progress (using both API and UI).

### 3. Verify File Upload Completion:
- After uploading, ensure the application processes and completes the file upload.
- Call the file upload API to make sure that the upload is completed.
- If the application provides progress indicators, ensure the status is properly tracked during the upload.

### 4. Open the Chat:
- Open the chat interface where the chatbot is located.
- Verify that the chat is loading correctly and is ready to receive input.

### 5. Verify Chat Input:
- Send different types of messages to the chatbot.
- Ensure the chatbot correctly responds to the input and that the interface behaves as expected.

### 6. Ask Questions Based on the Uploaded Document:
- Ask at least 5 questions that are related to the document you uploaded. These questions can cover general content, specific details, and concepts from the document.
  - For example, if the document is about a technical product, ask about features, specifications, or use cases mentioned in the document.

### 7. Verify Suggested Answers with Expected Answers:
- After submitting the questions, verify that the chatbot provides relevant and accurate answers based on the content we have for expected questions.
- Ensure the chatbot is not providing irrelevant responses.

### 8. Add More Test Cases:
- Think of additional test cases to cover other functionalities of the RAG application. Here are some examples you can consider (not all):
  - Error handling
  - Multiple document handling
  - Chatbot response accuracy
  - UI responsiveness

### 9. Test Pipeline with Visualization:
- The pipeline should be run inside Docker to ensure consistency across environments.
- **Visualization:** Integrate a test result visualization tool (e.g., Allure, or any other reporting tool) to provide clear, readable reports of test results.

### 10. README Documentation:
Include a `README.md` file that explains:
- How to run tests: Instructions for running the tests locally and in CI/CD pipelines or in Docker.
- Advantages and Disadvantages of the approach you’ve chosen for automation, pipeline setup, and test reporting.
- Description of Found Bugs: List any bugs you discovered while testing the RAG application, including the steps to reproduce them and any workarounds or fixes if applicable.

The test pipeline should run inside Docker.

### Bonus:
- Implement the test pipeline in Docker with reports.
- Verify the WebSocket response while using the chat, and automate the message we are receiving in WebSocket.

## What We Will Evaluate:
- Test pipeline structure
- Test coverage
- Code maintainability, extensibility, and clarity
- Error handling and reporting

## Duration:
- 2 days

## Submission:
- Send a link to the public Git repository with your code.
