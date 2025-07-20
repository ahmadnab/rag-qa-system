# QNAService

## How to run the project

1. Open `docker-compose.yml` file and set the following environment variables if the added one is not working. 
```yaml
    environment:
      - OPENAI_API_KEY=<YOUR_OPENAI_API_KEY>
```


2. In the root directory of the project, run the following command:
```bash
docker-compose up
```

3. Access the Web UI
```
http://localhost:8000
```
4. If you can't access to localhost:8000, open docker and run the  `qnaservice-app-1` from docker.

## How to use the Web UI
1. Select a single document by clicking on the `Choose file`
2. Click on the Upload icon
3. Once the document is uploaded, it needs to be processed. 
4. Click on the play icon to process the document
5. Once the document is processed, you can enter your query in the text box and click on the `Ask Question` button to get the answer.
6. The answer will be displayed in the `Answer` section. and to see references expand each reference to see the source of the answer.
7. To modify the document, delete the document by clicking on the delete icon and upload a new document.