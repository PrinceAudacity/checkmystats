from sqlalchemy import Column, String, Integer, Float, Text, ForeignKey, Table
from sqlalchemy.orm import relationship
from database import Base

# Association table — prerequisite edges between nodes
prerequisite_edges_table = Table(
    "prerequisites",
    Base.metadata,
    Column("node_id", String, ForeignKey("nodes.id"), primary_key=True),
    Column("prerequisite_id", String, ForeignKey("nodes.id"), primary_key=True),
)

# Association table — overlap edges (same skill in different domains)
overlap_edges_table = Table(
    "overlaps",
    Base.metadata,
    Column("node_id", String, ForeignKey("nodes.id"), primary_key=True),
    Column("overlap_id", String, ForeignKey("nodes.id"), primary_key=True),
)

class Node(Base):
    __tablename__ = "nodes"

    id = Column(String, primary_key=True, index=True)
    display_name = Column(String, nullable=False)
    summary = Column(Text, nullable=False)
    layer = Column(Integer, nullable=False)  # 1=Foundation 2=Domain 3=Professional 4=Outcome
    subject_category = Column(String, nullable=False)
    mastery_threshold = Column(Text, nullable=True)
    time_estimate_hours = Column(Float, nullable=True)
    assessment_count = Column(Integer, nullable=True)
    x = Column(Float, nullable=True)  # optional layout hint
    y = Column(Float, nullable=True)  # optional layout hint

    # Prerequisite edges (this node requires these nodes first)
    prerequisites = relationship(
        "Node",
        secondary=prerequisite_edges_table,
        primaryjoin=id == prerequisite_edges_table.c.node_id,
        secondaryjoin=id == prerequisite_edges_table.c.prerequisite_id,
        backref="unlocks"
    )

    # Overlap edges (this node shares skills with these nodes)
    overlaps = relationship(
        "Node",
        secondary=overlap_edges_table,
        primaryjoin=id == overlap_edges_table.c.node_id,
        secondaryjoin=id == overlap_edges_table.c.overlap_id,
    )
