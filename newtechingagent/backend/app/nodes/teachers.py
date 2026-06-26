from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from app.agents.base import get_agent
from app.services.detectors import detect_subject, wants_study_advice


def _log(agent: str, summary: str) -> dict:
    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "agent": agent,
        "summary": summary,
    }


def _history(state: dict) -> list[dict[str, str]]:
    return state.get("conversation_history", [])


def _append_turn(state: dict, user_msg: str | None, assistant_msg: str) -> list[dict[str, str]]:
    history = list(_history(state))
    if user_msg:
        history.append({"role": "user", "content": user_msg})
    history.append({"role": "assistant", "content": assistant_msg})
    return history[-20:]


def principal_router_node(state: dict) -> dict:
    message = state.get("student_message", "")
    subject = detect_subject(message)

    if subject == "general" and wants_study_advice(message):
        route = "advisor"
    else:
        route = subject

    agent = get_agent("principal")
    agent.run(
        f"內部路由：學生訊息「{message[:80]}」→ 科目={subject}，路由至 {route}。請輸出10字內備註。",
        context={"detected_subject": subject, "route": route},
        extra_instructions="這是內部路由，只需10字備註。",
        fallback=f"路由至{route}",
    )

    return {
        **state,
        "detected_subject": subject,
        "route": route,
        "progress_stage": "routing",
        "active_agents": ["校長"],
        "case_log": [_log("校長", f"偵測科目：{subject}，路由至：{route}")],
    }


def _make_teacher_node(agent_id: str, teacher_name: str, subject: str, fallback_text: str):
    def node(state: dict) -> dict:
        message = state.get("student_message", "")
        context = state.get("learning_context", {})
        agent = get_agent(agent_id)
        reply = agent.run(
            message,
            context={"learning_context": context, "subject": subject},
            history=_history(state),
            fallback=fallback_text,
        )
        history = _append_turn(state, message, reply)
        lc = dict(context)
        lc.setdefault("topics_covered", [])
        lc["last_subject"] = subject
        lc["last_teacher"] = teacher_name
        return {
            **state,
            "final_response": reply,
            "current_teacher": teacher_name,
            "conversation_history": history,
            "learning_context": lc,
            "progress_stage": "teaching",
            "active_agents": [teacher_name],
            "case_log": [_log(teacher_name, f"回答關於{subject}的問題")],
        }
    node.__name__ = f"{agent_id}_node"
    return node


math_teacher_node = _make_teacher_node(
    "math_teacher",
    "數學老師陳博士",
    "math",
    "你好！我係陳博士，HKDSE數學專科老師。\n\n"
    "數學最緊要係理解概念，唔係死記公式。\n\n"
    "請問你而家係邊個範疇有困難？係代數、幾何、微積分定係統計？\n"
    "你可以直接貼上題目，我會一步步幫你分析。",
)

english_teacher_node = _make_teacher_node(
    "english_teacher",
    "英文老師Miss Wong",
    "english",
    "Hello! I'm Miss Wong, your HKDSE English Language specialist.\n\n"
    "Good English requires practice in all four skills: Reading, Writing, Listening, and Speaking.\n\n"
    "What would you like to work on today? You can share an essay for feedback, "
    "ask about grammar rules, or practice comprehension strategies.",
)

chinese_teacher_node = _make_teacher_node(
    "chinese_teacher",
    "中文老師李老師",
    "chinese",
    "你好！我係李老師，HKDSE中國語文科專科老師。\n\n"
    "中文科範圍廣泛，包括閱讀、寫作、說話同聆聽。\n\n"
    "你今日想練習邊部分？係作文技巧、閱讀理解、文言文解析，定係說話表達技巧？",
)

physics_teacher_node = _make_teacher_node(
    "physics_teacher",
    "物理老師張博士",
    "physics",
    "你好！我係張博士，HKDSE物理科專科老師。\n\n"
    "物理係理解自然規律嘅學問，概念環環相扣。\n\n"
    "你而家係邊個範疇有困難？力學、波動、電學、光學定係現代物理？\n"
    "請直接描述你嘅問題，或者貼上題目，我會用圖解方式幫你分析。",
)

chemistry_teacher_node = _make_teacher_node(
    "chemistry_teacher",
    "化學老師林老師",
    "chemistry",
    "你好！我係林老師，HKDSE化學科專科老師。\n\n"
    "化學係研究物質及其變化嘅科學，需要理解微觀同宏觀兩個層面。\n\n"
    "你今日想搞清楚邊個範疇？有機化學、無機化學、氧化還原反應，定係化學計算？",
)

biology_teacher_node = _make_teacher_node(
    "biology_teacher",
    "生物老師吳老師",
    "biology",
    "你好！我係吳老師，HKDSE生物科專科老師。\n\n"
    "生物係研究生命嘅科學，由細胞到生態系統都有涉獵。\n\n"
    "你而家係邊個範疇有困難？細胞生物學、遺傳學、生態學，定係人體生理學？\n"
    "請問你嘅具體問題，我會用清晰圖解幫你理解。",
)

economics_teacher_node = _make_teacher_node(
    "economics_teacher",
    "經濟老師黃老師",
    "economics",
    "你好！我係黃老師，HKDSE經濟科專科老師。\n\n"
    "經濟學分析人類如何在資源有限嘅情況下作出決策。\n\n"
    "你今日想討論邊個範疇？微觀經濟（個別市場分析）定係宏觀經濟（整體經濟政策）？\n"
    "請分享你嘅問題，我會結合香港實例幫你理解。",
)

history_teacher_node = _make_teacher_node(
    "history_teacher",
    "歷史老師鄭老師",
    "history",
    "你好！我係鄭老師，HKDSE歷史科專科老師。\n\n"
    "歷史唔只係記憶日期，更重要係理解事件背後嘅因果關係。\n\n"
    "HKDSE歷史科主要涵蓋20世紀嘅中國同世界歷史。\n"
    "你而家係邊個時期或主題有困難？",
)

ict_teacher_node = _make_teacher_node(
    "ict_teacher",
    "資訊科技老師何老師",
    "ict",
    "你好！我係何老師，HKDSE資訊及通訊科技科（ICT）專科老師。\n\n"
    "ICT涵蓋電腦科學基礎、程式設計、網絡、資料庫同試算表應用。\n\n"
    "你今日想學邊方面？算法設計、Python程式設計、網絡知識，定係試算表Excel技巧？",
)


def advisor_node(state: dict) -> dict:
    message = state.get("student_message", "")
    context = state.get("learning_context", {})
    agent = get_agent("advisor")
    fallback = (
        "你好！我係Miss Chan，智學坊學務主任。\n\n"
        "我可以幫你制定個人化讀書計劃、分析你嘅弱項科目，同埋提供DSE備考策略。\n\n"
        "請問你而家面對乜嘢挑戰？係時間管理、唔知點分配溫習時間，定係某科目持續不理想？\n\n"
        "**DSE備考小貼士：**\n"
        "- 建議每日最少溫習3-4小時\n"
        "- 每個科目要分配時間做Past Papers\n"
        "- 弱項科目要集中攻克，強項科目要保持\n"
        "- 適當休息同運動都係成功關鍵"
    )
    reply = agent.run(
        message,
        context={"learning_context": context},
        history=_history(state),
        fallback=fallback,
    )
    history = _append_turn(state, message, reply)
    return {
        **state,
        "final_response": reply,
        "current_teacher": "學務主任Miss Chan",
        "conversation_history": history,
        "progress_stage": "teaching",
        "active_agents": ["學務主任Miss Chan"],
        "case_log": [_log("學務主任Miss Chan", "提供學習建議")],
    }


def principal_synthesize_node(state: dict) -> dict:
    if state.get("final_response"):
        return {**state, "progress_stage": "done"}

    message = state.get("student_message", "")
    subject = state.get("detected_subject", "general")
    agent = get_agent("principal")

    subject_map = {
        "math": "數學科（請問數學問題，例如：方程、微積分、統計）",
        "english": "英文科（請問英文問題，例如：文法、寫作、閱讀）",
        "chinese": "中文科（請問中文問題，例如：作文、文言文、閱讀理解）",
        "physics": "物理科（請問物理問題，例如：力學、電學、光學）",
        "chemistry": "化學科（請問化學問題，例如：有機化學、氧化還原）",
        "biology": "生物科（請問生物問題，例如：細胞、遺傳、生態）",
        "economics": "經濟科（請問經濟問題，例如：供求、宏觀、微觀）",
        "history": "歷史科（請問歷史問題，例如：20世紀、殖民、戰爭）",
        "ict": "資訊科技科（請問ICT問題，例如：算法、程式、網絡）",
    }

    subjects_list = "\n".join([f"- {v}" for v in subject_map.values()])
    fallback = (
        f"你好！歡迎來到智學坊 AI School！我係校長，負責為你安排最合適嘅老師。\n\n"
        f"我哋提供以下HKDSE科目輔導：\n{subjects_list}\n\n"
        f"請問你需要邊個科目嘅幫助？你可以直接問問題，例如「幫我解一條數學方程」或者「解釋英文時態」。"
    )

    reply = agent.run(
        message,
        context={"detected_subject": subject, "available_subjects": list(subject_map.keys())},
        history=_history(state),
        extra_instructions="如果搵唔到科目，用廣東話友善地引導學生說明佢需要乜嘢科目幫助。",
        fallback=fallback,
    )
    history = _append_turn(state, message, reply)
    return {
        **state,
        "final_response": reply,
        "current_teacher": "校長",
        "conversation_history": history,
        "progress_stage": "done",
        "active_agents": ["校長"],
        "case_log": [_log("校長", "回覆一般查詢")],
    }
