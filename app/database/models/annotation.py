from sqlalchemy import (
    CheckConstraint,
    Column,
    Integer,
    String,
    Boolean,
    TIMESTAMP,
    JSON,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.hybrid import hybrid_property
from app.database.session import Base


class Annotation(Base):
    __tablename__ = "annotations"

    id = Column(Integer, primary_key=True)
    uid = Column(String(50), nullable=False, unique=True)
    target_content_id = Column(Integer)
    target_annotation_id = Column(Integer)
    user_id = Column(Integer, nullable=False)
    content = Column(
        JSONB,
        nullable=False,
        server_default=text("'{}'::jsonb"),
        comment="W3C annotation data",
    )
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
    is_deleted = Column(Boolean, default=False)

    # 生成列
    # motivation = Column(
    #     String(50),
    #     server_default=text("(content->>'motivation')"),
    #     comment="Generated from content->'motivation'",
    # )
    # comment_type = Column(
    #     String(7),
    #     server_default=text(
    #         """
    #         CASE
    #             WHEN target_annotation_id IS NOT NULL THEN 'reply'
    #             WHEN content @? '$.target.selector' THEN 'fragment'
    #             ELSE 'article'
    #         END
    #     """
    #     ),
    #     comment="Generated based on target type",
    # )

    __table_args__ = (
        CheckConstraint(
            "content @? '$' AND content @? '$.type' AND content @? '$.body' AND content @? '$.target'",
            name="check_w3c_data",
        ),
    )

    @hybrid_property
    def is_reply(self) -> bool:
        return self.comment_type == "reply"

    @hybrid_property
    def is_fragment(self) -> bool:
        return self.comment_type == "fragment"
