from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from database import Base
import datetime

class HCP(Base):
    __tablename__ = "hcps"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)

    interactions = relationship("Interaction", back_populates="hcp")

class Interaction(Base):
    __tablename__ = "interactions"

    id = Column(Integer, primary_key=True, index=True)
    hcp_id = Column(Integer, ForeignKey("hcps.id"))
    datetime = Column(DateTime, default=datetime.datetime.utcnow)
    interaction_type = Column(String) # e.g., In-person, Virtual, Call
    notes = Column(Text)
    topics = Column(String) # Comma separated topics
    sentiment = Column(String) # Positive, Neutral, Negative
    summary = Column(Text)
    materials = Column(String, nullable=True) # e.g., brochures, samples

    hcp = relationship("HCP", back_populates="interactions")
    follow_ups = relationship("FollowUp", back_populates="interaction")

    @property
    def hcp_name(self):
        return self.hcp.name if self.hcp else None

class FollowUp(Base):
    __tablename__ = "follow_ups"

    id = Column(Integer, primary_key=True, index=True)
    interaction_id = Column(Integer, ForeignKey("interactions.id"))
    action = Column(String)
    due_date = Column(DateTime, nullable=True)

    interaction = relationship("Interaction", back_populates="follow_ups")
