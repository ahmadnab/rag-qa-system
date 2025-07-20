import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { FileIcon, Trash2Icon, UploadIcon, PlayIcon, SearchIcon, Loader2Icon } from 'lucide-react'
import {observer} from "mobx-react-lite";
import {useDocumentStore} from "@/store";

function App() {

  const {
    documentStore: {
      userDocuments,
      handleFileUpload,
      fetchDocuments,
      processDocument,
      deleteDocument,
      uploading,
      processingFile,
    },
    qnaStore: {
      question,
      setQuestion,
      response,
      askQuestion,
      askingQuestion,
    }
  } = useDocumentStore()

  const [file, setFile] = useState<File>()

  useEffect(() => {
    fetchDocuments()
  }, [])

  return (
    <Card className="w-full max-w-3xl">
      <CardHeader>
        <CardTitle>File Uploader and Question Answering System</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="flex items-center space-x-2">
            <Input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0])}
              disabled={uploading}
              className="flex-1"
            />
            <Button disabled={uploading || !file} onClick={() => handleFileUpload(file!).then(() => setFile(undefined))}>
              {uploading ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <UploadIcon className="h-4 w-4" />}
            </Button>
          </div>
          <div className="space-y-2">
            {userDocuments.map((document) => (
              <div key={document.id} className="flex items-center justify-between p-2 bg-secondary rounded-md">
                <div className="flex items-center space-x-2 flex-grow">
                  <FileIcon className="h-4 w-4" />
                  <span className="text-sm truncate">{document.filename}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={(document.processed ? "success" : "secondary") as any}>
                    {document.processed ? "Processed" : "Unprocessed"}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => processDocument(document.id!)}
                    disabled={document.processed || processingFile === document.id}
                    aria-label="Process file"
                  >
                    {processingFile === document.id ? (
                      <Loader2Icon className="h-4 w-4 animate-spin" />
                    ) : (
                      <PlayIcon className="h-4 w-4" />
                    )}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteDocument(document.id!)} aria-label="Delete file">
                    <Trash2Icon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <Textarea
              placeholder="Ask a question about the uploaded documents..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
            <Button onClick={askQuestion} disabled={!question.trim() || askingQuestion}>
              {askingQuestion ? (
                <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <SearchIcon className="h-4 w-4 mr-2" />
              )}
              {askingQuestion ? 'Processing...' : 'Ask Question'}
            </Button>
          </div>
          {response && (
            <div className="space-y-4">
              <div className="p-4 bg-secondary rounded-md">
                <p>{response.answer}</p>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">References:</h3>
                <Accordion type="single" collapsible className="w-full">
                  {response.reference_links.map((ref, index) => (
                    <AccordionItem value={`item-${index}`} key={index}>
                      <AccordionTrigger>
                        <a href={ref.link} target="_blank" rel="noopener noreferrer" className="hover:underline">
                          {ref.filename}
                        </a>
                        {' - Page '}{ref.page}
                      </AccordionTrigger>
                      <AccordionContent>
                        {
                          ref.chunks.map((chunk, index) => (
                            <p key={index} className="text-sm">{chunk}</p>
                          ))
                        }
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default observer(App)