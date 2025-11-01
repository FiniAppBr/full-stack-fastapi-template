"""
Kanban API endpoints - Sales pipeline board
"""
from fastapi import APIRouter

router = APIRouter()


# Mock kanban data based on our furniture store testing
KANBAN_DATA = {
    "board": {
        "columns": [
            {"id": "new-lead", "name": "New Lead"},
            {"id": "contacted", "name": "Contacted"},
            {"id": "proposal", "name": "Proposal"},
            {"id": "won", "name": "Won"},
        ],
        "tasks": {
            "new-lead": [
                {
                    "id": "task-1",
                    "name": "Ricardo Silva",
                    "description": "R$40k budget, interested in Milão sofa. Mentioned Tok Stok competitor.",
                    "assignee": [{"id": "user-1", "name": "Móveis Premium Agent", "avatarUrl": ""}],
                    "priority": "high",
                    "labels": ["VIP", "High Value"],
                    "status": "new-lead",
                    "reporter": {"id": "agent-16", "name": "Móveis Premium Agent"},
                    "attachments": [],
                    "comments": [],
                    "due": [None, None],
                },
                {
                    "id": "task-2",
                    "name": "Carla Santos",
                    "description": "R$12k budget, interested in Copacabana sofa. Asked about installments.",
                    "assignee": [{"id": "user-1", "name": "Móveis Premium Agent", "avatarUrl": ""}],
                    "priority": "medium",
                    "labels": ["Mid-Range"],
                    "status": "new-lead",
                    "reporter": {"id": "agent-16", "name": "Móveis Premium Agent"},
                    "attachments": [],
                    "comments": [],
                    "due": [None, None],
                },
            ],
            "contacted": [
                {
                    "id": "task-3",
                    "name": "Ana Costa",
                    "description": "R$15k budget, browsing sofas. Email captured.",
                    "assignee": [{"id": "user-1", "name": "Móveis Premium Agent", "avatarUrl": ""}],
                    "priority": "medium",
                    "labels": ["Warm Lead"],
                    "status": "contacted",
                    "reporter": {"id": "agent-16", "name": "Móveis Premium Agent"},
                    "attachments": [],
                    "comments": [],
                    "due": [None, None],
                },
            ],
            "proposal": [
                {
                    "id": "task-4",
                    "name": "Carlos Mendes",
                    "description": "R$32k deal - Versailles sofa + delivery. Proposal sent.",
                    "assignee": [{"id": "user-2", "name": "Sales Team", "avatarUrl": ""}],
                    "priority": "high",
                    "labels": ["VIP", "Proposal Sent"],
                    "status": "proposal",
                    "reporter": {"id": "user-2", "name": "Sales Team"},
                    "attachments": [],
                    "comments": [],
                    "due": [None, None],
                },
            ],
            "won": [
                {
                    "id": "task-5",
                    "name": "Julia Ferreira",
                    "description": "R$28.5k - Milão sofa purchased. Delivery scheduled.",
                    "assignee": [{"id": "user-2", "name": "Sales Team", "avatarUrl": ""}],
                    "priority": "low",
                    "labels": ["Closed Won"],
                    "status": "won",
                    "reporter": {"id": "user-2", "name": "Sales Team"},
                    "attachments": [],
                    "comments": [],
                    "due": [None, None],
                },
            ],
        },
    }
}


@router.get("/kanban")
async def get_kanban_board():
    """Get kanban board with all columns and tasks"""
    return KANBAN_DATA
