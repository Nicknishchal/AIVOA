from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
import models, schemas, crud, database, agent
from database import engine, get_db

# Create tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="HCP Interaction CRM API")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "HCP CRM Backend is running"}


# ── Chat endpoint ──────────────────────────────────────────────
@app.post("/chat", response_model=schemas.ChatResponse)
async def chat_with_agent(message_data: schemas.ChatMessage):
    try:
        ctx = None
        if message_data.conversation_context:
            ctx = message_data.conversation_context.dict(exclude_none=True)

        result = agent.run_agent(
            message_data.message,
            message_data.history,
            conversation_context=ctx
        )
        return schemas.ChatResponse(
            response=result["response"],
            extracted_data=result.get("extracted_data"),
            action=result.get("action"),
            action_data=result.get("action_data"),
        )
    except Exception as e:
        import traceback
        print(f"Error in /chat: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


# ── Interaction CRUD ───────────────────────────────────────────
@app.post("/log-interaction", response_model=schemas.InteractionSchema)
def log_interaction(interaction: schemas.InteractionCreate, db: Session = Depends(get_db)):
    try:
        return crud.create_interaction(db, interaction)
    except Exception as e:
        print(f"Error in /log-interaction: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/interaction/{interaction_id}", response_model=schemas.InteractionSchema)
def get_interaction(interaction_id: int, db: Session = Depends(get_db)):
    """Load a single interaction by ID (used by load_interaction action)."""
    item = db.query(models.Interaction).filter(models.Interaction.id == interaction_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Interaction not found")
    return item


@app.put("/interaction/{interaction_id}", response_model=schemas.InteractionSchema)
def update_interaction(
    interaction_id: int,
    interaction: schemas.InteractionBase,
    db: Session = Depends(get_db)
):
    db_interaction = crud.update_interaction(db, interaction_id, interaction)
    if not db_interaction:
        raise HTTPException(status_code=404, detail="Interaction not found")
    return db_interaction


@app.get("/hcp-history/{hcp_name}", response_model=List[schemas.InteractionSchema])
def get_hcp_history(hcp_name: str, db: Session = Depends(get_db)):
    return crud.get_hcp_history(db, hcp_name)


@app.get("/interactions", response_model=List[schemas.InteractionSchema])
def get_interactions(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_interactions(db, skip=skip, limit=limit)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
