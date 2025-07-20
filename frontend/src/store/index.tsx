import React from "react";
import { observable } from 'mobx'
import DocumentStore from "./document.store.ts"
import QnAStore from './qna.store.ts'
import {OpenAPI} from "@/client";


export {
    DocumentStore,
    QnAStore,
}


export interface RootStoreContextValue {
    documentStore: DocumentStore;
    qnaStore: QnAStore;
}

export const initServices = (): RootStoreContextValue => {
    OpenAPI.BASE = 'http://localhost:8000'

    const documentStore = new DocumentStore();
    const qnaStore = new QnAStore()

    return observable({
        documentStore,
        qnaStore,
    })
}

export const RootStoreContext = React.createContext({} as RootStoreContextValue)

export const RootStoreContextProvider: React.FC<React.PropsWithChildren<{}>> = ({children}) => {
    const services = initServices()
    return (
        <RootStoreContext.Provider value={services}>
            {children}
        </RootStoreContext.Provider>
    )
}

export const useDocumentStore = () => React.useContext(RootStoreContext)
