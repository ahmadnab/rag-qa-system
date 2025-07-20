from fastapi import APIRouter

router = APIRouter()


@router.get("/health", operation_id="health")
def ping_health():
    return "healthy"


@router.get("/500", operation_id="test_500_get")
def test_500_get():
    raise RuntimeError("boom!")


@router.get("/500", operation_id="test_500_post")
def test_500_post():
    raise RuntimeError("boom!")
