import {action, makeAutoObservable, observable, runInAction,} from 'mobx'
import {makePersistable} from "mobx-persist-store";
import {DocumentsService, UserDocuments} from "@/client";


class DocumentStore {
    @observable userDocuments =  observable.array<UserDocuments>()
    @observable uploading = false
    @observable processingFile: string | null = null

    constructor() {
        makePersistable(this, {
            name: 'DocumentStore',
            properties: [],
            storage: window.localStorage,
        });
        makeAutoObservable(this)
    }

    @action fetchDocuments = async () => {
        try {
            const userDocuments = await DocumentsService.getDocumentsDocumentsGet()
            runInAction(() => {
                this.userDocuments.replace(userDocuments)
            })
        } catch (error) {
            console.error('Error fetching documents:', error)
            alert('Failed to fetch documents. Please try again.')
        }
    }

    @action deleteDocument = async (documentId: string) => {
        try {
            await DocumentsService.deleteDocumentDocumentsDocumentIdDelete(documentId)
            await this.fetchDocuments()
        } catch (error) {
            console.error('Error deleting document:', error)
            alert('Failed to delete document. Please try again.')
        }
    }

    @action processDocument = async (documentId: string) => {
        runInAction(() => (this.processingFile = documentId))
        try {
            await DocumentsService.processDocumentDocumentsProcessDocumentIdPost(documentId)
            await this.fetchDocuments()
            runInAction(() => (this.processingFile = null))
        } catch (error) {
            console.error('Error processing document:', error)
            alert('Failed to process document. Please try again.')
        }
        runInAction(() => (this.processingFile = null))
    }

    @action handleFileUpload = async (file: File) => {
        if (!file) return
        runInAction(() => (this.uploading = true))

        try {
            await DocumentsService.uploadDocumentDocumentsUploadPost({file})
            await this.fetchDocuments()
        } catch (error) {
          console.error('Error uploading file:', error)
          alert('Failed to upload file. Please try again.')
        } finally {
            runInAction(() => (this.uploading = false))
        }
    }
}

export default DocumentStore