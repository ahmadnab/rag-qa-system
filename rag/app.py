from fastapi.staticfiles import StaticFiles

from rag import get_application
from rag.core import VectorStore
from rag.utils.injector import injector

app = get_application()
app.mount("/", StaticFiles(directory="rag/static", html=True), name="static")


@app.on_event("startup")
def on_startup():
    vector_store = injector.get(VectorStore)
    vector_store.init()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
