from fastapi import APIRouter

from . import (
    board_slack_channels,
    boards,
    core,
    invitations,
    members,
)


router = APIRouter(tags=["organizations"])
router.include_router(core.router, prefix="/api/organizations")
router.include_router(invitations.router, prefix="/api/organizations")
router.include_router(members.router, prefix="/api/organizations")
router.include_router(boards.router, prefix="/api/organizations")
router.include_router(board_slack_channels.router, prefix="/api/organizations")
