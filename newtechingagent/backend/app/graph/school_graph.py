from __future__ import annotations

from langgraph.graph import END, StateGraph

from app.nodes.teachers import (
    advisor_node,
    biology_teacher_node,
    chemistry_teacher_node,
    chinese_teacher_node,
    economics_teacher_node,
    english_teacher_node,
    history_teacher_node,
    ict_teacher_node,
    math_teacher_node,
    physics_teacher_node,
    principal_router_node,
    principal_synthesize_node,
)
from app.state import SchoolState


def route_from_principal(state: SchoolState) -> str:
    route = state.get("route", "general")
    mapping = {
        "math": "math_teacher",
        "english": "english_teacher",
        "chinese": "chinese_teacher",
        "physics": "physics_teacher",
        "chemistry": "chemistry_teacher",
        "biology": "biology_teacher",
        "economics": "economics_teacher",
        "history": "history_teacher",
        "ict": "ict_teacher",
        "advisor": "advisor",
        "general": "principal_synthesize",
        "end": END,
    }
    return mapping.get(route, "principal_synthesize")


def build_school_graph():
    graph = StateGraph(SchoolState)

    graph.add_node("principal_router", principal_router_node)
    graph.add_node("math_teacher", math_teacher_node)
    graph.add_node("english_teacher", english_teacher_node)
    graph.add_node("chinese_teacher", chinese_teacher_node)
    graph.add_node("physics_teacher", physics_teacher_node)
    graph.add_node("chemistry_teacher", chemistry_teacher_node)
    graph.add_node("biology_teacher", biology_teacher_node)
    graph.add_node("economics_teacher", economics_teacher_node)
    graph.add_node("history_teacher", history_teacher_node)
    graph.add_node("ict_teacher", ict_teacher_node)
    graph.add_node("advisor", advisor_node)
    graph.add_node("principal_synthesize", principal_synthesize_node)

    graph.set_entry_point("principal_router")

    graph.add_conditional_edges(
        "principal_router",
        route_from_principal,
        {
            "math_teacher": "math_teacher",
            "english_teacher": "english_teacher",
            "chinese_teacher": "chinese_teacher",
            "physics_teacher": "physics_teacher",
            "chemistry_teacher": "chemistry_teacher",
            "biology_teacher": "biology_teacher",
            "economics_teacher": "economics_teacher",
            "history_teacher": "history_teacher",
            "ict_teacher": "ict_teacher",
            "advisor": "advisor",
            "principal_synthesize": "principal_synthesize",
            END: END,
        },
    )

    for teacher in [
        "math_teacher", "english_teacher", "chinese_teacher",
        "physics_teacher", "chemistry_teacher", "biology_teacher",
        "economics_teacher", "history_teacher", "ict_teacher", "advisor",
    ]:
        graph.add_edge(teacher, "principal_synthesize")

    graph.add_edge("principal_synthesize", END)

    return graph.compile()
