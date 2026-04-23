from pydantic import BaseModel, Field
import datetime as dt
from typing import List, Union, Optional, Any

class FollowUpBase(BaseModel):
    action: str
    due_date: Optional[dt.datetime] = None

class FollowUpCreate(FollowUpBase):
    pass

class FollowUpSchema(FollowUpBase):
    id: int
    interaction_id: int

    class Config:
        from_attributes = True

class InteractionBase(BaseModel):
    hcp_id: Optional[int] = None
    hcp_name: Optional[str] = None
    interaction_type: Optional[str] = None
    datetime: dt.datetime = Field(default_factory=dt.datetime.now)
    notes: Optional[str] = None
    topics: Optional[Union[str, List[str]]] = None
    sentiment: Optional[str] = None
    summary: Optional[str] = None
    materials: Optional[str] = None

class InteractionCreate(InteractionBase):
    follow_ups: list[FollowUpCreate] = []

class InteractionSchema(InteractionBase):
    id: int
    hcp_name: Optional[str] = None
    follow_ups: list[FollowUpSchema] = []

    class Config:
        from_attributes = True

class HCPBase(BaseModel):
    name: str

class HCPCreate(HCPBase):
    pass

class HCPSchema(HCPBase):
    id: int
    interactions: list[InteractionSchema] = []

    class Config:
        from_attributes = True

# ─── Chat schemas ───────────────────────────────────────────────

class ConversationContext(BaseModel):
    """UI state sent alongside each chat message for context."""
    last_shown_interactions: Optional[List[dict]] = None
    selected_hcp: Optional[str] = None
    selected_interaction_id: Optional[int] = None

class ChatMessage(BaseModel):
    message: str
    history: Optional[List[dict]] = []
    conversation_context: Optional[ConversationContext] = None

class ChatResponse(BaseModel):
    response: str
    extracted_data: Optional[dict] = None
    action: Optional[str] = None
    action_data: Optional[Any] = None      # full structured payload for the frontend
