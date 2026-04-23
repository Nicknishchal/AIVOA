from __future__ import annotations
from typing import TypedDict, List
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode, tools_condition
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage, ToolMessage
from llm_service import get_llm
import json
import datetime
import re

# ─────────────────────────────────────────────
# State
# ─────────────────────────────────────────────
class AgentState(TypedDict):
    messages: list[BaseMessage]
    extracted_data: dict

# ─────────────────────────────────────────────
# Conversational CRM System Prompt
# ─────────────────────────────────────────────
SYSTEM_PROMPT = """\
You are an AI CRM assistant for a pharmaceutical field team.

You MUST ALWAYS return structured JSON. Never return plain text.

You support these actions:
  show_history, select_interaction, load_interaction,
  update_form, extract_new_interaction, ask_clarification

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INTENT DETECTION & RESPONSE FORMAT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. SHOW HISTORY
   Trigger: "show interactions / history / logs with Dr X" OR "recent interactions of Dr X"
   Response:
   {
     "action": "show_history",
     "hcp_name": "Dr X",
     "limit": 3,
     "message": "Here are the last interactions with Dr X."
   }
   Note: If user asks for "last 2", set limit: 2. Default is 3.

2. EDIT FLOW
   Trigger: "edit interactions of Dr X" OR "I want to edit Dr X's records"
   Response:
   {
     "action": "select_interaction",
     "hcp_name": "Dr X",
     "limit": 3,
     "message": "Which interaction would you like to edit?"
   }

3. SELECT INTERACTION (user picks from a presented list)
   Trigger: "latest", "first one", "second", "the third", "ID 5"
   The last shown interaction list will be in the conversation context.
   Map: "latest" / "first" => index 0, "second" => 1, "third" => 2.
   Response:
   {
     "action": "load_interaction",
     "interaction_index": 0
   }
   OR if user gives an explicit numeric ID:
   {
     "action": "load_interaction",
     "interaction_id": 42
   }

4. UPDATE FORM (user wants to change a field, no DB write)
   Trigger: "change sentiment to positive", "update notes to ...", "add topic oncology"
   Response:
   {
     "action": "update_form",
     "updates": {
       "sentiment": "Positive"
     },
     "message": "Updated sentiment to Positive. Review and save."
   }
   Only include changed fields. Valid fields:
   hcp_name, interaction_type, datetime, notes, topics, sentiment, summary, materials.

5. EXTRACT NEW INTERACTION (logging a brand-new visit)
   Trigger: User narrates a meeting/visit with clinical details.
   Response:
   EXTRACTED_DATA: {
     "hcp_name": "...",
     "interaction_type": "In-person"|"Virtual"|"Email"|"Phone",
     "datetime": "YYYY-MM-DDTHH:MM",
     "notes": "...",
     "materials": "brochures, samples",
     "sentiment": "Positive"|"Neutral"|"Negative",
     "topics": "comma, separated",
     "follow_ups": [{"action": "...", "due_date": "YYYY-MM-DD"}]
   }

6. CLARIFICATION
   Trigger: intent is ambiguous
   Response:
   {
     "action": "ask_clarification",
     "message": "Could you clarify which HCP or which interaction you mean?"
   }

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STRICT RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- NEVER call DB tools directly for show_history or select_interaction.
- NEVER return plain text. ALWAYS return JSON or EXTRACTED_DATA prefix.
- ALWAYS include "action" field in every JSON response.
- DO NOT guess interaction IDs. Use interaction_index (0-based) from the list context.
- For update_form: only include the fields the user actually wants to change.
- sentiment values MUST be exactly: "Positive", "Neutral", or "Negative" (capitalize).
- interaction_type MUST be: "In-person", "Virtual", "Email", or "Phone".
"""

# ─────────────────────────────────────────────
# LLM (no tools needed for this flow)
# ─────────────────────────────────────────────
llm = get_llm()

# ─────────────────────────────────────────────
# Agent node
# ─────────────────────────────────────────────
def call_model(state: AgentState):
    now = datetime.datetime.now()
    days_until_monday = (0 - now.weekday() + 7) % 7
    if days_until_monday == 0:
        days_until_monday = 7
    next_monday = now + datetime.timedelta(days=days_until_monday)

    current_context = (
        f"\n\nCURRENT_CONTEXT:\n"
        f"- Current Date/Time: {now.strftime('%Y-%m-%d %H:%M')}\n"
        f"- Current Day: {now.strftime('%A')}\n"
        f"- Next Monday: {next_monday.strftime('%Y-%m-%d')}"
    )

    messages = [SystemMessage(content=SYSTEM_PROMPT + current_context)] + state["messages"]
    response = llm.invoke(messages)
    return {"messages": [response]}

# ─────────────────────────────────────────────
# Graph (simple — no tool nodes needed)
# ─────────────────────────────────────────────
workflow = StateGraph(AgentState)
workflow.add_node("agent", call_model)
workflow.set_entry_point("agent")
workflow.add_edge("agent", END)
graph = workflow.compile()


# ─────────────────────────────────────────────
# JSON extraction helpers
# ─────────────────────────────────────────────
def _try_parse_json(text: str) -> dict | None:
    """Try to extract a JSON object from arbitrary text."""
    text = text.strip()
    # Strip markdown fences
    text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\s*```$", "", text)
    text = text.strip()
    try:
        obj = json.loads(text)
        if isinstance(obj, dict):
            return obj
    except Exception:
        pass
    # Try to find the first {...} block
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1:
        try:
            obj = json.loads(text[start:end + 1])
            if isinstance(obj, dict):
                return obj
        except Exception:
            pass
    return None


def _parse_extracted_data(text: str) -> dict | None:
    """Parse EXTRACTED_DATA: {...} format."""
    upper = text.upper()
    if "EXTRACTED_DATA:" not in upper:
        return None
    idx = upper.index("EXTRACTED_DATA:")
    after = text[idx + len("EXTRACTED_DATA:"):].strip()
    obj = _try_parse_json(after)
    if obj:
        if "topics" in obj and isinstance(obj["topics"], list):
            obj["topics"] = ", ".join(obj["topics"])
    return obj


# ─────────────────────────────────────────────
# Public entry point
# ─────────────────────────────────────────────
def run_agent(user_input: str, history: List[dict] = [], conversation_context: dict = None):
    """
    conversation_context may contain:
      - last_shown_interactions: list of {id, hcp_name, datetime, sentiment, notes}
      - selected_hcp: str
      - selected_interaction_id: int
    """
    # Build message history
    formatted_history = []
    for msg in history:
        if isinstance(msg, dict) and "role" in msg and "content" in msg:
            content = msg["content"]
            if msg["role"] == "user":
                formatted_history.append(HumanMessage(content=content))
            elif msg["role"] == "assistant":
                # Strip EXTRACTED_DATA from prior assistant messages to keep context clean
                clean = content.split("EXTRACTED_DATA:")[0].strip()
                formatted_history.append(AIMessage(content=clean))

    # Inject conversation context as a system reminder
    context_snippet = ""
    if conversation_context:
        parts = []
        if conversation_context.get("last_shown_interactions"):
            interactions_summary = json.dumps(
                conversation_context["last_shown_interactions"], indent=2
            )
            parts.append(
                f"LAST SHOWN INTERACTIONS (use these for index-based selection):\n{interactions_summary}"
            )
        if conversation_context.get("selected_hcp"):
            parts.append(f"CURRENT SELECTED HCP: {conversation_context['selected_hcp']}")
        if conversation_context.get("selected_interaction_id"):
            parts.append(
                f"CURRENT LOADED INTERACTION ID: {conversation_context['selected_interaction_id']}"
            )
        if parts:
            context_snippet = "\n\n[CONTEXT FROM UI STATE]\n" + "\n".join(parts)

    full_input = user_input
    if context_snippet:
        full_input = user_input + context_snippet

    initial_state = {
        "messages": formatted_history + [HumanMessage(content=full_input)],
        "extracted_data": {}
    }

    try:
        final_state = graph.invoke(initial_state, config={"recursion_limit": 20})

        # Get last AI message
        raw_content = ""
        for m in reversed(final_state["messages"]):
            if isinstance(m, AIMessage) and m.content:
                raw_content = m.content
                break

        if not raw_content:
            return {
                "response": "I processed your request but had nothing to return.",
                "extracted_data": None,
                "action": None,
            }

        # ── Try EXTRACTED_DATA format (new interaction logging)
        extracted = _parse_extracted_data(raw_content)
        if extracted:
            return {
                "response": raw_content,
                "extracted_data": extracted,
                "action": "extract_new_interaction",
            }

        # ── Try structured JSON action
        obj = _try_parse_json(raw_content)
        if obj and "action" in obj:
            action = obj["action"]
            message = obj.get("message", "")
            
            # Handle potential nested extraction
            extracted_nested = obj.get("EXTRACTED_DATA") or obj.get("extracted_data")
            if extracted_nested and action == "extract_new_interaction":
                if "topics" in extracted_nested and isinstance(extracted_nested["topics"], list):
                    extracted_nested["topics"] = ", ".join(extracted_nested["topics"])
                
                return {
                    "response": message or "I've extracted the following details for the new interaction. Please review and fill the form.",
                    "extracted_data": extracted_nested,
                    "action": action,
                    "action_data": obj,
                }

            return {
                "response": message or raw_content,
                "extracted_data": None,
                "action": action,
                "action_data": obj,   # full payload for frontend
            }

        # ── Fallback: plain text (shouldn't happen with strict prompt)
        return {
            "response": raw_content,
            "extracted_data": None,
            "action": None,
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        return {
            "response": f"An error occurred: {str(e)}",
            "extracted_data": None,
            "action": None,
        }
