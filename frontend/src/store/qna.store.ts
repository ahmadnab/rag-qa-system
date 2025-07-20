import {action, makeAutoObservable, observable, runInAction,} from 'mobx'
import {makePersistable} from "mobx-persist-store";
import {QnaService, Response} from "@/client";


class QnAStore {
    @observable question =  ''
    @observable response: Response | null = null
    @observable askingQuestion = false

    constructor() {
        makePersistable(this, {
            name: 'QnAStore',
            properties: [],
            storage: window.localStorage,
        });
        makeAutoObservable(this)
    }

    @action setQuestion = (question: string) => (this.question = question)

    @action askQuestion = async () => {
        try {
            runInAction(() => (this.askingQuestion = true))
            const response = await QnaService.getAnswerQnaPost({message: this.question})
            runInAction(() => {
                this.response = response
            })
            runInAction(() => (this.askingQuestion = false))
        } catch (error) {
            console.error('Error asking question:', error)
            alert('Failed to ask question. Please try again.')
        }
        runInAction(() => (this.askingQuestion = false))
    }
}

export default QnAStore