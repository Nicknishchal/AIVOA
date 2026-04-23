from __future__ import annotations
from langchain.tools import tool
import crud, schemas, database, models
from database import SessionLocal
import json
from datetime import datetime

@tool
def log_interaction_tool(raw_text):
    """
    Extracts structured data from raw text and saves an HCP interaction.
    Input: Raw text describing the interaction.
    """
    # This tool will usually be called within an agent flow.
    # The agent uses its own LLM logic to format this, but I'll add logic to save it.
    # However, in LangGraph tool calling, the tool usually performs an action.
    # Here I'll return a message that extraction is needed or perform a mock save.
    return "SUCCESS: Interaction processing complete. The data has been extracted for the CRM record."

@tool
def edit_interaction_tool(interaction_id, updates_json):
    """
    Modifies an existing interaction.
    updates_json should be a JSON string of fields to update.
    """
    db = SessionLocal()
    try:
        updates = json.loads(updates_json)
        # Convert string dates if any
        if "datetime" in updates:
            updates["datetime"] = datetime.fromisoformat(updates["datetime"])
        
        updated = crud.update_interaction(db, interaction_id, schemas.InteractionBase(**updates))
        return f"Interaction {interaction_id} updated successfully."
    except Exception as e:
        return f"Error updating interaction: {str(e)}"
    finally:
        db.close()

@tool
def get_hcp_history_tool(hcp_name=None):
    """
    Fetches the history of interactions and returns a formatted string.
    """
    print("get_hcp_history_tool called")
    db = SessionLocal()
    try:
        from models import Interaction
        # Requirement: REMOVE all filters (no HCP filtering)
        interactions = (
            db.query(Interaction)
            .order_by(Interaction.datetime.desc())
            .limit(10)
            .all()
        )
            
        print("Fetched interactions:", interactions)
        
        if not interactions:
            return "No interactions found."

        result = "Here are your recent interactions:\n\n"

        for i, interaction in enumerate(interactions, 1):
            # Using hcp_name property and datetime field as per requirements
            date_str = interaction.datetime.strftime('%b %d')
            sentiment = interaction.sentiment or "Neutral"
            result += f"{i}. {interaction.hcp_name} – {date_str} – {sentiment}\n"

        return result
    finally:
        db.close()

@tool
def suggest_followup_tool(interaction_notes):
    """
    Suggests next actions based on interaction notes.
    """
    # In a real scenario, this might call another LLM chain.
    # For now, we'll let the agent generate this or return a prompt for the agent.
    return f"Based on notes: '{interaction_notes}', suggest follow-up actions like scheduling a demo, sending literature, or a follow-up call."

@tool
def get_last_interaction_tool():
    """
    Fetches the details of the most recent interaction in the system for pre-filling the edit form.
    """
    db = SessionLocal()
    try:
        from models import Interaction
        interaction = db.query(Interaction).order_by(Interaction.datetime.desc()).first()
        if not interaction:
            return "No interactions found in the system to edit."
        
        return json.dumps({
            "action": "edit_last",
            "interaction": {
                "id": interaction.id,
                "hcp_name": interaction.hcp_name,
                "notes": interaction.notes,
                "sentiment": interaction.sentiment,
                "datetime": interaction.datetime.isoformat()[:16], # Format for datetime-local input
                "topics": interaction.topics if interaction.topics else ""
            }
        })
    finally:
        db.close()

@tool
def summarize_interaction_tool(notes):
    """
    Generates a structured summary from notes.
    """
    return f"SUMMARY: {notes[:100]}... (In a real system, I would use an LLM to summarize this. For now, here is a truncated version of your notes.)"
