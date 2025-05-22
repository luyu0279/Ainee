from sqlalchemy import Column, Integer, ARRAY, CheckConstraint
from sqlalchemy.dialects.postgresql import ARRAY
from app.database.session import Base


class AnnotationRelations(Base):
    """
    注释关系表，用于管理注释之间的层次结构（如评论的回复关系）。
    该表支持快速查询注释树、获取路径和计算深度。

    典型使用场景：
    1. 构建注释的树形结构
    2. 查询某个注释的所有子注释
    3. 获取从根节点到当前注释的完整路径
    4. 计算注释在树中的深度

    注意：虽然移除了外键约束，但应用层需要确保parent_id和root_id指向有效的注释ID。
    """

    __tablename__ = "annotation_relations"

    annotation_id = Column(Integer, primary_key=True, doc="当前注释的唯一标识")
    parent_id = Column(Integer, doc="父注释的ID。如果为NULL，表示这是根节点")
    root_id = Column(Integer, doc="所在树的根节点ID。用于快速查找整棵树")
    depth = Column(Integer, nullable=False, doc="当前注释在树中的深度。根节点深度为1")
    path = Column(
        ARRAY(Integer), nullable=False, doc="从根节点到当前节点的路径，存储注释ID数组"
    )

    __table_args__ = (CheckConstraint("depth >= 1", name="check_depth"),)
