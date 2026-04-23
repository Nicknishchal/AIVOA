from sqlalchemy.orm import Session
import models, schemas
from datetime import datetime

from sqlalchemy import func

def get_hcp_by_name(db: Session, name: str):
    return db.query(models.HCP).filter(func.lower(models.HCP.name) == func.lower(name)).first()

def create_hcp(db: Session, hcp: schemas.HCPCreate):
    db_hcp = models.HCP(name=hcp.name)
    db.add(db_hcp)
    db.commit()
    db.refresh(db_hcp)
    return db_hcp

def create_interaction(db: Session, interaction: schemas.InteractionCreate):
    # Find or create HCP
    hcp = get_hcp_by_name(db, interaction.hcp_name)
    if not hcp:
        hcp = create_hcp(db, schemas.HCPCreate(name=interaction.hcp_name))
    
    topics_str = interaction.topics
    if isinstance(topics_str, list):
        topics_str = ", ".join(topics_str)
    
    db_interaction = models.Interaction(
        hcp_id=hcp.id,
        interaction_type=interaction.interaction_type,
        datetime=interaction.datetime,
        notes=interaction.notes,
        topics=topics_str,
        sentiment=interaction.sentiment,
        summary=interaction.summary,
        materials=interaction.materials,
    )
    db.add(db_interaction)
    db.commit()
    db.refresh(db_interaction)
    
    for fu in interaction.follow_ups:
        db_fu = models.FollowUp(**fu.dict(), interaction_id=db_interaction.id)
        db.add(db_fu)
    
    db.commit()
    db.refresh(db_interaction)
    return db_interaction

from sqlalchemy import desc

def get_interactions(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Interaction).order_by(desc(models.Interaction.datetime)).offset(skip).limit(limit).all()

def get_hcp_history(db: Session, hcp_name: str):
    hcp = get_hcp_by_name(db, hcp_name)
    if not hcp:
        # Fallback: partial case-insensitive match (e.g. "Dr Kapil" -> "Kapil")
        hcp = db.query(models.HCP).filter(
            func.lower(models.HCP.name).contains(func.lower(hcp_name.replace("Dr ", "").replace("Dr.", "").strip()))
        ).first()
    if not hcp:
        return []
    return db.query(models.Interaction).filter(models.Interaction.hcp_id == hcp.id).order_by(desc(models.Interaction.datetime)).all()

def update_interaction(db: Session, interaction_id: int, interaction: schemas.InteractionBase):
    db_interaction = db.query(models.Interaction).filter(models.Interaction.id == interaction_id).first()
    if db_interaction:
        # Update HCP name if provided
        if interaction.hcp_name:
            hcp = db.query(models.HCP).filter(models.HCP.id == db_interaction.hcp_id).first()
            if hcp:
                hcp.name = interaction.hcp_name
                db.add(hcp)

        # Update interaction fields
        update_data = interaction.dict(exclude_unset=True)
        # Topics handling (ensure string if list is passed)
        if 'topics' in update_data and isinstance(update_data['topics'], list):
            update_data['topics'] = ", ".join(update_data['topics'])
            
        for key, value in update_data.items():
            if key != 'hcp_name': # Handled separately above
                setattr(db_interaction, key, value)
        
        db.commit()
        db.refresh(db_interaction)
    return db_interaction
