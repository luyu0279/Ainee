import logging

from fastapi import APIRouter, status

router = APIRouter(prefix="/api/health", tags=["Health"], include_in_schema=False)

logger = logging.getLogger(__name__)


@router.get("", status_code=status.HTTP_200_OK)
def health():
    return {"status": "ok"}
