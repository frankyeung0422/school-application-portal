from __future__ import annotations

SUBJECT_KEYWORDS: dict[str, list[str]] = {
    "math": [
        "數學", "方程", "積分", "微分", "algebra", "equation", "integral",
        "differentiation", "sin", "cos", "tan", "matrix", "vector",
        "probability", "statistics", "M1", "M2", "calculus", "幾何",
        "三角", "logarithm", "對數", "二次", "quadratic", "binomial",
    ],
    "english": [
        "english", "grammar", "vocabulary", "essay", "composition",
        "reading", "comprehension", "tense", "pronunciation", "ielts",
        "writing", "listening", "speaking", "past tense", "passive",
        "article", "preposition", "conjunction",
    ],
    "chinese": [
        "中文", "語文", "作文", "古詩", "閱讀理解", "成語", "文言文",
        "說話", "聆聽", "普通話", "粵語", "修辭", "比喻", "排比",
        "詞語", "語法", "標點", "白話文",
    ],
    "physics": [
        "物理", "力學", "force", "velocity", "acceleration", "energy",
        "momentum", "wave", "electricity", "magnetic", "quantum", "Newton",
        "gravity", "friction", "pressure", "光學", "聲波", "電路",
        "電壓", "電流", "resistance", "refraction", "reflection",
    ],
    "chemistry": [
        "化學", "元素", "molecule", "reaction", "acid", "base",
        "oxidation", "reduction", "titration", "organic", "bonding",
        "mole", "periodic", "electron", "ion", "酸", "鹼", "鹽",
        "氧化", "還原", "有機", "無機", "化合物",
    ],
    "biology": [
        "生物", "cell", "細胞", "DNA", "genetics", "遺傳", "ecosystem",
        "生態", "photosynthesis", "respiration", "enzyme", "protein",
        "chromosome", "evolution", "bacteria", "virus", "nervous",
        "mitosis", "meiosis", "光合作用", "呼吸作用",
    ],
    "economics": [
        "經濟", "supply", "demand", "供求", "elasticity", "GDP",
        "inflation", "monopoly", "market", "price", "opportunity cost",
        "微觀", "宏觀", "micro", "macro", "competition", "subsidy",
        "tax", "trade", "exchange rate", "unemployment", "fiscal",
    ],
    "history": [
        "歷史", "dynasty", "朝代", "war", "revolution", "colonial",
        "1997", "19th century", "20th century", "WWI", "WWII",
        "China", "英國", "殖民", "革命", "戰爭", "冷戰", "Cold War",
        "nationalism", "imperialism", "明朝", "清朝", "民國",
    ],
    "ict": [
        "電腦", "computer", "algorithm", "network", "database",
        "spreadsheet", "programming", "binary", "code", "internet",
        "cybersecurity", "HTML", "Python", "Excel", "data",
        "sorting", "searching", "loop", "function", "variable",
        "encryption", "protocol", "IP", "router",
    ],
}

ADVICE_KEYWORDS = [
    "讀書計劃", "study plan", "時間表", "timetable", "motivated",
    "放棄", "好難", "唔識", "壓力", "anxiety", "stress", "dse tips",
    "進度", "progress", "點讀", "溫書",
]


def detect_subject(message: str) -> str:
    msg_lower = message.lower()
    scores: dict[str, int] = {}
    for subject, keywords in SUBJECT_KEYWORDS.items():
        count = sum(1 for kw in keywords if kw.lower() in msg_lower)
        if count > 0:
            scores[subject] = count
    if not scores:
        return "general"
    return max(scores, key=lambda s: scores[s])


def wants_study_advice(message: str) -> bool:
    msg_lower = message.lower()
    return any(kw.lower() in msg_lower for kw in ADVICE_KEYWORDS)
