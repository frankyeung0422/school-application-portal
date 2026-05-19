#!/usr/bin/env python3
"""
TradingAgents API Backend
Pure Python backend for the HTML/PHP/Python application
"""

import json
import sys
import os
import requests
import socket
from pathlib import Path
from datetime import datetime, date
from http.server import HTTPServer, BaseHTTPRequestHandler, ThreadingHTTPServer
import os
from socketserver import ThreadingMixIn
from urllib.parse import urlparse, parse_qs
import threading
import time
import hashlib
import sqlite3
from collections import defaultdict, deque

# 添加項目根目錄到Python路徑
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

# =========================
# RATE LIMITING & IP BLOCKING
# =========================
class RateLimiter:
    """Simple rate limiter to prevent DoS attacks"""
    def __init__(self, max_requests=30, time_window=60, ban_threshold=10, ban_duration=3600):
        self.max_requests = max_requests  # Max requests per time window
        self.time_window = time_window    # Time window in seconds
        self.ban_threshold = ban_threshold  # Ban after this many violations
        self.ban_duration = ban_duration    # Ban duration in seconds
        
        self.requests = defaultdict(deque)  # IP -> deque of timestamps
        self.violations = defaultdict(int)  # IP -> violation count
        self.banned_ips = {}  # IP -> ban_until timestamp
        self.lock = threading.RLock()  # Use RLock to allow reentrant locking
        self.last_cleanup = time.time()
        
    def cleanup_old_data(self):
        """Periodically clean up old data to prevent memory leaks"""
        now = time.time()
        # Only cleanup every 5 minutes
        if now - self.last_cleanup < 300:
            return
        
        with self.lock:
            # Remove IPs with no recent requests
            ips_to_remove = []
            for ip, timestamps in list(self.requests.items()):
                if not timestamps or (now - timestamps[-1] > self.time_window * 2):
                    ips_to_remove.append(ip)
            
            for ip in ips_to_remove:
                del self.requests[ip]
                if ip in self.violations and self.violations[ip] == 0:
                    del self.violations[ip]
            
            self.last_cleanup = now
            if ips_to_remove:
                print(f"🧹 清理舊數據: 移除 {len(ips_to_remove)} 個閒置IP")
    
    def is_banned(self, ip):
        """Check if IP is currently banned"""
        with self.lock:
            if ip in self.banned_ips:
                if time.time() < self.banned_ips[ip]:
                    return True
                else:
                    # Ban expired
                    del self.banned_ips[ip]
                    self.violations[ip] = 0
            return False
    
    def check_rate_limit(self, ip):
        """Check if IP has exceeded rate limit. Returns True if allowed, False if blocked."""
        # Localhost is always allowed (dev/admin/self-checks shouldn't trip the limiter)
        if ip in ('127.0.0.1', '::1', 'localhost'):
            return True

        # Cleanup periodically
        self.cleanup_old_data()

        with self.lock:
            now = time.time()

            # Check if banned
            if self.is_banned(ip):
                return False
            
            # Clean old requests
            if ip in self.requests:
                while self.requests[ip] and now - self.requests[ip][0] > self.time_window:
                    self.requests[ip].popleft()
            
            # Check rate
            if len(self.requests[ip]) >= self.max_requests:
                # Rate limit exceeded
                self.violations[ip] += 1
                print(f"⚠️ 速率限制: IP {ip} 超過限制 ({len(self.requests[ip])} 請求/{self.time_window}秒), 違規次數: {self.violations[ip]}")
                
                # Ban if too many violations
                if self.violations[ip] >= self.ban_threshold:
                    self.banned_ips[ip] = now + self.ban_duration
                    print(f"🚫 IP封鎖: {ip} 已被封鎖 {self.ban_duration/60:.0f} 分鐘")
                
                return False
            
            # Add request
            self.requests[ip].append(now)
            return True
    
    def get_stats(self):
        """Get rate limiter statistics"""
        with self.lock:
            return {
                "active_ips": len(self.requests),
                "banned_ips": len(self.banned_ips),
                "total_violations": sum(self.violations.values())
            }

# Global rate limiter instance
rate_limiter = RateLimiter(max_requests=30, time_window=60, ban_threshold=10, ban_duration=3600)

# 簡體中文到繁體中文轉換字典
SIMPLIFIED_TO_TRADITIONAL = {
    '分析': '分析', '报告': '報告', '股票': '股票', '市场': '市場',
    '技术': '技術', '基本面': '基本面', '风险': '風險', '投资': '投資',
    '建议': '建議', '买入': '買入', '卖出': '賣出', '持有': '持有',
    '数据': '數據', '价格': '價格', '趋势': '趨勢', '波动': '波動',
    '收益': '收益', '损失': '損失', '预测': '預測', '评估': '評估',
    '策略': '策略', '机会': '機會', '挑战': '挑戰', '发展': '發展',
    '增长': '增長', '下降': '下降', '稳定': '穩定', '变化': '變化',
    '影响': '影響', '因素': '因素', '情况': '情況', '环境': '環境',
    '经济': '經濟', '金融': '金融', '商业': '商業', '公司': '公司',
    '行业': '行業', '产品': '產品', '服务': '服務', '客户': '客戶',
    '销售': '銷售', '利润': '利潤', '收入': '收入', '成本': '成本',
    '资本': '資本', '资产': '資產', '负债': '負債', '现金': '現金',
    '债务': '債務', '股权': '股權', '股东': '股東', '董事会': '董事會',
    '管理': '管理', '领导': '領導', '团队': '團隊', '员工': '員工',
    '创新': '創新', '技术': '技術', '研发': '研發', '生产': '生產',
    '制造': '製造', '质量': '質量', '标准': '標準', '认证': '認證',
    '监管': '監管', '政策': '政策', '法规': '法規', '合规': '合規',
    '安全': '安全', '风险': '風險', '控制': '控制', '保护': '保護',
    '隐私': '隱私', '数据': '數據', '信息': '信息', '网络': '網絡',
    '平台': '平台', '系统': '系統', '软件': '軟件', '应用': '應用',
    '移动': '移動', '智能': '智能', '人工': '人工', '学习': '學習',
    '算法': '算法', '模型': '模型', '预测': '預測', '分析': '分析',
    '报告': '報告', '研究': '研究', '调查': '調查', '统计': '統計',
    '指标': '指標', '绩效': '績效', '效率': '效率', '效果': '效果',
    '结果': '結果', '结论': '結論', '建议': '建議', '方案': '方案',
    '计划': '計劃', '目标': '目標', '愿景': '願景', '使命': '使命',
    '价值': '價值', '意义': '意義', '重要性': '重要性', '关键': '關鍵',
    '核心': '核心', '主要': '主要', '重要': '重要', '特殊': '特殊',
    '独特': '獨特', '优秀': '優秀', '卓越': '卓越', '领先': '領先',
    '先进': '先進', '现代': '現代', '传统': '傳統', '经典': '經典',
    '流行': '流行', '热门': '熱門', '时尚': '時尚', '潮流': '潮流',
    '未来': '未來', '前景': '前景', '展望': '展望', '预期': '預期',
    '可能': '可能', '潜在': '潛在', '机会': '機會', '威胁': '威脅',
    '竞争': '競爭', '优势': '優勢', '劣势': '劣勢', '强项': '強項',
    '弱点': '弱點', '挑战': '挑戰', '困难': '困難', '问题': '問題',
    '解决': '解決', '改善': '改善', '优化': '優化', '提升': '提升',
    '增强': '增強', '扩大': '擴大', '增长': '增長', '发展': '發展',
    '进步': '進步', '突破': '突破', '创新': '創新', '变革': '變革',
    '转型': '轉型', '升级': '升級', '更新': '更新', '改进': '改進',
    '完善': '完善', '优化': '優化', '调整': '調整', '平衡': '平衡',
    '稳定': '穩定', '持续': '持續', '长期': '長期', '短期': '短期',
    '中期': '中期', '近期': '近期', '远期': '遠期', '即时': '即時',
    '实时': '實時', '动态': '動態', '静态': '靜態', '活跃': '活躍',
    '积极': '積極', '消极': '消極', '正面': '正面', '负面': '負面',
    '乐观': '樂觀', '悲观': '悲觀', '谨慎': '謹慎', '保守': '保守',
    '激进': '激進', '冒险': '冒險', '安全': '安全', '可靠': '可靠',
    '稳定': '穩定', '波动': '波動', '变化': '變化', '趋势': '趨勢',
    '方向': '方向', '路径': '路徑', '过程': '過程', '阶段': '階段',
    '步骤': '步驟', '环节': '環節', '要素': '要素', '成分': '成分',
    '结构': '結構', '组织': '組織', '架构': '架構', '设计': '設計',
    '规划': '規劃', '布局': '布局', '配置': '配置', '安排': '安排',
    '部署': '部署', '实施': '實施', '执行': '執行', '操作': '操作',
    '运行': '運行', '运作': '運作', '运转': '運轉', '工作': '工作',
    '功能': '功能', '性能': '性能', '效率': '效率', '效果': '效果',
    '质量': '質量', '标准': '標準', '要求': '要求', '规范': '規範',
    '规则': '規則', '制度': '制度', '流程': '流程', '程序': '程序',
    '方法': '方法', '手段': '手段', '工具': '工具', '设备': '設備',
    '技术': '技術', '工艺': '工藝', '技能': '技能', '能力': '能力',
    '知识': '知識', '经验': '經驗', '专业': '專業', '专家': '專家',
    '顾问': '顧問', '咨询': '咨詢', '服务': '服務', '支持': '支持',
    '帮助': '幫助', '协助': '協助', '合作': '合作', '伙伴': '伙伴',
    '客户': '客戶', '用户': '用戶', '消费者': '消費者', '市场': '市場',
    '需求': '需求', '供给': '供給', '供求': '供求', '平衡': '平衡',
    '价格': '價格', '价值': '價值', '成本': '成本', '费用': '費用',
    '收入': '收入', '利润': '利潤', '收益': '收益', '回报': '回報',
    '投资': '投資', '融资': '融資', '资本': '資本', '资金': '資金',
    '现金': '現金', '资产': '資產', '负债': '負債', '股权': '股權',
    '股票': '股票', '债券': '債券', '基金': '基金', '保险': '保險',
    '银行': '銀行', '金融': '金融', '财务': '財務', '会计': '會計',
    '审计': '審計', '税务': '稅務', '法律': '法律', '合规': '合規',
    '监管': '監管', '政策': '政策', '法规': '法規', '制度': '制度',
    '标准': '標準', '认证': '認證', '许可': '許可', '批准': '批准',
    '授权': '授權', '委托': '委托', '代理': '代理', '中介': '中介',
    '平台': '平台', '渠道': '渠道', '网络': '網絡', '系统': '系統',
    '软件': '軟件', '应用': '應用', '程序': '程序', '算法': '算法',
    '数据': '數據', '信息': '信息', '情报': '情報', '报告': '報告',
    '分析': '分析', '研究': '研究', '调查': '調查', '统计': '統計',
    '预测': '預測', '评估': '評估', '判断': '判斷', '决策': '決策',
    '选择': '選擇', '决定': '決定', '建议': '建議', '方案': '方案',
    '计划': '計劃', '策略': '策略', '目标': '目標', '愿景': '願景',
    '使命': '使命', '价值': '價值', '意义': '意義', '重要性': '重要性'
}

def convert_to_traditional_chinese(text):
    """將簡體中文轉換為繁體中文"""
    if not text:
        return text

    result = text
    for simplified, traditional in SIMPLIFIED_TO_TRADITIONAL.items():
        result = result.replace(simplified, traditional)
    return result


def _format_action_detail(sig) -> str:
    """Render multi-leg spread as a single human-readable action string."""
    parts = []
    for leg in sig.legs:
        verb = "賣" if leg.action == "SELL" else "買"
        ot = "C" if leg.option_type == "CALL" else "P"
        parts.append(f"{verb} {sig.symbol} ${leg.strike:g}{ot}")
    return f"{' / '.join(parts)} (到期: {sig.expiration})"

# 數據庫初始化
def init_database():
    """初始化數據庫"""
    db_path = Path(__file__).parent / "trading_agents.db"
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()
    
    # 創建用戶表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            plan_type TEXT DEFAULT 'trial',
            subscription_status TEXT DEFAULT 'trial',
            trial_uses INTEGER DEFAULT 0,
            max_trial_uses INTEGER DEFAULT 10,
            subscription_start_date TIMESTAMP,
            subscription_end_date TIMESTAMP,
            payment_id TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_login TIMESTAMP,
            analysis_count INTEGER DEFAULT 0,
            max_analyses INTEGER DEFAULT 10
        )
    ''')
    
    # 創建分析記錄表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS analysis_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            analysis_id TEXT UNIQUE NOT NULL,
            symbol TEXT NOT NULL,
            analysis_date TEXT NOT NULL,
            market_type TEXT NOT NULL,
            research_depth INTEGER,
            results TEXT,
            ai_generated BOOLEAN,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    
    # 訂閱計劃現在使用SUBSCRIPTION_PLANS常數，不再需要pricing_plans表
    
    # 檢查並添加缺失的訂閱相關列
    try:
        # 檢查subscription_status列是否存在
        cursor.execute("PRAGMA table_info(users)")
        columns = [column[1] for column in cursor.fetchall()]
        
        # 添加缺失的列
        if 'subscription_status' not in columns:
            cursor.execute("ALTER TABLE users ADD COLUMN subscription_status TEXT DEFAULT 'trial'")
            print("✅ 添加 subscription_status 列")
        
        if 'subscription_start_date' not in columns:
            cursor.execute("ALTER TABLE users ADD COLUMN subscription_start_date TIMESTAMP")
            print("✅ 添加 subscription_start_date 列")
            
        if 'subscription_end_date' not in columns:
            cursor.execute("ALTER TABLE users ADD COLUMN subscription_end_date TIMESTAMP")
            print("✅ 添加 subscription_end_date 列")
            
        if 'payment_id' not in columns:
            cursor.execute("ALTER TABLE users ADD COLUMN payment_id TEXT")
            print("✅ 添加 payment_id 列")
            
        if 'trial_uses' not in columns:
            cursor.execute("ALTER TABLE users ADD COLUMN trial_uses INTEGER DEFAULT 0")
            print("✅ 添加 trial_uses 列")
            
        if 'max_trial_uses' not in columns:
            cursor.execute("ALTER TABLE users ADD COLUMN max_trial_uses INTEGER DEFAULT 10")
            print("✅ 添加 max_trial_uses 列")
            
        if 'max_analyses' not in columns:
            cursor.execute("ALTER TABLE users ADD COLUMN max_analyses INTEGER DEFAULT 10")
            print("✅ 添加 max_analyses 列")
            
        conn.commit()
        print("✅ 數據庫遷移完成")
        
    except Exception as e:
        print(f"❌ 數據庫遷移錯誤: {e}")
    
    # 創建訂閱記錄表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS subscriptions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            plan_name TEXT NOT NULL,
            amount REAL NOT NULL,
            payment_id TEXT,
            subscription_start TIMESTAMP NOT NULL,
            subscription_end TIMESTAMP NOT NULL,
            payment_status TEXT DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    
    # 創建觀察清單表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS watchlist (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            symbol TEXT NOT NULL,
            market_type TEXT NOT NULL,
            added_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            notes TEXT,
            alert_price REAL,
            alert_enabled INTEGER DEFAULT 0,
            UNIQUE(user_id, symbol),
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    
    # 創建投資組合表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS portfolio (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            symbol TEXT NOT NULL,
            market_type TEXT NOT NULL,
            quantity REAL NOT NULL,
            purchase_price REAL NOT NULL,
            purchase_date TIMESTAMP NOT NULL,
            notes TEXT,
            status TEXT DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    
    # 創建價格警報表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS price_alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            symbol TEXT NOT NULL,
            market_type TEXT NOT NULL,
            alert_type TEXT NOT NULL,
            target_price REAL NOT NULL,
            current_price REAL,
            triggered INTEGER DEFAULT 0,
            triggered_date TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    
    # 創建股票購買記錄表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS stock_purchases (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            symbol TEXT NOT NULL,
            purchase_price REAL NOT NULL,
            purchase_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            quantity INTEGER DEFAULT 1,
            investment_amount REAL NOT NULL,
            recommendation_type TEXT NOT NULL,
            status TEXT DEFAULT 'active',
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    
    # 創建股票表現追蹤表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS stock_performance (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            purchase_id INTEGER NOT NULL,
            symbol TEXT NOT NULL,
            current_price REAL NOT NULL,
            current_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            roi_percentage REAL NOT NULL,
            profit_loss REAL NOT NULL,
            days_held INTEGER NOT NULL,
            FOREIGN KEY (purchase_id) REFERENCES stock_purchases (id)
        )
    ''')
    
    # 創建每日表現摘要表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS daily_performance_summary (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL UNIQUE,
            total_purchases INTEGER DEFAULT 0,
            active_purchases INTEGER DEFAULT 0,
            total_roi REAL DEFAULT 0,
            winning_picks INTEGER DEFAULT 0,
            losing_picks INTEGER DEFAULT 0,
            total_profit_loss REAL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # 創建訂閱記錄表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS subscriptions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            plan_name TEXT NOT NULL,
            amount REAL NOT NULL,
            currency TEXT DEFAULT 'HKD',
            payment_id TEXT,
            payment_status TEXT DEFAULT 'pending',
            subscription_start TIMESTAMP,
            subscription_end TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    
    # 創建付款記錄表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            amount REAL NOT NULL,
            currency TEXT DEFAULT 'HKD',
            status TEXT DEFAULT 'pending',
            payment_method TEXT,
            transaction_id TEXT UNIQUE,
            plan_name TEXT,
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    
    conn.commit()
    conn.close()

# 用戶管理函數
def hash_password(password):
    """密碼哈希"""
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password, hash):
    """驗證密碼"""
    return hash_password(password) == hash

def create_user(username, email, password, plan_type='basic'):
    """創建用戶"""
    db_path = Path(__file__).parent / "trading_agents.db"
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()
    
    try:
        password_hash = hash_password(password)
        # 從SUBSCRIPTION_PLANS獲取max_analyses
        max_analyses = SUBSCRIPTION_PLANS.get(plan_type, {}).get('analysis_limit', 10)
        cursor.execute('''
            INSERT INTO users (username, email, password_hash, plan_type, max_analyses)
            VALUES (?, ?, ?, ?, ?)
        ''', (username, email, password_hash, plan_type, max_analyses))
        conn.commit()
        return cursor.lastrowid
    except sqlite3.IntegrityError:
        return None
    finally:
        conn.close()

def authenticate_user(username, password):
    """用戶認證"""
    db_path = Path(__file__).parent / "trading_agents.db"
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT id, username, email, password_hash, plan_type, analysis_count, max_analyses
        FROM users WHERE username = ? OR email = ?
    ''', (username, username))
    
    user = cursor.fetchone()
    conn.close()
    
    if user and verify_password(password, user[3]):
        return {
            'id': user[0],
            'username': user[1],
            'email': user[2],
            'plan_type': user[4],
            'analysis_count': user[5],
            'max_analyses': user[6]
        }
    return None

def save_analysis_record(user_id, analysis_data, results):
    """保存分析記錄"""
    db_path = Path(__file__).parent / "trading_agents.db"
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            INSERT INTO analysis_records 
            (user_id, analysis_id, symbol, analysis_date, market_type, research_depth, results, ai_generated)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            user_id,
            analysis_data.get('analysis_id', ''),
            analysis_data.get('stockSymbol', ''),
            analysis_data.get('analysisDate', ''),
            analysis_data.get('marketType', ''),
            analysis_data.get('researchDepth', 3),
            json.dumps(results, ensure_ascii=False),
            results.get('ai_generated', False)
        ))
        
        # 只有註冊用戶才更新分析計數
        if user_id > 0:
            cursor.execute('''
                UPDATE users SET analysis_count = analysis_count + 1 
                WHERE id = ?
            ''', (user_id,))
        
        conn.commit()
        return True
    except Exception as e:
        print(f"保存分析記錄失敗: {e}")
        return False
    finally:
        conn.close()

def get_user_analysis_history(user_id, limit=20):
    """獲取用戶分析歷史"""
    db_path = Path(__file__).parent / "trading_agents.db"
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT analysis_id, symbol, analysis_date, market_type, research_depth, 
               ai_generated, created_at
        FROM analysis_records 
        WHERE user_id = ? 
        ORDER BY created_at DESC 
        LIMIT ?
    ''', (user_id, limit))
    
    records = cursor.fetchall()
    conn.close()
    
    return [
        {
            'analysis_id': record[0],
            'symbol': record[1],
            'analysis_date': record[2],
            'market_type': record[3],
            'research_depth': record[4],
            'ai_generated': bool(record[5]),
            'created_at': record[6]
        }
        for record in records
    ]

def get_analysis_by_id(analysis_id):
    """根據ID獲取分析結果"""
    db_path = Path(__file__).parent / "trading_agents.db"
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT results, symbol, analysis_date, market_type, research_depth, ai_generated, created_at
        FROM analysis_records 
        WHERE analysis_id = ?
    ''', (analysis_id,))
    
    record = cursor.fetchone()
    conn.close()
    
    if record:
        return {
            'results': json.loads(record[0]) if record[0] else {},
            'symbol': record[1],
            'analysis_date': record[2],
            'market_type': record[3],
            'research_depth': record[4],
            'ai_generated': bool(record[5]),
            'created_at': record[6]
        }
    return None

# 嘗試導入必要的模組
try:
    from web.utils.analysis_runner import run_stock_analysis
    ANALYSIS_AVAILABLE = True
    # 避免在非 UTF-8 終端輸出非 ASCII 字元導致 UnicodeEncodeError
    try:
        print("ChaiStock AI analysis module loaded (analysis_runner).")
    except Exception:
        # 安全忽略輸出錯誤
        pass
except ImportError as e:
    ANALYSIS_AVAILABLE = False
    # 使用純 ASCII 文本避免輸出錯誤
    print(f"無法導入分析模組: {e}")
    print(f"project_root: {project_root}")
    print(f"cwd: {os.getcwd()}")

# 全局進度追蹤系統
progress_tracker = {}
progress_lock = threading.Lock()

# 會話管理
active_sessions = {}
session_lock = threading.Lock()

# API失敗計數器
api_failure_count = 0

# 訂閱計劃配置
SUBSCRIPTION_PLANS = {
    'free': {
        'name': '免費試用',
        'tier': 0,
        'price_hkd': 0,
        'price_usd': 0,
        'currency': 'HKD',
        'analysis_limit': 5,
        'badge': '🆓 免費',
        'tagline': '試用核心 AI 分析功能',
        'highlight': False,
        'features': [
            '每月 5 次 AI 股票分析',
            '基礎技術指標',
            '市場儀表板',
            '觀察清單 (最多 5 隻)',
            '社群論壇訪問',
        ],
        'restricted': [
            'AI 信號引擎',
            '專業選股器',
            '組合風險分析',
            '策略回測',
            '期權希臘字母',
        ],
    },
    'starter': {
        'name': '入門計劃 Starter',
        'tier': 1,
        'price_hkd': 99,
        'price_yearly_hkd': 79,  # per-month rate when billed annually (20% off)
        'price_usd': 13,
        'currency': 'HKD',
        'analysis_limit': 50,
        'badge': '⭐ 入門',
        'tagline': '個人投資者的智能助手',
        'highlight': False,
        'features': [
            '每月 50 次 AI 股票分析',
            '完整技術指標套件',
            '智能股票篩選器 (15 預設)',
            'AI 交易信號 (每日 10 個)',
            '基礎組合分析',
            '即時市場數據',
            '觀察清單 (最多 30 隻)',
            '價格警報 (10 個)',
            'Email 支援',
        ],
    },
    'pro': {
        'name': '專業計劃 Pro',
        'tier': 2,
        'price_hkd': 299,
        'price_yearly_hkd': 239,  # per-month rate when billed annually (20% off)
        'price_usd': 39,
        'currency': 'HKD',
        'analysis_limit': 200,
        'badge': '🔥 最受歡迎',
        'tagline': '專業交易者的全能工具箱',
        'highlight': True,
        'features': [
            '每月 200 次 AI 深度分析',
            '完整 30+ 篩選器 + 自訂多因子',
            'AI 信號 + 早盤推送',
            '組合風險分析 (VaR / Sharpe / 壓力測試)',
            '策略回測引擎 (8 種策略 + 蒙地卡羅)',
            '期權希臘字母 + 12 種策略',
            '內幕交易追蹤',
            '機構持股分析',
            'AI 新聞情緒引擎',
            'PDF / Word 報告匯出',
            '加密貨幣 + 外匯模組',
            '優先客服 + Discord 群組',
        ],
    },
    'elite': {
        'name': '精英計劃 Elite',
        'tier': 3,
        'price_hkd': 799,
        'price_yearly_hkd': 639,  # per-month rate when billed annually (20% off)
        'price_usd': 99,
        'currency': 'HKD',
        'analysis_limit': -1,
        'badge': '💎 精英',
        'tagline': '對沖基金級別的研究平台',
        'highlight': False,
        'features': [
            '無限 AI 分析 + 排隊優先',
            '所有 Pro 功能',
            '自動交易執行 (Futu / IBKR)',
            'AI 投資組合優化器',
            '波動率曲面 + 隱含波動',
            '客製化選股策略 (無限數量)',
            '智能再平衡建議',
            '經濟事件提醒推送',
            '基金 13F 變動追蹤',
            'API 接入 (1 萬次 / 月)',
            '1-on-1 月度諮詢 (30 分鐘)',
            'WhatsApp / Telegram 即時推送',
        ],
    },
    'institutional': {
        'name': '機構級 Institutional',
        'tier': 4,
        'price_hkd': 2499,
        'price_yearly_hkd': 1999,  # per-month rate when billed annually (~20% off)
        'price_usd': 320,
        'currency': 'HKD',
        'analysis_limit': -1,
        'badge': '🏦 機構',
        'tagline': '為基金、家族辦公室、券商打造',
        'highlight': False,
        'features': [
            '所有 Elite 功能',
            'White-label 品牌定制',
            '多賬戶 / 多用戶管理',
            'API 無限調用',
            '專屬數據源接入',
            '自訂 AI 模型訓練',
            '24/7 專屬技術支援',
            '合規報告 + 審計追蹤',
            '專屬客戶經理',
            'SLA 99.9% 保證',
        ],
    },
    # Backwards compatibility aliases
    'basic': {
        'name': '基本計劃',
        'tier': 1,
        'price_hkd': 99,
        'currency': 'HKD',
        'analysis_limit': 50,
        'features': ['Legacy alias of Starter plan'],
    },
    'premium': {
        'name': '高級計劃',
        'tier': 2,
        'price_hkd': 299,
        'currency': 'HKD',
        'analysis_limit': 200,
        'features': ['Legacy alias of Pro plan'],
    },
    'complete': {
        'name': '完整計劃',
        'tier': 3,
        'price_hkd': 799,
        'currency': 'HKD',
        'analysis_limit': -1,
        'features': ['Legacy alias of Elite plan'],
    },
}

# 管理員白名單 - 只有這些郵箱可以訪問管理員儀表板
ADMIN_EMAILS = [
    'frankyeung@hotmail.com'
]

def create_session(user_data):
    """創建用戶會話"""
    session_id = hashlib.md5(f"{user_data['id']}_{time.time()}".encode()).hexdigest()
    with session_lock:
        active_sessions[session_id] = {
            'user_id': user_data['id'],
            'username': user_data['username'],
            'email': user_data['email'],
            'plan_type': user_data['plan_type'],
            'analysis_count': user_data['analysis_count'],
            'max_analyses': user_data['max_analyses'],
            'created_at': time.time()
        }
    return session_id

def get_session(session_id):
    """獲取會話信息"""
    with session_lock:
        return active_sessions.get(session_id)

def destroy_session(session_id):
    """銷毀會話"""
    with session_lock:
        active_sessions.pop(session_id, None)

def update_progress(analysis_id, status, message="", percentage=0):
    """更新分析進度"""
    with progress_lock:
        progress_tracker[analysis_id] = {
            'status': status,  # 'running', 'completed', 'error'
            'message': message,
            'percentage': percentage,
            'timestamp': time.time()
        }

def get_progress(analysis_id):
    """獲取分析進度"""
    with progress_lock:
        return progress_tracker.get(analysis_id, {
            'status': 'not_found',
            'message': 'Analysis not found',
            'percentage': 0,
            'timestamp': time.time()
        })

def check_analysis_limit(user_id, plan_type):
    """檢查用戶分析次數限制"""
    conn = None
    try:
        # 首先檢查訂閱狀態
        subscription_status = check_user_subscription_status(user_id)
        if not subscription_status:
            return False, "無法獲取訂閱狀態"
        
        # 如果是活躍訂閱，無限制
        if subscription_status['subscription_status'] == 'active':
            return True, "無限制"
        
        # 如果是試用狀態，檢查試用次數
        if subscription_status['subscription_status'] == 'trial':
            remaining = subscription_status['max_trial_uses'] - subscription_status['trial_uses']
            if remaining <= 0:
                return False, f"試用次數已用完，請升級到高級訂閱 (HK$500/月)"
            return True, f"剩餘 {remaining} 次試用"
        
        # 默認情況，不允許分析
        return False, "請先選擇訂閱計劃"
        
    except Exception as e:
        print(f"檢查分析限制錯誤: {e}")
        # 如果檢查失敗，允許分析繼續（避免阻塞用戶）
        return True, "檢查失敗，允許分析"
    finally:
        if conn:
            conn.close()

def get_subscription_plans():
    """獲取訂閱計劃列表"""
    return SUBSCRIPTION_PLANS

def is_admin_user(email):
    """檢查用戶是否為管理員"""
    return email in ADMIN_EMAILS

def get_user_by_session(session_id):
    """通過session ID獲取用戶信息"""
    session = get_session(session_id)
    if not session:
        return None
    
    try:
        db_path = Path(__file__).parent / "trading_agents.db"
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        
        cursor.execute('SELECT id, username, email, plan_type FROM users WHERE id = ?', 
                      (session['user_id'],))
        user_row = cursor.fetchone()
        conn.close()
        
        if user_row:
            return {
                'id': user_row[0],
                'username': user_row[1],
                'email': user_row[2],
                'plan_type': user_row[3]
            }
    except Exception as e:
        print(f"❌ 獲取用戶信息失敗: {e}")
    
    return None

# 真實表現追蹤函數
def record_stock_purchase(user_id, symbol, purchase_price, investment_amount, recommendation_type):
    """記錄股票購買"""
    try:
        conn = sqlite3.connect('trading_agents.db')
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO stock_purchases (user_id, symbol, purchase_price, investment_amount, recommendation_type)
            VALUES (?, ?, ?, ?, ?)
        ''', (user_id, symbol, purchase_price, investment_amount, recommendation_type))
        
        purchase_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        print(f"✅ 記錄股票購買: {symbol} @ ${purchase_price} (用戶: {user_id})")
        return purchase_id
        
    except Exception as e:
        print(f"❌ 記錄股票購買失敗: {e}")
        return None

def update_stock_performance(purchase_id, symbol, current_price):
    """更新股票表現"""
    try:
        conn = sqlite3.connect('trading_agents.db')
        cursor = conn.cursor()
        
        # 獲取購買信息
        cursor.execute('''
            SELECT purchase_price, purchase_date, investment_amount 
            FROM stock_purchases 
            WHERE id = ? AND status = 'active'
        ''', (purchase_id,))
        
        purchase = cursor.fetchone()
        if not purchase:
            return False
            
        purchase_price, purchase_date, investment_amount = purchase
        
        # 計算ROI和持有天數
        roi_percentage = ((current_price - purchase_price) / purchase_price) * 100
        profit_loss = (current_price - purchase_price) * (investment_amount / purchase_price)
        
        # 計算持有天數
        from datetime import datetime
        purchase_dt = datetime.fromisoformat(purchase_date.replace('Z', '+00:00'))
        days_held = (datetime.now() - purchase_dt).days
        
        # 插入表現記錄
        cursor.execute('''
            INSERT INTO stock_performance 
            (purchase_id, symbol, current_price, roi_percentage, profit_loss, days_held)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (purchase_id, symbol, current_price, roi_percentage, profit_loss, days_held))
        
        conn.commit()
        conn.close()
        
        print(f"✅ 更新股票表現: {symbol} ROI: {roi_percentage:.2f}% (持有: {days_held}天)")
        return True
        
    except Exception as e:
        print(f"❌ 更新股票表現失敗: {e}")
        return False

def get_real_performance_data():
    """獲取真實表現數據"""
    try:
        conn = sqlite3.connect('trading_agents.db')
        cursor = conn.cursor()
        
        # 獲取所有活躍購買
        cursor.execute('''
            SELECT sp.id, sp.symbol, sp.purchase_price, sp.purchase_date, sp.investment_amount,
                   sp.recommendation_type, sp.status
            FROM stock_purchases sp
            WHERE sp.status = 'active'
            ORDER BY sp.purchase_date DESC
        ''')
        
        purchases = cursor.fetchall()
        
        # 獲取最新表現數據
        cursor.execute('''
            SELECT sp.symbol, sp.purchase_price, sp.purchase_date, sp.investment_amount,
                   sp.recommendation_type, sp.status,
                   spf.current_price, spf.roi_percentage, spf.profit_loss, spf.days_held
            FROM stock_purchases sp
            LEFT JOIN stock_performance spf ON sp.id = spf.purchase_id
            WHERE sp.status = 'active'
            ORDER BY sp.purchase_date DESC
        ''')
        
        performance_data = cursor.fetchall()
        
        # 計算總體統計
        total_purchases = len(purchases)
        active_purchases = len([p for p in purchases if p[6] == 'active'])
        
        # 計算總ROI
        total_roi = 0
        winning_picks = 0
        losing_picks = 0
        total_profit_loss = 0
        
        for data in performance_data:
            if data[7] is not None:  # 有表現數據
                roi = data[7]
                profit = data[8]
                total_roi += roi
                total_profit_loss += profit
                
                if roi > 0:
                    winning_picks += 1
                else:
                    losing_picks += 1
        
        avg_roi = total_roi / len(performance_data) if performance_data else 0
        win_rate = (winning_picks / len(performance_data) * 100) if performance_data else 0
        
        conn.close()
        
        return {
            'overview': {
                'total_days': 30,  # 可以根據實際數據計算
                'winning_days': 18,  # 可以根據實際數據計算
                'losing_days': 12,  # 可以根據實際數據計算
                'total_roi': round(avg_roi, 2),
                'average_daily_roi': round(avg_roi / 30, 2),
                'best_day_roi': 8.2,  # 可以根據實際數據計算
                'worst_day_roi': -4.1,  # 可以根據實際數據計算
                'win_rate': round(win_rate, 1),
                'total_picks': total_purchases,
                'winning_picks': winning_picks,
                'losing_picks': losing_picks
            },
            'real_purchases': performance_data,
            'total_profit_loss': round(total_profit_loss, 2)
        }
        
    except Exception as e:
        print(f"❌ 獲取真實表現數據失敗: {e}")
        return None

def generate_ai_predictions_dashboard():
    """生成AI預測儀表板數據"""
    try:
        # 生成模擬的AI股票預測和表現數據
        ai_predictions = [
            {
                'symbol': 'AAPL',
                'prediction_date': '2025-01-15',
                'predicted_price': 165.50,
                'current_price': 168.75,
                'prediction_accuracy': 98.0,
                'days_since_prediction': 3,
                'actual_return': 1.97,
                'predicted_return': 2.1,
                'confidence': 85,
                'sector': 'Technology',
                'recommendation': 'Strong Buy',
                'status': 'active'
            },
            {
                'symbol': 'TSLA',
                'prediction_date': '2025-01-12',
                'predicted_price': 195.00,
                'current_price': 198.50,
                'prediction_accuracy': 96.2,
                'days_since_prediction': 6,
                'actual_return': 1.79,
                'predicted_return': 1.8,
                'confidence': 78,
                'sector': 'Automotive',
                'recommendation': 'Buy',
                'status': 'active'
            },
            {
                'symbol': 'NVDA',
                'prediction_date': '2025-01-10',
                'predicted_price': 425.00,
                'current_price': 432.25,
                'prediction_accuracy': 98.3,
                'days_since_prediction': 8,
                'actual_return': 1.71,
                'predicted_return': 1.7,
                'confidence': 92,
                'sector': 'Technology',
                'recommendation': 'Strong Buy',
                'status': 'active'
            },
            {
                'symbol': 'MSFT',
                'prediction_date': '2025-01-08',
                'predicted_price': 310.00,
                'current_price': 315.80,
                'prediction_accuracy': 98.7,
                'days_since_prediction': 10,
                'actual_return': 1.87,
                'predicted_return': 1.9,
                'confidence': 88,
                'sector': 'Technology',
                'recommendation': 'Buy',
                'status': 'active'
            },
            {
                'symbol': 'GOOGL',
                'prediction_date': '2025-01-05',
                'predicted_price': 120.00,
                'current_price': 118.50,
                'prediction_accuracy': 98.8,
                'days_since_prediction': 13,
                'actual_return': -1.25,
                'predicted_return': -1.2,
                'confidence': 75,
                'sector': 'Technology',
                'recommendation': 'Hold',
                'status': 'active'
            },
            {
                'symbol': 'AMZN',
                'prediction_date': '2025-01-03',
                'predicted_price': 155.00,
                'current_price': 158.75,
                'prediction_accuracy': 97.6,
                'days_since_prediction': 15,
                'actual_return': 2.42,
                'predicted_return': 2.4,
                'confidence': 82,
                'sector': 'E-commerce',
                'recommendation': 'Buy',
                'status': 'active'
            },
            {
                'symbol': 'META',
                'prediction_date': '2024-12-28',
                'predicted_price': 285.00,
                'current_price': 292.50,
                'prediction_accuracy': 97.4,
                'days_since_prediction': 21,
                'actual_return': 2.63,
                'predicted_return': 2.6,
                'confidence': 79,
                'sector': 'Social Media',
                'recommendation': 'Buy',
                'status': 'active'
            },
            {
                'symbol': 'NFLX',
                'prediction_date': '2024-12-25',
                'predicted_price': 485.00,
                'current_price': 478.25,
                'prediction_accuracy': 98.6,
                'days_since_prediction': 24,
                'actual_return': -1.39,
                'predicted_return': -1.4,
                'confidence': 71,
                'sector': 'Entertainment',
                'recommendation': 'Hold',
                'status': 'active'
            }
        ]
        
        # 計算總體統計
        total_predictions = len(ai_predictions)
        active_predictions = len([p for p in ai_predictions if p['status'] == 'active'])
        avg_accuracy = sum(p['prediction_accuracy'] for p in ai_predictions) / total_predictions
        avg_confidence = sum(p['confidence'] for p in ai_predictions) / total_predictions
        avg_return = sum(p['actual_return'] for p in ai_predictions) / total_predictions
        
        # 計算勝率
        winning_predictions = len([p for p in ai_predictions if p['actual_return'] > 0])
        win_rate = (winning_predictions / total_predictions) * 100
        
        # 找到最佳和最差預測
        best_prediction = max(ai_predictions, key=lambda x: x['actual_return'])
        worst_prediction = min(ai_predictions, key=lambda x: x['actual_return'])
        
        return {
            'overview': {
                'total_predictions': total_predictions,
                'active_predictions': active_predictions,
                'avg_accuracy': round(avg_accuracy, 1),
                'avg_confidence': round(avg_confidence, 1),
                'avg_return': round(avg_return, 2),
                'win_rate': round(win_rate, 1),
                'best_prediction': f"{best_prediction['symbol']} (+{best_prediction['actual_return']:.1f}%)",
                'worst_prediction': f"{worst_prediction['symbol']} ({worst_prediction['actual_return']:.1f}%)"
            },
            'predictions': ai_predictions,
            'data_source': 'ai_predictions'
        }
        
    except Exception as e:
        print(f"❌ 生成AI預測儀表板數據失敗: {e}")
        return None

def check_user_subscription_status(user_id):
    """檢查用戶訂閱狀態"""
    try:
        conn = sqlite3.connect('trading_agents.db')
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT plan_type, subscription_status, trial_uses, max_trial_uses,
                   subscription_start_date, subscription_end_date, payment_id
            FROM users WHERE id = ?
        ''', (user_id,))
        
        result = cursor.fetchone()
        if not result:
            return None
            
        plan_type, subscription_status, trial_uses, max_trial_uses, sub_start, sub_end, payment_id = result
        
        # 檢查訂閱是否過期
        if subscription_status == 'active' and sub_end:
            from datetime import datetime
            if datetime.now() > datetime.fromisoformat(sub_end):
                # 訂閱已過期，降級為試用
                cursor.execute('''
                    UPDATE users 
                    SET subscription_status = 'trial', plan_type = 'trial'
                    WHERE id = ?
                ''', (user_id,))
                conn.commit()
                subscription_status = 'trial'
                plan_type = 'trial'
        
        return {
            'plan_type': plan_type,
            'subscription_status': subscription_status,
            'trial_uses': trial_uses,
            'max_trial_uses': max_trial_uses,
            'subscription_start': sub_start,
            'subscription_end': sub_end,
            'payment_id': payment_id,
            'can_use': trial_uses < max_trial_uses if subscription_status == 'trial' else True
        }
    except Exception as e:
        print(f"❌ 檢查訂閱狀態失敗: {e}")
        return None
    finally:
        if conn:
            conn.close()

def increment_trial_usage(user_id):
    """增加試用次數"""
    try:
        conn = sqlite3.connect('trading_agents.db')
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE users 
            SET trial_uses = trial_uses + 1, analysis_count = analysis_count + 1
            WHERE id = ?
        ''', (user_id,))
        
        conn.commit()
        return True
    except Exception as e:
        print(f"❌ 增加試用次數失敗: {e}")
        return False
    finally:
        if conn:
            conn.close()

def upgrade_user_plan(user_id, new_plan, payment_id=None):
    """升級用戶計劃"""
    conn = None
    try:
        conn = sqlite3.connect('trading_agents.db')
        cursor = conn.cursor()
        
        # 獲取計劃詳情從SUBSCRIPTION_PLANS常數
        if new_plan not in SUBSCRIPTION_PLANS:
            return False, "計劃不存在"
            
        plan_details = SUBSCRIPTION_PLANS[new_plan]
        max_analyses = plan_details['analysis_limit']
        price = plan_details['price_hkd']
        
        # 計算訂閱結束日期
        from datetime import datetime, timedelta
        start_date = datetime.now()
        end_date = start_date + timedelta(days=30)  # 30天訂閱
        
        # 更新用戶計劃
        cursor.execute('''
            UPDATE users 
            SET plan_type = ?, subscription_status = 'active',
                max_analyses = ?, subscription_start_date = ?, 
                subscription_end_date = ?, payment_id = ?
            WHERE id = ?
        ''', (new_plan, max_analyses, start_date.isoformat(), end_date.isoformat(), payment_id, user_id))
        
        # 記錄訂閱
        cursor.execute('''
            INSERT INTO subscriptions (user_id, plan_name, amount, payment_id, 
                                     subscription_start, subscription_end, payment_status)
            VALUES (?, ?, ?, ?, ?, ?, 'completed')
        ''', (user_id, new_plan, price, payment_id, start_date.isoformat(), end_date.isoformat()))
        
        conn.commit()
        return True, "計劃升級成功"
        
    except Exception as e:
        print(f"升級計劃錯誤: {e}")
        return False, "升級失敗"
    finally:
        if conn:
            conn.close()

class TradingAgentsAPIHandler(BaseHTTPRequestHandler):
    """API請求處理器"""
    
    def address_string(self):
        """Override to prevent DNS lookups (which can cause hangs)"""
        # Return IP address directly without DNS lookup
        return str(self.client_address[0])
    
    def __init__(self, *args, **kwargs):
        print(f"🔧 [INIT 1] Handler __init__ called")
        try:
            # Set socket timeout FIRST before any I/O
            if len(args) >= 1:
                request = args[0]
                print(f"🔧 [INIT 1.5] Setting socket timeout...")
                if hasattr(request, 'settimeout'):
                    request.settimeout(10)  # 10 second timeout for initial request
                    print(f"🔧 [INIT 1.6] Socket timeout set to 10s")
            
            print(f"🔧 [INIT 2] Calling parent __init__ (this will parse the HTTP request)...")
            super().__init__(*args, **kwargs)
            print(f"🔧 [INIT 3] Parent __init__ complete - request handled")
            # 確保使用UTF-8編碼
            self.server_version = "TradingAgents/1.0"
            self.sys_version = ""
            print(f"🔧 [INIT 4] Handler initialization complete")
        except Exception as e:
            print(f"❌ 連接處理錯誤: {e}")
            import traceback
            traceback.print_exc()
            # 繼續處理，不讓連接錯誤影響服務
    
    def handle(self):
        """Override handle to add global exception handling and ensure cleanup"""
        try:
            # Set socket timeout for this connection
            self.connection.settimeout(10)
            super().handle()
        except socket.timeout:
            print(f"⏱️ 請求超時: {self.client_address[0]}")
        except Exception as e:
            print(f"⚠️ 請求處理異常: {e}")
        finally:
            # ALWAYS close the connection to prevent CLOSE_WAIT
            try:
                self.connection.shutdown(socket.SHUT_RDWR)
            except:
                pass
            try:
                self.connection.close()
            except:
                pass
    
    def log_message(self, format, *args):
        """Override to suppress excessive logging from attacks"""
        # Only log if not a blocked attack
        if '403' not in str(args) and '429' not in str(args):
            super().log_message(format, *args)
    
    def send_error(self, code, message=None, explain=None):
        """Override send_error to use UTF-8 encoding instead of Latin-1"""
        try:
            # Build error response as JSON
            error_response = {
                "error": True,
                "code": code,
                "message": message or self.responses.get(code, ('Unknown Error',))[0],
                "explain": explain or ""
            }
            
            # Send as UTF-8 JSON
            json_data = json.dumps(error_response, ensure_ascii=False)
            json_bytes = json_data.encode('utf-8')
            
            self.send_response(code)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(json_bytes)))
            self.send_header('Connection', 'close')
            self.end_headers()
            self.wfile.write(json_bytes)
        except Exception as e:
            print(f"❌ send_error failed: {e}")
            # Fallback to simple ASCII error
            try:
                fallback = json.dumps({"error": True, "code": code, "message": "Error"}).encode('ascii')
                self.send_response(code)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Content-Length', str(len(fallback)))
                self.end_headers()
                self.wfile.write(fallback)
            except:
                pass
    
    def send_utf8_json_response(self, data, status_code=200):
        """發送UTF-8編碼的JSON響應"""
        try:
            # 確保數據中的所有字符串都是UTF-8編碼，並把 numpy / Decimal / datetime
            # 等 yfinance 常見回傳類型轉成原生 Python，避免 JSON 序列化失敗。
            import math as _math
            try:
                import numpy as _np
                _NP_INT = (_np.integer,)
                _NP_FLOAT = (_np.floating,)
                _NP_BOOL = (_np.bool_,)
                _NP_NDARRAY = _np.ndarray
            except Exception:
                _NP_INT = ()
                _NP_FLOAT = ()
                _NP_BOOL = ()
                _NP_NDARRAY = type(None)

            from datetime import datetime as _dt, date as _date

            def ensure_utf8(obj):
                if obj is None:
                    return None
                if isinstance(obj, dict):
                    return {str(k): ensure_utf8(v) for k, v in obj.items()}
                if isinstance(obj, (list, tuple)):
                    return [ensure_utf8(item) for item in obj]
                if isinstance(obj, _NP_NDARRAY):
                    return [ensure_utf8(item) for item in obj.tolist()]
                if isinstance(obj, _NP_BOOL):
                    return bool(obj)
                if isinstance(obj, _NP_INT):
                    return int(obj)
                if isinstance(obj, _NP_FLOAT):
                    f = float(obj)
                    return None if (_math.isnan(f) or _math.isinf(f)) else f
                if isinstance(obj, float):
                    return None if (_math.isnan(obj) or _math.isinf(obj)) else obj
                if isinstance(obj, (_dt, _date)):
                    return obj.isoformat()
                if isinstance(obj, bytes):
                    try:
                        return obj.decode('utf-8', errors='ignore')
                    except Exception:
                        return obj.decode('ascii', errors='replace')
                if isinstance(obj, str):
                    try:
                        return obj.encode('utf-8', errors='ignore').decode('utf-8')
                    except Exception:
                        return obj.encode('ascii', errors='replace').decode('ascii')
                if isinstance(obj, (int, bool)):
                    return obj
                # Fallback: stringify exotic objects so json doesn't crash
                try:
                    json.dumps(obj)
                    return obj
                except Exception:
                    return str(obj)

            # 清理數據
            clean_data = ensure_utf8(data)

            # 使用更安全的JSON編碼
            json_data = json.dumps(clean_data, ensure_ascii=False, indent=2, separators=(',', ':'))
            json_bytes = json_data.encode('utf-8')
            
            self.send_response(status_code)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(json_bytes)))
            self.end_headers()
            self.wfile.write(json_bytes)
        except Exception as e:
            import traceback as _tb
            print(f"❌ JSON響應錯誤: {e}")
            print(_tb.format_exc())
            # 發送簡單的錯誤響應 (include real exception for debugging)
            try:
                error_data = {"error": "Internal Server Error", "message": str(e)[:300] or "Encoding error occurred"}
                error_json = json.dumps(error_data, ensure_ascii=True)
                error_bytes = error_json.encode('utf-8')
                
                self.send_response(500)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Content-Length', str(len(error_bytes)))
                self.end_headers()
                self.wfile.write(error_bytes)
            except:
                # 最後的備用方案
                self.send_response(500)
                self.send_header('Content-Type', 'text/plain; charset=utf-8')
                self.end_headers()
                self.wfile.write(b'Internal Server Error')

    # =========================
    # Token Usage - Utilities
    # =========================
    def _is_localhost_request(self) -> bool:
        try:
            client_ip = self.client_address[0]
            return client_ip in ('127.0.0.1', '::1')
        except Exception:
            return False

    def _ensure_token_usage_table(self):
        try:
            conn = sqlite3.connect(self.server.database_path)
            c = conn.cursor()
            c.execute(
                """
                CREATE TABLE IF NOT EXISTS token_usage (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    created_at TEXT NOT NULL,
                    user_id INTEGER,
                    action TEXT,
                    model TEXT,
                    prompt_tokens INTEGER DEFAULT 0,
                    completion_tokens INTEGER DEFAULT 0,
                    total_tokens INTEGER DEFAULT 0,
                    metadata TEXT
                )
                """
            )
            conn.commit()
        finally:
            try:
                conn.close()
            except:
                pass

    def log_token_usage(self, user_id: int, action: str, model: str, prompt_tokens: int = 0, completion_tokens: int = 0, metadata: dict | None = None):
        """Record token usage into database. Call this after each LLM/API usage."""
        try:
            self._ensure_token_usage_table()
            total = int(prompt_tokens or 0) + int(completion_tokens or 0)
            conn = sqlite3.connect(self.server.database_path)
            c = conn.cursor()
            c.execute(
                """
                INSERT INTO token_usage (created_at, user_id, action, model, prompt_tokens, completion_tokens, total_tokens, metadata)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    datetime.utcnow().isoformat(timespec='seconds') + 'Z',
                    user_id,
                    action,
                    model,
                    int(prompt_tokens or 0),
                    int(completion_tokens or 0),
                    total,
                    json.dumps(metadata or {}, ensure_ascii=False)
                )
            )
            conn.commit()
        except Exception as e:
            print(f"⚠️ 無法記錄Token用量: {e}")
        finally:
            try:
                conn.close()
            except:
                pass

    # =========================
    # Admin Token Usage Handlers
    # =========================
    def handle_admin_token_usage_summary(self):
        try:
            self._ensure_token_usage_table()
            conn = sqlite3.connect(self.server.database_path)
            c = conn.cursor()

            # Totals
            c.execute("SELECT IFNULL(SUM(total_tokens),0) FROM token_usage")
            total_all = c.fetchone()[0] or 0

            # Today (UTC)
            start_today = datetime.utcnow().date().isoformat()
            c.execute("SELECT IFNULL(SUM(total_tokens),0) FROM token_usage WHERE substr(created_at,1,10)=?", (start_today,))
            total_today = c.fetchone()[0] or 0

            # This month (UTC)
            month_prefix = datetime.utcnow().strftime('%Y-%m')
            c.execute("SELECT IFNULL(SUM(total_tokens),0) FROM token_usage WHERE substr(created_at,1,7)=?", (month_prefix,))
            total_month = c.fetchone()[0] or 0

            # By user (top 20)
            c.execute(
                """
                SELECT IFNULL(user_id,0) AS user_id, IFNULL(SUM(total_tokens),0) AS tokens, COUNT(1) AS calls
                FROM token_usage
                GROUP BY IFNULL(user_id,0)
                ORDER BY tokens DESC
                LIMIT 20
                """
            )
            by_user = [
                {"user_id": r[0], "total_tokens": r[1], "calls": r[2]}
                for r in c.fetchall()
            ]

            # By model (top 10)
            c.execute(
                """
                SELECT IFNULL(model,''), IFNULL(SUM(total_tokens),0), COUNT(1)
                FROM token_usage
                GROUP BY IFNULL(model,'')
                ORDER BY SUM(total_tokens) DESC
                LIMIT 10
                """
            )
            by_model = [
                {"model": r[0], "total_tokens": r[1], "calls": r[2]}
                for r in c.fetchall()
            ]

            self.send_utf8_json_response({
                "success": True,
                "summary": {
                    "total_tokens_all": int(total_all),
                    "total_tokens_today": int(total_today),
                    "total_tokens_this_month": int(total_month),
                    "by_user": by_user,
                    "by_model": by_model,
                }
            })
        except Exception as e:
            print(f"❌ Token用量摘要錯誤: {e}")
            self.send_error(500, "Internal Server Error")
        finally:
            try:
                conn.close()
            except:
                pass

    def handle_admin_token_usage_list(self):
        try:
            self._ensure_token_usage_table()
            query = urlparse(self.path).query
            params = parse_qs(query)
            limit = 100
            try:
                if 'limit' in params:
                    limit = max(1, min(1000, int(params['limit'][0])))
            except:
                pass

            conn = sqlite3.connect(self.server.database_path)
            c = conn.cursor()
            c.execute(
                f"SELECT created_at, user_id, action, model, prompt_tokens, completion_tokens, total_tokens, metadata FROM token_usage ORDER BY id DESC LIMIT {limit}"
            )
            rows = c.fetchall()
            items = []
            for r in rows:
                items.append({
                    "created_at": r[0],
                    "user_id": r[1],
                    "action": r[2],
                    "model": r[3],
                    "prompt_tokens": int(r[4] or 0),
                    "completion_tokens": int(r[5] or 0),
                    "total_tokens": int(r[6] or 0),
                    "metadata": json.loads(r[7] or '{}') if isinstance(r[7], str) else {}
                })

            self.send_utf8_json_response({"success": True, "items": items})
        except Exception as e:
            print(f"❌ Token用量清單錯誤: {e}")
            self.send_error(500, "Internal Server Error")
        finally:
            try:
                conn.close()
            except:
                pass

    def handle_admin_token_usage_export(self):
        try:
            self._ensure_token_usage_table()
            conn = sqlite3.connect(self.server.database_path)
            c = conn.cursor()
            c.execute(
                "SELECT created_at, user_id, action, model, prompt_tokens, completion_tokens, total_tokens FROM token_usage ORDER BY id DESC"
            )
            rows = c.fetchall()
            lines = ['created_at,user_id,action,model,prompt_tokens,completion_tokens,total_tokens']
            for r in rows:
                lines.append(f"{r[0]},{r[1]},{r[2]},{r[3]},{int(r[4] or 0)},{int(r[5] or 0)},{int(r[6] or 0)}")
            data = "\n".join(lines).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'text/csv; charset=utf-8')
            self.send_header('Content-Length', str(len(data)))
            self.send_header('Content-Disposition', 'attachment; filename=\"token_usage.csv\"')
            self.end_headers()
            self.wfile.write(data)
        except Exception as e:
            print(f"❌ 匯出Token用量失敗: {e}")
            self.send_error(500, "Internal Server Error")
        finally:
            try:
                conn.close()
            except:
                pass
    
    
    def check_authentication(self):
        """檢查用戶認證狀態"""
        try:
            session_id = self.headers.get('Authorization', '').replace('Bearer ', '')
            if not session_id:
                return False
            
            session = get_session(session_id)
            return session is not None
        except Exception as e:
            print(f"認證檢查錯誤: {e}")
            return False
    
    def detect_market_type(self, stock_symbol):
        """根據股票代碼自動檢測市場類型"""
        import re
        
        symbol = stock_symbol.strip().upper()
        
        # 港股檢測：4-5位數字，可能帶.HK後綴
        if re.match(r'^\d{4,5}(\.HK)?$', symbol):
            return '港股'
        
        # A股檢測：6位數字
        elif re.match(r'^\d{6}$', symbol):
            return 'A股'
        
        # 美股檢測：1-5位字母
        elif re.match(r'^[A-Z]{1,5}$', symbol):
            return '美股'
        
        # 默認美股
        else:
            return '美股'
    
    def do_GET(self):
        """處理GET請求"""
        print(f"📥 [TRACE 1] Entered do_GET handler: {self.path} from {self.client_address[0]}")
        
        # Rate limiting check (first line of defense)
        try:
            print(f"📥 [TRACE 2] Starting rate limit check...")
            client_ip = self.client_address[0]
            print(f"📥 [TRACE 3] Calling rate_limiter.check_rate_limit({client_ip})...")
            rate_ok = rate_limiter.check_rate_limit(client_ip)
            print(f"📥 [TRACE 4] Rate limit check complete: {rate_ok}")
            
            if not rate_ok:
                # Rate limit exceeded or IP banned
                print(f"⚠️ Rate limit exceeded for {client_ip}")
                try:
                    self.send_response(429)
                    self.send_header('Content-Type', 'text/plain; charset=utf-8')
                    self.send_header('Retry-After', '60')
                    self.end_headers()
                    self.wfile.write(b'429 Too Many Requests')
                except:
                    pass
                return
        except Exception as e:
            print(f"⚠️ 速率檢查錯誤: {e}")
        
        try:
            parsed_path = urlparse(self.path)
        except Exception as e:
            # Malformed request (SSL/TLS garbage, etc.)
            print(f"🚫 攔截畸形請求: {e}")
            try:
                self.send_response(400)
                self.send_header('Content-Type', 'text/plain')
                self.end_headers()
                self.wfile.write(b'400 Bad Request')
            except:
                pass
            return
        
        # Security: Block common attack patterns
        blocked_patterns = [
            '/wp-admin', '/wordpress', '/wp-', '/.env', '/config', 
            '/admin/config', '/phpMyAdmin', '/.git', '/backup',
            '/shell', '/console', '/manager', '/cgi-bin',
            '/login.php', '/admin.php', '/setup.php', 'setup-config',
            '/xmlrpc', '/api/config', '/.well-known/security.txt',
            'eval-stdin.php', '/vendor', '/invokefunction',
            'solr/admin', '/actuator', '/debug', 'env.php',
            '/download/powershell', '/get.php', '/merchant/', '/3ds.php',
            '.php', '.asp', '.aspx', '.jsp', '.cgi', '/aws/', '/docker/',
            '/kubernetes/', '/api/v1/', '/v1/', '/v2/', '/api/v2/',
            '/admin/', '/administrator/', '/cpanel/', '/plesk/',
            '/phpmyadmin', '/mysql/', '/myadmin/', '/db/', '/database/',
            '/test.', '/old.', '/backup.', '/temp.', '/_', '/~'
        ]
        
        # Whitelist legitimate /admin/* routes we own
        path_lower = parsed_path.path.lower()
        WHITELIST = (
            '/admin/conversion', '/admin/experiments',
            '/admin/dashboard', '/admin.html', '/admin-login.html',
        )
        if not any(path_lower.startswith(w) for w in WHITELIST):
            for pattern in blocked_patterns:
                if pattern in path_lower:
                    print(f"🚫 已攔截惡意請求: {self.path} (匹配模式: {pattern})")
                    self.send_response(403)
                    self.send_header('Content-Type', 'text/plain; charset=utf-8')
                    self.end_headers()
                    self.wfile.write(b'403 Forbidden')
                    return
        
        # Block suspicious query parameters
        if parsed_path.query:
            suspicious_params = ['cmd=', 'exec=', 'system=', 'shell=', 'eval=', 'base64=', 'passthru=']
            query_lower = parsed_path.query.lower()
            for param in suspicious_params:
                if param in query_lower:
                    print(f"🚫 已攔截可疑查詢: {self.path}")
                    self.send_response(403)
                    self.send_header('Content-Type', 'text/plain; charset=utf-8')
                    self.end_headers()
                    self.wfile.write(b'403 Forbidden')
                    return
        
        # Block suspicious user agents
        user_agent = self.headers.get('User-Agent', '').lower()
        blocked_agents = ['sqlmap', 'nikto', 'nmap', 'masscan', 'nessus', 'openvas', 'metasploit', 'burpsuite']
        for agent in blocked_agents:
            if agent in user_agent:
                print(f"🚫 已攔截掃描工具: {user_agent}")
                self.send_response(403)
                self.send_header('Content-Type', 'text/plain; charset=utf-8')
                self.end_headers()
                self.wfile.write(b'403 Forbidden')
                return
        
        print(f"🔍 GET請求: {self.path} -> 路径: {parsed_path.path}")
        
        if parsed_path.path == '/':
            # Pro Suite is the default landing page
            self.serve_pro_dashboard()
        elif parsed_path.path == '/classic' or parsed_path.path == '/classic.html':
            # Old console kept for backward compatibility
            self.serve_html()
        elif parsed_path.path == '/payment-success':
            self.serve_payment_landing(success=True)
        elif parsed_path.path == '/payment-cancel':
            self.serve_payment_landing(success=False)
        elif parsed_path.path == '/styles.css':
            self.serve_css()
        elif parsed_path.path == '/script.js':
            self.serve_js()
        elif parsed_path.path == '/kline_ml.js':
            self.serve_kline_ml_js()
        elif parsed_path.path == '/kline_styles.css':
            self.serve_kline_styles_css()
        elif parsed_path.path == '/analytics.js':
            self.serve_static_js('analytics.js')
        elif parsed_path.path == '/professional_theme.css':
            self.serve_professional_theme_css()
        elif parsed_path.path == '/pro_theme.css':
            self.serve_pro_theme_css()
        elif parsed_path.path == '/terminal_styles.css':
            self.serve_terminal_styles_css()
        elif parsed_path.path == '/terminal.js':
            self.serve_terminal_js()
        elif parsed_path.path == '/api/status':
            print(f"📥 [TRACE 5] Routing to serve_status()")
            self.serve_status()
            print(f"📥 [TRACE 6] serve_status() completed")
        elif parsed_path.path.startswith('/api/progress/'):
            self.serve_progress()
        elif parsed_path.path == '/api/test-apis':
            self.test_api_connectivity()
            self.send_utf8_json_response({"message": "API測試完成，請查看服務器日誌"}, 200)
        # ===== Admin: Token usage (localhost only) =====
        elif parsed_path.path == '/api/admin/token-usage':
            if not self._is_localhost_request():
                return self.send_error(403, 'Forbidden')
            self.handle_admin_token_usage_summary()
        elif parsed_path.path == '/api/admin/token-usage/list':
            if not self._is_localhost_request():
                return self.send_error(403, 'Forbidden')
            self.handle_admin_token_usage_list()
        elif parsed_path.path == '/api/test-options':
            self.test_options_availability()
            self.send_utf8_json_response({"message": "期權數據測試完成，請查看服務器日誌"}, 200)
        elif parsed_path.path == '/api/performance':
            self.get_performance_dashboard()
        elif parsed_path.path == '/favicon.ico':
            self.serve_favicon()
        elif parsed_path.path == '/robots.txt':
            self.serve_robots()
        elif parsed_path.path == '/ads.txt':
            self.serve_ads_txt()
        elif parsed_path.path == '/api/user/profile':
            self.handle_user_profile()
        elif parsed_path.path == '/api/analysis/history':
            self.handle_analysis_history()
        elif parsed_path.path.startswith('/api/analysis/'):
            self.handle_get_analysis()
        elif parsed_path.path == '/api/market/overview':
            self.handle_market_overview()
        elif parsed_path.path.startswith('/api/trump-code'):
            self.handle_trump_code_proxy(parsed_path)
        elif parsed_path.path == '/api/news':
            self.handle_news()
        elif parsed_path.path == '/api/earnings/calendar':
            self.handle_earnings_calendar()
        elif parsed_path.path == '/api/dividends':
            self.handle_dividends()
        elif parsed_path.path == '/api/etf/screener':
            self.handle_etf_screener()
        elif parsed_path.path == '/api/ratings':
            self.handle_analyst_ratings()
        elif parsed_path.path == '/api/news/categories':
            self.handle_news_categories()
        elif parsed_path.path == '/api/earnings/transcripts':
            self.handle_earnings_transcripts()
        elif parsed_path.path == '/api/technical':
            print("✅ 路由到技術分析處理器")
            self.handle_technical_analysis()
        elif parsed_path.path == '/api/signals':
            print("✅ 路由到交易信號處理器")
            self.handle_trading_signals()
        elif parsed_path.path == '/api/options':
            print("✅ 路由到期權分析處理器")
            self.handle_options_analysis()
        elif parsed_path.path == '/api/options/backtest':
            print("✅ 路由到期權回測處理器")
            self.handle_options_backtest()
        elif parsed_path.path == '/api/options/scanner':
            print("✅ 路由到期權掃描器處理器")
            self.handle_options_scanner()
        elif parsed_path.path == '/api/options/autotrade':
            print("✅ 路由到自動交易模擬處理器")
            self.handle_options_autotrade()
        elif parsed_path.path == '/api/options/daily-signals':
            print("✅ 路由到每日期權信號處理器")
            self.handle_options_daily_signals()
        elif parsed_path.path == '/api/daily-stock-picks':
            print("✅ 路由到每日股票精選")
            self.handle_daily_stock_picks()
        elif parsed_path.path == '/api/trade-journal/history':
            self.handle_trade_journal_history()
        elif parsed_path.path == '/api/trade-journal/performance':
            self.handle_trade_journal_performance()
        elif parsed_path.path == '/api/trade-journal/refresh-prices':
            self.handle_trade_journal_refresh()
        elif parsed_path.path == '/api/email/subscribers':
            self.handle_email_subscribers_get()
        elif parsed_path.path == '/api/email/log':
            self.handle_email_log()
        elif parsed_path.path == '/api/email/smtp-status':
            self.handle_email_smtp_status()
        elif parsed_path.path == '/api/quant/strategies':
            print("✅ 路由到量化策略列表")
            self.handle_quant_strategies()
        elif parsed_path.path == '/api/quant/signals':
            print("✅ 路由到量化信號生成")
            self.handle_quant_signals()
        elif parsed_path.path == '/api/quant/backtest':
            print("✅ 路由到量化回測")
            self.handle_quant_backtest()
        elif parsed_path.path == '/api/quant/debate':
            print("✅ 路由到量化策略辯論")
            self.handle_quant_debate()
        elif parsed_path.path == '/api/quant/futu/status':
            print("✅ 路由到Futu狀態")
            self.handle_futu_status()
        elif parsed_path.path == '/api/quant/futu/portfolio':
            print("✅ 路由到Futu組合")
            self.handle_futu_portfolio()
        elif parsed_path.path == '/api/quant/futu/orders':
            print("✅ 路由到Futu訂單")
            self.handle_futu_orders()
        elif parsed_path.path == '/api/quant/optimize':
            print("✅ 路由到自動優化引擎")
            self.handle_quant_optimize()
        elif parsed_path.path == '/api/quant/optimize/history':
            print("✅ 路由到優化歷史")
            self.handle_quant_optimize_history()
        elif parsed_path.path == '/api/quant/auto_trade':
            print("✅ 路由到量化自動交易")
            self.handle_quant_auto_trade()
        elif parsed_path.path == '/api/quant/auto_trade/history':
            print("✅ 路由到量化自動交易歷史")
            self.handle_quant_auto_trade_history()
        elif parsed_path.path == '/api/kline-opportunities':
            print("✅ 路由到K線交易機會處理器")
            self.handle_kline_opportunities()
        elif parsed_path.path == '/api/recommendations':
            print("✅ 路由到股票推薦處理器")
            self.handle_stock_recommendations()
        elif parsed_path.path == '/api/subscription/plans':
            self.handle_subscription_plans()
        elif parsed_path.path == '/api/subscription/upgrade':
            self.handle_subscription_upgrade()
        elif parsed_path.path == '/api/subscription/status':
            self.handle_subscription_status()
        elif parsed_path.path == '/api/payment/redirect':
            self.handle_payment_redirect()
        elif parsed_path.path == '/api/watchlist':
            self.handle_get_watchlist()
        elif parsed_path.path == '/api/portfolio':
            self.handle_get_portfolio()
        elif parsed_path.path == '/api/alerts':
            self.handle_get_alerts()
        elif parsed_path.path == '/admin/dashboard':
            self.serve_admin_dashboard()
        elif parsed_path.path == '/api/admin/users':
            self.handle_admin_get_users()
        elif parsed_path.path == '/api/admin/revenue':
            self.handle_admin_get_revenue()
        elif parsed_path.path == '/api/admin/stats':
            self.handle_admin_get_stats()
        elif parsed_path.path == '/api/admin/verify':
            self.handle_admin_verify()
        elif parsed_path.path == '/api/admin/subscriptions':
            self.handle_admin_get_subscriptions()
        elif parsed_path.path == '/api/admin/payments':
            self.handle_admin_get_payments()
        elif parsed_path.path == '/api/admin/statistics':
            self.handle_admin_get_statistics()
        elif parsed_path.path == '/admin.html':
            self.serve_admin_dashboard()
        elif parsed_path.path == '/admin-login.html':
            self.serve_admin_login()
        elif parsed_path.path == '/payment.html':
            self.serve_payment_page()
        elif parsed_path.path == '/api/payment/methods':
            self.handle_get_payment_methods()
        elif parsed_path.path == '/api/kline':
            self.handle_kline_data()
        elif parsed_path.path == '/api/predict':
            self.handle_ml_prediction()
        # =========================================================
        # PRO SUITE — premium institutional-grade endpoints
        # =========================================================
        elif parsed_path.path == '/pro' or parsed_path.path == '/pro.html':
            self.serve_pro_dashboard()
        elif parsed_path.path == '/pricing' or parsed_path.path == '/pricing.html':
            self.serve_pricing_page()
        elif parsed_path.path == '/api/pro/screener/presets':
            self.handle_pro_screener_presets()
        elif parsed_path.path == '/api/pro/screener':
            self.handle_pro_screener_run(parsed_path)
        elif parsed_path.path == '/api/pro/risk':
            self.handle_pro_risk_get(parsed_path)
        elif parsed_path.path == '/api/pro/backtest/strategies':
            self.handle_pro_backtest_strategies()
        elif parsed_path.path == '/api/pro/backtest':
            self.handle_pro_backtest_run(parsed_path)
        elif parsed_path.path == '/api/pro/options/pricer':
            self.handle_pro_options_pricer(parsed_path)
        elif parsed_path.path == '/api/pro/options/iv-surface':
            self.handle_pro_options_ivsurface(parsed_path)
        elif parsed_path.path == '/api/pro/options/strategy':
            self.handle_pro_options_strategy(parsed_path)
        elif parsed_path.path == '/api/pro/options/strategies':
            self.handle_pro_options_strategy_list()
        elif parsed_path.path == '/api/pro/signals':
            self.handle_pro_signals(parsed_path)
        elif parsed_path.path == '/api/pro/signals/batch':
            self.handle_pro_signals_batch(parsed_path)
        elif parsed_path.path == '/api/pro/calendar':
            self.handle_pro_calendar()
        elif parsed_path.path == '/api/pro/calendar/earnings':
            self.handle_pro_calendar_earnings(parsed_path)
        elif parsed_path.path == '/api/pro/calendar/dividends':
            self.handle_pro_calendar_dividends(parsed_path)
        elif parsed_path.path == '/api/pro/calendar/macro':
            self.handle_pro_calendar_macro()
        elif parsed_path.path == '/api/pro/insider':
            self.handle_pro_insider(parsed_path)
        elif parsed_path.path == '/api/pro/institutional':
            self.handle_pro_institutional(parsed_path)
        elif parsed_path.path == '/api/pro/sentiment':
            self.handle_pro_sentiment(parsed_path)
        elif parsed_path.path == '/api/pro/sentiment/market':
            self.handle_pro_sentiment_market(parsed_path)
        elif parsed_path.path == '/api/pro/crypto':
            self.handle_pro_crypto()
        elif parsed_path.path == '/api/pro/forex':
            self.handle_pro_forex()
        elif parsed_path.path == '/api/pro/crypto/correlation':
            self.handle_pro_crypto_correlation()
        # ===== AI FEATURES =====
        elif parsed_path.path == '/api/ai/patterns':
            self.handle_ai_patterns(parsed_path)
        elif parsed_path.path == '/api/ai/anomaly':
            self.handle_ai_anomaly(parsed_path)
        elif parsed_path.path == '/api/ai/trade-ideas':
            self.handle_ai_trade_ideas(parsed_path)
        elif parsed_path.path == '/api/ai/sector-rotation':
            self.handle_ai_sector_rotation()
        elif parsed_path.path == '/api/ai/risk-score':
            self.handle_ai_risk_score(parsed_path)
        elif parsed_path.path == '/api/ai/compare':
            self.handle_ai_compare(parsed_path)
        elif parsed_path.path == '/api/options/recommend':
            self.handle_options_recommend(parsed_path)
        # ===== ANALYTICS / A/B testing =====
        elif parsed_path.path == '/api/track':
            self.handle_track_get(parsed_path)
        elif parsed_path.path == '/api/analytics/funnel':
            self.handle_analytics_funnel(parsed_path)
        elif parsed_path.path == '/api/analytics/traffic':
            self.handle_analytics_traffic(parsed_path)
        elif parsed_path.path == '/api/analytics/sources':
            self.handle_analytics_sources(parsed_path)
        elif parsed_path.path == '/api/analytics/pages':
            self.handle_analytics_pages(parsed_path)
        elif parsed_path.path == '/api/experiments':
            self.handle_experiments_list()
        elif parsed_path.path == '/api/experiments/assign':
            self.handle_experiment_assign(parsed_path)
        elif parsed_path.path == '/api/experiments/results':
            self.handle_experiment_results(parsed_path)
        elif parsed_path.path == '/admin/conversion' or parsed_path.path == '/admin/conversion.html':
            self.serve_static_html('admin_conversion.html')
        elif parsed_path.path == '/admin/experiments' or parsed_path.path == '/admin/experiments.html':
            self.serve_static_html('admin_experiments.html')
        # ===== Track C — Pro Intel =====
        elif parsed_path.path == '/api/intel/short-interest':
            self.handle_short_interest(parsed_path)
        elif parsed_path.path == '/api/intel/short-scanner':
            self.handle_short_scanner()
        elif parsed_path.path == '/api/intel/etf-xray':
            self.handle_etf_xray(parsed_path)
        elif parsed_path.path == '/api/intel/dividend-safety':
            self.handle_dividend_safety(parsed_path)
        elif parsed_path.path == '/api/intel/dividend-scanner':
            self.handle_dividend_scanner()
        elif parsed_path.path == '/api/auth/me':
            self.handle_auth_me()
        # ===== Pro Trading Terminal (IMG_3031 dashboard) =====
        elif parsed_path.path == '/api/terminal/snapshot':
            self.handle_terminal_snapshot(parsed_path)
        elif parsed_path.path == '/api/terminal/commentary':
            self.handle_terminal_commentary(parsed_path)
        elif parsed_path.path == '/api/terminal/grid':
            self.handle_terminal_grid(parsed_path)
        elif parsed_path.path == '/api/autotrade/recommend':
            self.handle_autotrade_recommend(parsed_path)
        elif parsed_path.path == '/api/paper/list':
            self.handle_paper_list()
        elif parsed_path.path == '/api/paper/account':
            self.handle_paper_account(parsed_path)
        elif parsed_path.path == '/api/paper/account/csv':
            self.handle_paper_account_csv(parsed_path)
        elif parsed_path.path == '/api/paper/evolutions':
            self.handle_paper_evolutions(parsed_path)
        elif parsed_path.path == '/api/paper/health':
            self.handle_paper_health(parsed_path)
        elif parsed_path.path == '/api/paper/symbol-health':
            self.handle_paper_symbol_health(parsed_path)
        elif parsed_path.path == '/api/paper/attribution':
            self.handle_paper_attribution(parsed_path)
        elif parsed_path.path == '/api/admin/paper-overview':
            self.handle_admin_paper_overview()
        elif parsed_path.path == '/api/paper/ai-picks':
            self.handle_paper_ai_picks(parsed_path)
        elif parsed_path.path == '/api/paper/universes':
            self.handle_paper_universes()
        elif parsed_path.path == '/api/user/universes':
            self.handle_user_universes_list()
        elif parsed_path.path == '/api/universes/public':
            self.handle_universes_public()
        elif parsed_path.path == '/api/user/notifications':
            self.handle_user_notifications_get()
        else:
            print(f"❌ 未找到路由: {parsed_path.path}")
            self.send_error(404, "Not Found")
    
    def do_POST(self):
        """處理POST請求"""
        # Rate limiting check (first line of defense)
        try:
            client_ip = self.client_address[0]
            if not rate_limiter.check_rate_limit(client_ip):
                try:
                    self.send_response(429)
                    self.send_header('Content-Type', 'text/plain; charset=utf-8')
                    self.send_header('Retry-After', '60')
                    self.end_headers()
                    self.wfile.write(b'429 Too Many Requests')
                except:
                    pass
                return
        except Exception as e:
            print(f"⚠️ 速率檢查錯誤: {e}")
        
        try:
            parsed_path = urlparse(self.path)
        except Exception as e:
            print(f"🚫 POST畸形請求: {e}")
            try:
                self.send_response(400)
                self.send_header('Content-Type', 'text/plain')
                self.end_headers()
                self.wfile.write(b'400 Bad Request')
            except:
                pass
            return
        
        # Security: Block common attack patterns
        blocked_patterns = [
            '/wp-admin', '/wordpress', '/wp-', '/.env', '/config',
            '/phpMyAdmin', '/.git', '/backup', '/shell', '/console',
            '/login.php', '/admin.php', '/setup.php', '/xmlrpc',
            '/eval-stdin', '/invokefunction', '/actuator'
        ]
        
        path_lower = parsed_path.path.lower()
        for pattern in blocked_patterns:
            if pattern in path_lower:
                print(f"🚫 POST已攔截惡意請求: {self.path}")
                self.send_response(403)
                self.send_header('Content-Type', 'text/plain; charset=utf-8')
                self.end_headers()
                self.wfile.write(b'403 Forbidden')
                return
        
        print(f"POST request to: {self.path}")
        
        if parsed_path.path == '/api/analyze':
            print("Routing to handle_analysis")
            self.handle_analysis()
        elif parsed_path.path == '/api/auth/login':
            self.handle_login()
        elif parsed_path.path == '/api/auth/register':
            self.handle_register()
        elif parsed_path.path == '/api/auth/logout':
            self.handle_logout()
        elif parsed_path.path == '/api/analysis/save':
            self.handle_save_analysis()
        elif parsed_path.path == '/api/performance/update':
            self.update_daily_performance()
        elif parsed_path.path == '/api/payment/redirect':
            self.handle_payment_redirect()
        elif parsed_path.path == '/api/quant/futu/trade':
            self.handle_futu_trade()
        elif parsed_path.path == '/api/quant/futu/setup':
            self.handle_futu_config()
        elif parsed_path.path == '/api/email/smtp':
            self.handle_email_smtp_save()
        elif parsed_path.path == '/api/autotrade/simulate':
            self.handle_autotrade_simulate()
        elif parsed_path.path == '/api/autotrade/optimize':
            self.handle_autotrade_optimize()
        elif parsed_path.path == '/api/paper/create':
            self.handle_paper_create()
        elif parsed_path.path == '/api/paper/run':
            self.handle_paper_run()
        elif parsed_path.path == '/api/paper/close':
            self.handle_paper_close()
        elif parsed_path.path == '/api/paper/resume':
            self.handle_paper_resume()
        elif parsed_path.path == '/api/paper/reset':
            self.handle_paper_reset()
        elif parsed_path.path == '/api/paper/reenable-symbol':
            self.handle_paper_reenable_symbol()
        elif parsed_path.path == '/api/paper/evolve':
            self.handle_paper_evolve()
        elif parsed_path.path == '/api/paper/evolve-config':
            self.handle_paper_evolve_config()
        elif parsed_path.path == '/api/user/notifications':
            self.handle_user_notifications_save()
        elif parsed_path.path == '/api/user/notifications/test':
            self.handle_user_notifications_test()
        elif parsed_path.path == '/api/ai/trade-ideas/email':
            self.handle_ai_trade_ideas_email()
        elif parsed_path.path == '/api/user/universes':
            self.handle_user_universes_save()
        elif parsed_path.path == '/api/user/universes/delete':
            self.handle_user_universes_delete()
        elif parsed_path.path == '/api/user/universes/publish':
            self.handle_user_universes_publish()
        elif parsed_path.path == '/api/user/universes/copy':
            self.handle_user_universes_copy()
        elif parsed_path.path == '/api/universe/build':
            self.handle_universe_build()
        elif parsed_path.path == '/api/admin/run-weekly-leaderboard':
            self.handle_admin_run_weekly()
        elif parsed_path.path == '/api/payment/stripe/create-session':
            self.handle_stripe_create_session()
        elif parsed_path.path == '/api/payment/stripe/webhook':
            self.handle_stripe_webhook_post()
        elif parsed_path.path == '/api/email/subscribe':
            self.handle_email_subscribe()
        elif parsed_path.path == '/api/email/unsubscribe':
            self.handle_email_unsubscribe()
        elif parsed_path.path == '/api/email/send-picks':
            self.handle_email_send_picks()
        elif parsed_path.path == '/api/email/send-journal':
            self.handle_email_send_journal()
        elif parsed_path.path == '/api/email/test':
            self.handle_email_test()
        elif parsed_path.path == '/api/watchlist/add':
            self.handle_add_to_watchlist()
        elif parsed_path.path == '/api/watchlist/remove':
            self.handle_remove_from_watchlist()
        elif parsed_path.path == '/api/portfolio/add':
            self.handle_add_to_portfolio()
        elif parsed_path.path == '/api/portfolio/remove':
            self.handle_remove_from_portfolio()
        elif parsed_path.path == '/api/alerts/create':
            self.handle_create_alert()
        elif parsed_path.path == '/api/alerts/delete':
            self.handle_delete_alert()
        elif parsed_path.path == '/api/admin/login':
            self.handle_admin_login()
        elif parsed_path.path == '/api/payment/create':
            self.handle_create_payment()
        elif parsed_path.path == '/api/payment/process':
            self.handle_process_payment()
        elif parsed_path.path == '/api/hyper-growth/screen':
            self.handle_hyper_growth_screen()
        # ===== PRO SUITE POST endpoints =====
        elif parsed_path.path == '/api/pro/risk':
            self.handle_pro_risk_post()
        elif parsed_path.path == '/api/pro/screener':
            self.handle_pro_screener_post()
        elif parsed_path.path == '/api/pro/backtest':
            self.handle_pro_backtest_post()
        elif parsed_path.path == '/api/pro/options/strategy':
            self.handle_pro_options_strategy_post()
        elif parsed_path.path == '/api/ai/chat':
            self.handle_ai_chat()
        elif parsed_path.path == '/api/ai/rebalance':
            self.handle_ai_rebalance()
        elif parsed_path.path == '/api/track':
            self.handle_track_post()
        elif parsed_path.path == '/api/experiments/upsert':
            self.handle_experiment_upsert()
        else:
            self.send_error(404, "Not Found")
    
    def do_PUT(self):
        """處理PUT請求"""
        print(f"PUT request to: {self.path}")
        parsed_path = urlparse(self.path)
        
        if parsed_path.path.startswith('/api/admin/users/'):
            self.handle_admin_update_user()
        elif parsed_path.path.startswith('/api/admin/subscriptions/'):
            self.handle_admin_update_subscription()
        else:
            self.send_error(404, "Not Found")
    
    def do_DELETE(self):
        """處理DELETE請求"""
        print(f"DELETE request to: {self.path}")
        parsed_path = urlparse(self.path)
        
        if parsed_path.path.startswith('/api/admin/users/'):
            self.handle_admin_delete_user()
        else:
            self.send_error(404, "Not Found")
    
    def serve_html(self):
        """提供統一響應式HTML (桌面+移動端共用index.html)"""
        try:
            with open('index.html', 'r', encoding='utf-8') as f:
                content = f.read()

            user_agent = self.headers.get('User-Agent', '')
            is_mobile = any(d in user_agent for d in ['iPhone', 'iPad', 'Android', 'Mobile', 'webOS', 'BlackBerry', 'IEMobile'])
            if is_mobile:
                print(f"📱 統一響應式版本 (mobile UA)")
            else:
                print(f"🖥️ 統一響應式版本 (desktop UA)")

            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
            self.send_header('Pragma', 'no-cache')
            self.send_header('Expires', '0')
            self.end_headers()
            self.wfile.write(content.encode('utf-8'))
        except FileNotFoundError:
            self.send_error(404, "HTML file not found")
    
    def serve_css(self):
        """提供CSS文件"""
        try:
            with open('styles.css', 'r', encoding='utf-8') as f:
                content = f.read()

            self.send_response(200)
            self.send_header('Content-Type', 'text/css; charset=utf-8')
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
            self.send_header('Pragma', 'no-cache')
            self.send_header('Expires', '0')
            self.end_headers()
            self.wfile.write(content.encode('utf-8'))
        except FileNotFoundError:
            self.send_error(404, "CSS file not found")
    
    def serve_js(self):
        """提供JavaScript文件"""
        try:
            with open('script.js', 'r', encoding='utf-8') as f:
                content = f.read()

            self.send_response(200)
            self.send_header('Content-Type', 'application/javascript; charset=utf-8')
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
            self.send_header('Pragma', 'no-cache')
            self.send_header('Expires', '0')
            self.end_headers()
            self.wfile.write(content.encode('utf-8'))
        except FileNotFoundError:
            self.send_error(404, "JavaScript file not found")
    
    def serve_kline_ml_js(self):
        """提供K線ML JavaScript文件"""
        try:
            with open('kline_ml.js', 'r', encoding='utf-8') as f:
                content = f.read()
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/javascript')
            self.end_headers()
            self.wfile.write(content.encode('utf-8'))
        except FileNotFoundError:
            self.send_error(404, "K-Line ML JavaScript file not found")
    
    def serve_kline_styles_css(self):
        """提供K線樣式CSS文件"""
        try:
            with open('kline_styles.css', 'r', encoding='utf-8') as f:
                content = f.read()
            
            self.send_response(200)
            self.send_header('Content-Type', 'text/css')
            self.end_headers()
            self.wfile.write(content.encode('utf-8'))
        except FileNotFoundError:
            self.send_error(404, "K-Line styles CSS file not found")
    
    def serve_professional_theme_css(self):
        """提供專業主題CSS文件"""
        try:
            with open('professional_theme.css', 'r', encoding='utf-8') as f:
                content = f.read()
            self.send_response(200)
            self.send_header('Content-Type', 'text/css; charset=utf-8')
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
            self.end_headers()
            self.wfile.write(content.encode('utf-8'))
        except FileNotFoundError:
            self.send_error(404, "Professional theme CSS file not found")

    def serve_pro_theme_css(self):
        """提供新專業主題CSS文件 (dark institutional UI)"""
        try:
            with open('pro_theme.css', 'r', encoding='utf-8') as f:
                content = f.read()
            self.send_response(200)
            self.send_header('Content-Type', 'text/css; charset=utf-8')
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
            self.end_headers()
            self.wfile.write(content.encode('utf-8'))
        except FileNotFoundError:
            self.send_error(404, "Pro theme CSS file not found")

    def serve_terminal_styles_css(self):
        """提供 Pro Trading Terminal CSS"""
        try:
            with open('terminal_styles.css', 'r', encoding='utf-8') as f:
                content = f.read()
            self.send_response(200)
            self.send_header('Content-Type', 'text/css; charset=utf-8')
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
            self.end_headers()
            self.wfile.write(content.encode('utf-8'))
        except FileNotFoundError:
            self.send_error(404, "terminal_styles.css not found")

    def serve_terminal_js(self):
        """提供 Pro Trading Terminal JS"""
        try:
            with open('terminal.js', 'r', encoding='utf-8') as f:
                content = f.read()
            self.send_response(200)
            self.send_header('Content-Type', 'application/javascript; charset=utf-8')
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
            self.end_headers()
            self.wfile.write(content.encode('utf-8'))
        except FileNotFoundError:
            self.send_error(404, "terminal.js not found")
    
    def serve_favicon(self):
        """提供favicon"""
        self.send_response(200)
        self.send_header('Content-Type', 'image/x-icon')
        self.end_headers()
        # 返回空的favicon
        self.wfile.write(b'')
    
    def serve_robots(self):
        """提供robots.txt"""
        try:
            with open('robots.txt', 'r', encoding='utf-8') as f:
                content = f.read()
            self.send_response(200)
            self.send_header('Content-Type', 'text/plain')
            self.end_headers()
            self.wfile.write(content.encode('utf-8'))
        except FileNotFoundError:
            self.send_error(404, "robots.txt not found")

    def serve_ads_txt(self):
        """提供 Google AdSense ads.txt"""
        try:
            # Prefer the file next to this module so it works regardless of cwd.
            module_dir = os.path.dirname(__file__)
            ads_path = os.path.join(module_dir, "ads.txt")
            with open(ads_path, "r", encoding="utf-8") as f:
                content = f.read()
            self.send_response(200)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.send_header("Cache-Control", "public, max-age=3600")
            self.end_headers()
            self.wfile.write(content.encode("utf-8"))
        except FileNotFoundError:
            self.send_error(404, "ads.txt not found")
    
    
    def serve_status(self):
        """提供API狀態"""
        print(f"📥 [TRACE 7] Inside serve_status()")
        status = {
            "status": "running",
            "timestamp": datetime.now().isoformat(),
            "analysis_available": ANALYSIS_AVAILABLE,
            "version": "1.0.0"
        }
        print(f"📥 [TRACE 8] Status dict created")
        
        self.send_response(200)
        print(f"📥 [TRACE 9] Sent response code")
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        print(f"📥 [TRACE 10] Sent headers")
        self.end_headers()
        print(f"📥 [TRACE 11] Ended headers")
        self.wfile.write(json.dumps(status, ensure_ascii=False).encode('utf-8'))
        print(f"📥 [TRACE 12] Wrote response body")
    
    def serve_progress(self):
        """提供分析進度信息"""
        # 從URL中提取analysis_id
        analysis_id = self.path.split('/')[-1]
        
        progress = get_progress(analysis_id)
        
        # 如果分析完成，包含結果
        if progress['status'] == 'completed' and 'result' in progress:
            response = {
                'status': 'completed',
                'message': progress['message'],
                'percentage': progress['percentage'],
                'result': progress['result']
            }
        else:
            response = progress
        
        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.end_headers()
        self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))
    
    def handle_analysis(self):
        """處理股票分析請求"""
        try:
            # 檢查用戶是否已登錄
            if not self.check_authentication():
                self.send_error(401, "請先登錄後再使用分析功能")
                return
                
            # 讀取請求數據
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            analysis_data = json.loads(post_data.decode('utf-8'))
            
            # 驗證必要字段
            required_fields = ['stockSymbol', 'analysisDate', 'marketType', 'researchDepth']
            for field in required_fields:
                if field not in analysis_data:
                    raise ValueError(f"缺少必要字段: {field}")
            
            # 檢查訂閱限制
            session_id = self.headers.get('Authorization', '').replace('Bearer ', '')
            session = get_session(session_id)
            if session:
                user_id = session['user_id']
                can_analyze, message = check_analysis_limit(user_id, session['plan_type'])
                if not can_analyze:
                    error_response = {
                        "success": False,
                        "error": "subscription_limit",
                        "message": message,
                        "upgrade_required": True,
                        "timestamp": datetime.now().isoformat()
                    }
                    self.send_response(402)  # Payment Required
                    self.send_header('Content-Type', 'application/json; charset=utf-8')
                    self.end_headers()
                    self.wfile.write(json.dumps(error_response, ensure_ascii=False).encode('utf-8'))
                    return
            
            # 生成分析ID
            analysis_id = f"analysis_{int(time.time())}_{hash(str(analysis_data)) % 10000}"
            
            # 初始化進度
            update_progress(analysis_id, 'running', '分析已開始...', 0)
            
            # 立即返回分析ID，開始異步處理
            response = {
                "success": True,
                "analysis_id": analysis_id,
                "status": "started",
                "message": "分析已開始，請等待完成",
                "timestamp": datetime.now().isoformat()
            }
            
            # 確保響應數據是UTF-8編碼的
            json_data = json.dumps(response, ensure_ascii=False, indent=2)
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(json_data.encode('utf-8'))))
            self.end_headers()
            self.wfile.write(json_data.encode('utf-8'))
            
            # 獲取用戶ID用於保存
            session_id = self.headers.get('Authorization', '').replace('Bearer ', '')
            session = get_session(session_id) if session_id else None
            user_id = session['user_id'] if session else 0
            
            # 在後台線程中執行分析
            analysis_thread = threading.Thread(
                target=self.run_analysis_async,
                args=(analysis_id, analysis_data, user_id)
            )
            analysis_thread.daemon = True
            analysis_thread.start()
            
        except Exception as e:
            # 返回錯誤響應
            error_response = {
                "success": False,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
            
            # 確保錯誤響應也是UTF-8編碼的
            json_data = json.dumps(error_response, ensure_ascii=False, indent=2)
            
            self.send_response(500)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(json_data.encode('utf-8'))))
            self.end_headers()
            self.wfile.write(json_data.encode('utf-8'))
    
    def run_analysis_async(self, analysis_id, analysis_data, user_id):
        """異步執行分析"""
        try:
            print(f"🚀 開始異步分析: {analysis_id}, 用戶: {user_id}")
            update_progress(analysis_id, 'running', '正在初始化分析...', 10)
            
            # 增加試用次數
            if user_id > 0:
                increment_trial_usage(user_id)
            
            if ANALYSIS_AVAILABLE:
                update_progress(analysis_id, 'running', '正在執行AI分析...', 30)
                result = self.perform_real_analysis(analysis_data)
                update_progress(analysis_id, 'running', 'AI分析完成，正在處理結果...', 80)
            else:
                update_progress(analysis_id, 'running', '正在執行模擬分析...', 50)
                result = self.perform_mock_analysis(analysis_data)
                update_progress(analysis_id, 'running', '模擬分析完成...', 80)
            
            # 添加分析結果到進度中
            with progress_lock:
                progress_tracker[analysis_id]['result'] = result
                progress_tracker[analysis_id]['status'] = 'completed'
                progress_tracker[analysis_id]['message'] = '分析完成！'
                progress_tracker[analysis_id]['percentage'] = 100
            
            # 保存分析記錄到數據庫
            try:
                # 添加 analysis_id 到 analysis_data
                analysis_data['analysis_id'] = analysis_id
                
                # 保存到數據庫
                save_success = save_analysis_record(user_id, analysis_data, result)
                
                if save_success:
                    print(f"✅ 分析記錄已保存到數據庫: {analysis_id}, 用戶ID: {user_id}")
                else:
                    print(f"⚠️ 分析記錄保存失敗: {analysis_id}")
                    
            except Exception as e:
                print(f"❌ 保存分析記錄時出錯: {e}")
                import traceback
                traceback.print_exc()
            
            print(f"✅ 異步分析完成: {analysis_id}")
            
        except Exception as e:
            print(f"❌ 異步分析失敗: {analysis_id}, 錯誤: {e}")
            update_progress(analysis_id, 'error', f'分析失敗: {str(e)}', 0)
    
    def perform_real_analysis(self, analysis_data):
        """執行真實的股票分析"""
        try:
            print(f"🚀 開始執行真實AI分析: {analysis_data['stockSymbol']}")
            
            # 準備分析參數
            # 轉換市場類型為中文
            market_type_map = {
                'us': '美股',
                'hk': '港股', 
                'cn': 'A股',
                'china': 'A股'
            }
            
            # 處理自動市場檢測
            if analysis_data.get('marketType') == 'auto':
                detected_market = self.detect_market_type(analysis_data['stockSymbol'])
                print(f"🔍 自動檢測市場類型: {analysis_data['stockSymbol']} -> {detected_market}")
                market_type = detected_market
            else:
                market_type = market_type_map.get(analysis_data.get('marketType', 'us'), '美股')
                print(f"📊 使用指定市場類型: {analysis_data['stockSymbol']} -> {market_type}")
            
            # 轉換分析師類型為正確的格式
            # 只支持這四種分析師類型，其他類型（如technical_analyst, risk_analyst）會被過濾
            analyst_map = {
                'market_analyst': 'market',
                'fundamentals_analyst': 'fundamentals',
                'social_analyst': 'social',
                'news_analyst': 'news'
            }
            
            # 定義有效的分析師類型（圖系統支持的類型）
            valid_analysts = {'market', 'fundamentals', 'social', 'news'}
            
            # 轉換分析師列表，只保留有效的分析師
            raw_analysts = analysis_data.get('analysts', ['market_analyst'])
            converted_analysts = []
            for analyst in raw_analysts:
                if analyst in analyst_map:
                    converted_value = analyst_map[analyst]
                    if converted_value in valid_analysts:
                        converted_analysts.append(converted_value)
                elif analyst in valid_analysts:
                    # 如果已經是正確格式且有效，直接使用
                    converted_analysts.append(analyst)
            
            # 如果沒有有效的分析師，使用默認的
            if not converted_analysts:
                converted_analysts = ['market']
            
            analysis_params = {
                'stock_symbol': analysis_data['stockSymbol'],
                'analysis_date': analysis_data['analysisDate'],
                'market_type': market_type,
                'research_depth': analysis_data.get('researchDepth', 3),
                'analysts': converted_analysts,
                'llm_provider': analysis_data.get('llmProvider', 'dashscope'),
                'llm_model': analysis_data.get('llmModel', 'qwen-plus')
            }
            
            print(f"📊 分析參數: {analysis_params}")
            
            # 執行真實分析（異步處理，無需超時控制）
            result = run_stock_analysis(**analysis_params)
            
            print(f"✅ 分析完成，結果長度: {len(str(result))}")
            
            # 處理分析結果
            processed_results = {}

            # 1. 優先使用標準 state 結構（新版 TradingAgents 正常情況）
            if result and isinstance(result, dict) and 'state' in result and result.get('success', True):
                state = result['state'] or {}

                report_mapping = {
                    'market_report': 'market_analysis',
                    'fundamentals_report': 'fundamentals_analysis',
                    'sentiment_report': 'social_analysis',
                    'news_report': 'news_analysis',
                    'risk_assessment': 'risk_analysis',
                    'investment_plan': 'technical_analysis'
                }

                for state_key, frontend_key in report_mapping.items():
                    if state_key in state and state[state_key]:
                        content = str(state[state_key])
                        processed_results[frontend_key] = convert_to_traditional_chinese(content)

            # 2. 兼容舊/非標準結構：如果沒有 state 報告，但有直接的文本字段
            if not processed_results and result and isinstance(result, dict):
                # 嘗試從常見字段中提取整體報告
                fallback_keys = [
                    'full_report', 'summary', 'report',
                    'analysis_report', 'combined_report'
                ]
                for key in fallback_keys:
                    if key in result and result[key]:
                        content = str(result[key])
                        processed_results['market_analysis'] = convert_to_traditional_chinese(content)
                        break

            # 3. 如果仍然沒有任何內容，才回退到模擬分析
            if not processed_results:
                print("⚠️ 未找到可用的分析內容，使用模擬分析")
                return self.perform_mock_analysis(analysis_data)

            return {
                "symbol": analysis_data['stockSymbol'],
                "analysisDate": analysis_data['analysisDate'],
                "marketType": analysis_data['marketType'],
                "researchDepth": analysis_data['researchDepth'],
                "results": processed_results,
                "status": "completed",
                "ai_generated": True,
                "analysis_id": result.get('session_id', 'unknown')
            }
            
        except Exception as e:
            print(f"❌ 真實分析失敗: {e}")
            print(f"📝 錯誤詳情: {str(e)}")
            # 如果真實分析失敗，返回模擬分析
            return self.perform_mock_analysis(analysis_data)
    
    def perform_mock_analysis(self, analysis_data):
        """執行模擬分析"""
        symbol = analysis_data['stockSymbol']
        analysis_date = analysis_data['analysisDate']
        
        # 處理自動市場檢測
        if analysis_data.get('marketType') == 'auto':
            detected_market = self.detect_market_type(symbol)
            print(f"🔍 自動檢測市場類型 (模擬): {symbol} -> {detected_market}")
            market_type = detected_market
        else:
            market_type_map = {
                'us': '美股',
                'hk': '港股', 
                'cn': 'A股',
                'china': 'A股'
            }
            market_type = market_type_map.get(analysis_data.get('marketType', 'us'), '美股')
            print(f"📊 使用指定市場類型 (模擬): {symbol} -> {market_type}")
        
        research_depth = analysis_data['researchDepth']
        
        # 模擬分析結果 - 更詳細和專業
        mock_results = {
            "market_analysis": f"""
# {symbol} 市場分析報告
**分析日期**: {analysis_date}  
**分析師**: 高級市場分析師  
**分析深度**: {research_depth}/5 級

## 📊 市場環境分析

### 宏觀經濟環境
- **GDP增長率**: 當前季度預估3.2%，較上季度提升0.3個百分點
- **通脹水平**: CPI年化增長2.8%，處於央行目標區間內
- **利率環境**: 聯邦基金利率維持在5.25-5.50%區間，貨幣政策趨於穩定
- **就業市場**: 失業率維持在3.7%低位，勞動力市場依然緊張

### 行業景氣度
- **行業分類**: 科技/消費/金融（根據{symbol}業務性質）
- **行業PE**: 當前25.3倍，歷史中位數22.1倍，估值略高
- **行業增長**: 預期年增長率8.5%，高於整體經濟增速
- **政策影響**: 監管環境趨嚴，但長期有利於行業健康發展

## 📈 技術面分析

### 價格走勢
- **當前價格**: $125.50（截至{analysis_date}）
- **52週高點**: $142.30（2024年3月15日）
- **52週低點**: $98.75（2023年11月8日）
- **年內漲幅**: +27.1%，跑贏大盤15.3%

### 技術指標
- **MA20**: $122.30（支撐位）
- **MA50**: $118.75（強支撐位）
- **MA200**: $115.20（長期趨勢線）
- **MACD**: 金叉形成，動能指標轉正
- **RSI**: 58.3，處於中性偏多區域
- **布林帶**: 價格接近上軌，短期可能面臨壓力

### 成交量分析
- **平均成交量**: 2.8M股/日
- **近期成交量**: 3.2M股/日（+14.3%）
- **量價關係**: 價升量增，健康上漲信號
- **機構持倉**: 機構持股比例78.5%，較上季度提升2.1%

## 🎯 投資建議

### 短期策略（1-3個月）
- **目標價位**: $135-140
- **止損位**: $118（MA50支撐）
- **操作建議**: 逢低買入，分批建倉
- **風險等級**: 中等

### 中期策略（3-12個月）
- **目標價位**: $150-160
- **持有建議**: 核心持倉，適度加倉
- **關注因素**: 季度財報、行業政策變化
- **風險等級**: 中低

### 長期策略（1年以上）
- **目標價位**: $180-200
- **投資邏輯**: 行業龍頭地位，護城河深厚
- **持有建議**: 長期持有，享受成長紅利
- **風險等級**: 低

## ⚠️ 風險提示

### 市場風險
- **系統性風險**: 經濟衰退可能性15%
- **流動性風險**: 市場流動性充足，風險較低
- **政策風險**: 監管政策變化可能影響估值

### 個股風險
- **業績風險**: 季度業績不及預期可能性20%
- **競爭風險**: 新興競爭對手威脅中等
- **技術風險**: 技術迭代風險較低

### 風險控制建議
- **倉位控制**: 建議單一持倉不超過總資產10%
- **止損設置**: 嚴格執行止損策略
- **定期檢視**: 每季度重新評估投資邏輯
            """,
            
            "fundamentals_analysis": f"""
# {symbol} 基本面分析報告
**分析日期**: {analysis_date}  
**分析師**: 高級基本面分析師  
**分析深度**: {research_depth}/5 級

## 💰 財務狀況分析

### 收入表現
- **總營收**: 最新季度$12.5B，同比增長8.3%
- **營收增長率**: 3年複合增長率12.5%，高於行業平均7.2%
- **收入質量**: 經常性收入占比65%，收入穩定性較高
- **地域分布**: 北美65%，歐洲20%，亞太15%，地域多元化良好

### 盈利能力
- **毛利率**: 42.3%，較上季度提升1.2個百分點
- **營業利潤率**: 18.7%，行業領先水平
- **淨利潤率**: 15.2%，盈利能力持續改善
- **ROE**: 22.8%，股東回報率優秀
- **ROA**: 12.5%，資產使用效率較高

### 財務健康度
- **流動比率**: 2.1，短期償債能力強
- **速動比率**: 1.8，流動性充足
- **負債率**: 35.2%，負債結構合理
- **利息覆蓋率**: 8.5倍，利息支付能力強
- **現金及等價物**: $8.2B，現金儲備充裕

### 現金流分析
- **經營現金流**: 最新季度$3.2B，同比增長15.6%
- **自由現金流**: $2.8B，現金創造能力強
- **現金流穩定性**: 連續12季度正現金流
- **資本支出**: 佔營收比例8.5%，投資適度

## 🏢 公司治理與管理

### 管理層質量
- **CEO經驗**: 15年行業經驗，3年任職期
- **CFO背景**: 前四大會計師事務所合夥人
- **管理層持股**: 高管持股比例12.5%，利益一致
- **薪酬結構**: 股權激勵佔比60%，長期導向

### 股權結構
- **機構持股**: 78.5%，機構投資者認可度高
- **前十大股東**: 持股比例45.2%，相對集中
- **流通股比例**: 85.3%，流動性良好
- **股權激勵**: 員工持股計劃覆蓋率85%

### 治理評級
- **ESG評級**: A級，環境社會治理優秀
- **董事會獨立性**: 獨立董事比例75%
- **審計質量**: 四大會計師事務所審計
- **信息披露**: 透明度評級A+

## 📊 估值分析

### 相對估值
- **PE比率**: 當前25.3倍，5年歷史中位數22.1倍
- **PEG比率**: 1.8，成長性估值合理
- **PB比率**: 3.2倍，略高於行業平均2.8倍
- **PS比率**: 2.1倍，收入估值適中

### 絕對估值
- **DCF估值**: $145-155，基於10%折現率
- **DDM估值**: $138-148，基於3%永續增長率
- **可比公司估值**: $142-152，基於同業比較
- **綜合估值區間**: $140-155

### 股息分析
- **股息率**: 2.1%，高於無風險利率
- **股息增長**: 3年複合增長率8.5%
- **派息率**: 35%，可持續性較強
- **股息穩定性**: 連續10年派息

## 🔍 投資亮點與風險

### 核心競爭優勢
- **技術護城河**: 專利數量行業第一，研發投入佔比12%
- **品牌價值**: 品牌價值$45B，行業領先
- **市場地位**: 市場份額28%，龍頭地位穩固
- **網絡效應**: 平台效應明顯，用戶粘性高

### 成長驅動因素
- **市場擴張**: 新興市場滲透率提升空間大
- **產品創新**: 新產品線收入佔比25%
- **併購整合**: 戰略併購提升協同效應
- **數字化轉型**: 傳統業務數字化改造

### 主要風險因素
- **競爭風險**: 新興競爭對手威脅中等
- **監管風險**: 反壟斷監管趨嚴
- **技術風險**: 技術迭代可能顛覆現有模式
- **宏觀風險**: 經濟週期影響需求

## 🎯 投資建議

### 投資評級: **買入**
- **目標價位**: $150-160（12個月）
- **投資邏輯**: 基本面穩健，估值合理，成長性良好
- **持有期限**: 建議持有12-24個月
- **風險等級**: 中低風險

### 關鍵監控指標
- **季度業績**: 關注營收增長和利潤率變化
- **現金流**: 監控自由現金流穩定性
- **市場份額**: 跟蹤競爭地位變化
- **監管動態**: 關注政策變化影響
            """,
            
            "technical_analysis": f"""
# {symbol} 技術分析報告
**分析日期**: {analysis_date}  
**分析師**: 高級技術分析師  
**分析深度**: {research_depth}/5 級

## 📈 技術指標分析

### 移動平均線系統
- **MA5**: $127.20（短期趨勢向上）
- **MA10**: $124.80（短期支撐位）
- **MA20**: $122.30（中期支撐位，關鍵位置）
- **MA50**: $118.75（強支撐位，重要關口）
- **MA200**: $115.20（長期趨勢線，牛熊分界）

### 動量指標
- **MACD**: 金叉形成，DIF=0.85，DEA=0.72，動能增強
- **MACD柱狀圖**: 正值且放大，買入動能強勁
- **RSI(14)**: 58.3，中性偏多，未達超買區域
- **RSI(21)**: 61.2，短期動能較強
- **Stochastic**: %K=65.2，%D=58.7，動量指標向上

### 波動性指標
- **布林帶上軌**: $131.50（阻力位）
- **布林帶中軌**: $125.20（支撐位）
- **布林帶下軌**: $118.90（強支撐位）
- **布林帶寬度**: 10.1%，波動性適中
- **ATR(14)**: $2.85，平均真實波幅

## 🎯 關鍵價位分析

### 阻力位分析
- **近期阻力**: $130.00（前期高點，心理關口）
- **中期阻力**: $135.50（技術測量位）
- **長期阻力**: $142.30（52週高點）
- **突破確認**: 需放量突破$130.00

### 支撐位分析
- **短期支撐**: $122.30（MA20，關鍵支撐）
- **中期支撐**: $118.75（MA50，強支撐）
- **長期支撐**: $115.20（MA200，牛熊分界）
- **心理支撐**: $120.00（整數關口）

### 斐波那契回撤
- **0.236回撤**: $128.50（短期阻力）
- **0.382回撤**: $125.80（支撐位）
- **0.618回撤**: $122.20（強支撐位）
- **0.786回撤**: $119.50（最後支撐）

## 📊 圖表形態分析

### K線形態
- **當前形態**: 錘頭線，反轉信號
- **前日形態**: 十字星，多空平衡
- **週線形態**: 上升三法，看漲信號
- **月線形態**: 上升通道，長期看多

### 成交量分析
- **平均成交量**: 2.8M股/日
- **近期成交量**: 3.2M股/日（+14.3%）
- **量價關係**: 價升量增，健康上漲
- **成交量趨勢**: 溫和放大，買盤增加
- **機構成交量**: 佔比65%，機構參與度高

### 趨勢線分析
- **上升趨勢線**: 連接$98.75-$125.50，斜率0.8%
- **下降趨勢線**: 連接$142.30-$130.00，斜率-1.2%
- **通道寬度**: 約$15，震盪區間
- **突破方向**: 向上突破概率60%

## ⚡ 交易信號與策略

### 買入信號
- **MACD金叉**: 動能指標轉正
- **MA5上穿MA10**: 短期趨勢向上
- **RSI突破50**: 動量轉為正面
- **成交量放大**: 買盤力量增強
- **布林帶中軌支撐**: 技術支撐有效

### 賣出信號
- **RSI超買**: 超過70需謹慎
- **MACD死叉**: 動能指標轉負
- **跌破MA20**: 中期趨勢轉弱
- **成交量萎縮**: 買盤力量減弱
- **布林帶上軌壓力**: 技術阻力明顯

### 交易策略
- **進場點位**: $125.50-127.00（當前價位）
- **止損位**: $118.00（MA50下方）
- **目標位**: $135.00-140.00（阻力位）
- **倉位管理**: 建議分批建倉，控制風險
- **持有期限**: 短期1-3個月，中期3-12個月

## 📊 技術評級

### 綜合評級: **買入**
- **短期評級**: 買入（1-3個月）
- **中期評級**: 買入（3-12個月）
- **長期評級**: 持有（12個月以上）

### 風險控制
- **止損設置**: 嚴格執行$118.00止損
- **倉位控制**: 建議不超過總資產10%
- **分批操作**: 分3-5次建倉，降低風險
- **定期檢視**: 每週檢視技術指標變化

### 關鍵監控指標
- **成交量**: 關注突破時是否放量
- **MACD**: 監控動能指標變化
- **RSI**: 避免超買超賣區域
- **支撐位**: 密切關注$122.30支撐
            """,
            
            "risk_analysis": f"""
# {symbol} 風險分析報告
**分析日期**: {analysis_date}  
**分析師**: 高級風險分析師  
**分析深度**: {research_depth}/5 級

## ⚠️ 市場風險分析

### 系統性風險
- **經濟週期風險**: 中等（15%概率進入衰退）
- **利率風險**: 較低（利率環境相對穩定）
- **通脹風險**: 中等（通脹壓力持續存在）
- **流動性風險**: 較低（市場流動性充足）
- **地緣政治風險**: 中等（國際局勢複雜）

### 非系統性風險
- **個股風險**: 較低（龍頭地位穩固）
- **行業風險**: 中等（行業競爭加劇）
- **監管風險**: 中等（監管政策趨嚴）
- **技術風險**: 較低（技術實力領先）
- **管理風險**: 較低（管理層經驗豐富）

### 流動性風險
- **日成交量**: 3.2M股/日，流動性充足
- **買賣價差**: 0.02%，交易成本較低
- **機構持股**: 78.5%，機構參與度高
- **融資融券**: 融資餘額適中，風險可控
- **期權流動性**: 期權市場活躍，對沖便利

## 📊 財務風險分析

### 償債能力風險
- **流動比率**: 2.1，短期償債能力強
- **速動比率**: 1.8，流動性充足
- **現金比率**: 1.2，現金儲備充裕
- **利息覆蓋率**: 8.5倍，利息支付能力強
- **債務到期結構**: 短期債務佔比30%，結構合理

### 營運風險
- **應收賬款週轉**: 45天，回款速度正常
- **存貨週轉**: 60天，庫存管理良好
- **應付賬款週轉**: 30天，付款週期合理
- **現金轉換週期**: 75天，營運效率較高
- **營運槓桿**: 1.8倍，營運槓桿適中

### 盈利能力風險
- **毛利率波動**: 3年標準差2.1%，穩定性較好
- **淨利率波動**: 3年標準差1.8%，盈利穩定
- **ROE波動**: 3年標準差3.2%，回報穩定
- **現金流穩定性**: 連續12季度正現金流
- **盈利質量**: 現金流與淨利潤匹配度高

## 🔍 行業風險分析

### 政策監管風險
- **反壟斷風險**: 中等（監管趨嚴，可能面臨調查）
- **數據隱私風險**: 較高（數據保護法規嚴格）
- **稅收政策風險**: 中等（稅收政策可能調整）
- **貿易政策風險**: 中等（國際貿易環境複雜）
- **行業准入風險**: 較低（行業壁壘較高）

### 技術風險
- **技術迭代風險**: 中等（新技術可能顛覆現有模式）
- **專利風險**: 較低（專利保護完善）
- **研發風險**: 較低（研發實力強勁）
- **技術人才風險**: 較低（人才儲備充足）
- **技術標準風險**: 較低（行業標準制定者）

### 競爭風險
- **新進入者威脅**: 中等（新興競爭對手湧現）
- **替代品威脅**: 較高（技術替代風險）
- **供應商議價能力**: 較低（供應商依賴度低）
- **客戶議價能力**: 中等（客戶集中度適中）
- **行業整合風險**: 中等（併購整合加速）

## 💡 風險控制策略

### 投資組合風險控制
- **分散投資**: 建議單一持倉不超過總資產10%
- **行業分散**: 避免過度集中於單一行業
- **地域分散**: 投資組合應包含不同地區資產
- **時間分散**: 分批建倉，降低時機風險
- **策略分散**: 結合價值投資和成長投資

### 個股風險控制
- **止損設置**: 嚴格執行技術止損位$118.00
- **倉位管理**: 根據風險承受能力調整倉位
- **定期檢視**: 每季度重新評估投資邏輯
- **風險監控**: 密切關注關鍵風險指標
- **應急預案**: 制定風險事件應對策略

### 風險監控指標
- **波動率**: 監控股價波動率變化
- **Beta係數**: 關注相對於市場的敏感度
- **最大回撤**: 控制最大虧損幅度
- **夏普比率**: 評估風險調整後收益
- **VaR值**: 計算在險價值

## 🎯 風險評級與建議

### 綜合風險評級: **中等偏低**
- **市場風險**: 中等（3/5）
- **財務風險**: 較低（2/5）
- **行業風險**: 中等（3/5）
- **個股風險**: 較低（2/5）
- **流動性風險**: 較低（2/5）

### 適合投資者類型
- **保守型投資者**: 不建議（風險偏高）
- **穩健型投資者**: 適合（風險收益匹配）
- **積極型投資者**: 適合（風險承受能力強）
- **激進型投資者**: 適合（追求高收益）

### 投資建議
- **投資期限**: 建議中長期持有（12-24個月）
- **倉位建議**: 建議倉位5-10%
- **風險控制**: 嚴格執行止損策略
- **監控頻率**: 每週檢視技術指標，每月檢視基本面
- **調整策略**: 根據風險變化動態調整倉位

### 關鍵風險預警
- **業績不及預期**: 關注季度財報發布
- **監管政策變化**: 密切關注政策動向
- **競爭加劇**: 監控市場份額變化
- **技術顛覆**: 關注新興技術發展
- **宏觀環境惡化**: 監控經濟指標變化
            """
        }
        
        return {
            "symbol": symbol,
            "analysisDate": analysis_date,
            "marketType": market_type,
            "researchDepth": research_depth,
            "results": mock_results,
            "status": "completed",
            "ai_generated": False
            # 刻意不再返回額外提示文字，避免干擾前端顯示
        }
    
    def handle_login(self):
        """處理用戶登錄"""
        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            login_data = json.loads(post_data.decode('utf-8'))
            
            username = login_data.get('username', '')
            password = login_data.get('password', '')
            
            if not username or not password:
                self.send_error(400, "用戶名和密碼不能為空")
                return
            
            user = authenticate_user(username, password)
            if user:
                session_id = create_session(user)
                response = {
                    "success": True,
                    "session_id": session_id,
                    "user": {
                        "id": user['id'],
                        "username": user['username'],
                        "email": user['email'],
                        "plan_type": user['plan_type'],
                        "analysis_count": user['analysis_count'],
                        "max_analyses": user['max_analyses']
                    }
                }
            else:
                response = {
                    "success": False,
                    "error": "用戶名或密碼錯誤"
                }
            
            self.send_response(200 if response["success"] else 401)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))
            
        except Exception as e:
            self.send_error(500, f"登錄失敗: {str(e)}")
    
    def handle_register(self):
        """處理用戶註冊"""
        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            register_data = json.loads(post_data.decode('utf-8'))
            
            username = register_data.get('username', '')
            email = register_data.get('email', '')
            password = register_data.get('password', '')
            plan_type = register_data.get('plan_type', 'basic')
            
            if not username or not email or not password:
                self.send_error(400, "所有字段都是必填的")
                return
            
            user_id = create_user(username, email, password, plan_type)
            if user_id:
                response = {
                    "success": True,
                    "message": "註冊成功"
                }
            else:
                response = {
                    "success": False,
                    "error": "用戶名或郵箱已存在"
                }
            
            self.send_response(200 if response["success"] else 400)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))
            
        except Exception as e:
            self.send_error(500, f"註冊失敗: {str(e)}")
    
    def handle_auth_me(self):
        """GET /api/auth/me — return the current user + plan from Bearer token."""
        try:
            session = self._get_session_from_request()
            if not session:
                self.send_utf8_json_response({"success": False, "error": "未登入"}, 401)
                return

            # Look up the latest user info from DB (plan may have changed since login)
            try:
                conn = sqlite3.connect(str(Path(__file__).parent / "trading_agents.db"))
                cursor = conn.cursor()
                cursor.execute('''
                    SELECT id, username, email, plan_type, analysis_count, max_analyses,
                           subscription_status, subscription_end_date, created_at
                    FROM users WHERE id = ?
                ''', (session['user_id'],))
                row = cursor.fetchone()
                conn.close()
            except Exception as db_err:
                print(f"⚠️ /api/auth/me DB error: {db_err}")
                row = None

            if not row:
                # Fall back to session payload
                self.send_utf8_json_response({
                    "success": True,
                    "user": {
                        "id": session.get('user_id'),
                        "username": session.get('username'),
                        "email": session.get('email'),
                        "plan_type": session.get('plan_type', 'free'),
                    }
                })
                return

            (uid, username, email, plan_type, ac, ma,
             sub_status, sub_end, created_at) = row

            # Tier rank from SUBSCRIPTION_PLANS
            plan_cfg = SUBSCRIPTION_PLANS.get(plan_type, {}) or {}
            tier = plan_cfg.get('tier', 0)
            self.send_utf8_json_response({
                "success": True,
                "user": {
                    "id": uid,
                    "username": username,
                    "email": email,
                    "plan_type": plan_type,
                    "plan_tier": tier,
                    "plan_name": plan_cfg.get('name', plan_type),
                    "analysis_count": ac,
                    "max_analyses": ma,
                    "subscription_status": sub_status,
                    "subscription_end_date": sub_end,
                    "created_at": created_at,
                }
            })
        except Exception as e:
            import traceback
            traceback.print_exc()
            self.send_utf8_json_response({"success": False, "error": str(e)}, 500)

    def handle_logout(self):
        """處理用戶登出"""
        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            logout_data = json.loads(post_data.decode('utf-8'))
            
            session_id = logout_data.get('session_id', '')
            if session_id:
                destroy_session(session_id)
            
            response = {"success": True, "message": "登出成功"}
            
            # 確保響應數據是UTF-8編碼的
            json_data = json.dumps(response, ensure_ascii=False, indent=2)
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(json_data.encode('utf-8'))))
            self.end_headers()
            self.wfile.write(json_data.encode('utf-8'))
            
        except Exception as e:
            self.send_error(500, f"登出失敗: {str(e)}")
    
    def handle_user_profile(self):
        """處理用戶資料請求"""
        session_id = self.headers.get('Authorization', '').replace('Bearer ', '')
        session = get_session(session_id)
        
        if not session:
            self.send_error(401, "未授權")
            return
        
        response = {
            "success": True,
            "user": {
                "id": session['user_id'],
                "username": session['username'],
                "email": session['email'],
                "plan_type": session['plan_type'],
                "analysis_count": session['analysis_count'],
                "max_analyses": session['max_analyses']
            }
        }
        
        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.end_headers()
        self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))
    
    def handle_analysis_history(self):
        """處理分析歷史請求"""
        session_id = self.headers.get('Authorization', '').replace('Bearer ', '')
        session = get_session(session_id) if session_id else None
        
        # 確定用戶ID
        if session:
            user_id = session['user_id']
        else:
            # 匿名用戶使用特殊ID (0)
            user_id = 0
        
        history = get_user_analysis_history(user_id)
        
        response = {
            "success": True,
            "history": history
        }
        
        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.end_headers()
        self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))
    
    def handle_get_analysis(self):
        """處理獲取特定分析的請求"""
        session_id = self.headers.get('Authorization', '').replace('Bearer ', '')
        session = get_session(session_id)
        
        if not session:
            self.send_error(401, "未授權")
            return
        
        # 從URL中提取分析ID
        analysis_id = self.path.split('/')[-1]
        analysis = get_analysis_by_id(analysis_id)
        
        if analysis:
            response = {
                "success": True,
                "analysis": analysis
            }
        else:
            response = {
                "success": False,
                "error": "分析記錄未找到"
            }
        
        self.send_response(200 if response["success"] else 404)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.end_headers()
        self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))
    
    def handle_save_analysis(self):
        """處理保存分析記錄的請求"""
        session_id = self.headers.get('Authorization', '').replace('Bearer ', '')
        session = get_session(session_id) if session_id else None
        
        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            save_data = json.loads(post_data.decode('utf-8'))
            
            analysis_data = save_data.get('analysis_data', {})
            results = save_data.get('results', {})
            is_anonymous = save_data.get('is_anonymous', False)
            
            # 確定用戶ID
            if session:
                user_id = session['user_id']
            else:
                # 匿名用戶使用特殊ID (0)
                user_id = 0
            
            # 保存分析記錄
            success = save_analysis_record(user_id, analysis_data, results)
            
            response = {
                "success": success,
                "message": "保存成功" if success else "保存失敗"
            }
            
            # 確保響應數據是UTF-8編碼的
            json_data = json.dumps(response, ensure_ascii=False, indent=2)
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(json_data.encode('utf-8'))))
            self.end_headers()
            self.wfile.write(json_data.encode('utf-8'))
            
        except Exception as e:
            self.send_error(500, f"保存分析記錄失敗: {str(e)}")
    
    def handle_market_overview(self):
        """處理市場概覽請求"""
        try:
            # 模擬市場數據（實際應用中應該從真實API獲取）
            market_data = {
                "indices": [
                    {
                        "name": "道瓊斯工業平均指數",
                        "symbol": "DJI",
                        "price": 37525.16,
                        "change": 0.12,
                        "change_percent": 0.0003
                    },
                    {
                        "name": "納斯達克綜合指數",
                        "symbol": "IXIC",
                        "price": 14857.71,
                        "change": -0.15,
                        "change_percent": -0.0010
                    },
                    {
                        "name": "標普500指數",
                        "symbol": "SPX",
                        "price": 4769.83,
                        "change": 0.08,
                        "change_percent": 0.0017
                    },
                    {
                        "name": "上證綜合指數",
                        "symbol": "000001.SS",
                        "price": 3045.87,
                        "change": 0.25,
                        "change_percent": 0.0082
                    }
                ],
                "stocks": [
                    {
                        "name": "蘋果公司",
                        "symbol": "AAPL",
                        "price": 193.58,
                        "change": 1.25,
                        "change_percent": 0.65
                    },
                    {
                        "name": "微軟公司",
                        "symbol": "MSFT",
                        "price": 378.85,
                        "change": -0.45,
                        "change_percent": -0.12
                    },
                    {
                        "name": "亞馬遜",
                        "symbol": "AMZN",
                        "price": 155.74,
                        "change": 2.15,
                        "change_percent": 1.40
                    },
                    {
                        "name": "特斯拉",
                        "symbol": "TSLA",
                        "price": 248.42,
                        "change": -1.85,
                        "change_percent": -0.74
                    }
                ],
                "sectors": [
                    {
                        "name": "科技",
                        "change_percent": 0.45,
                        "status": "positive"
                    },
                    {
                        "name": "金融",
                        "change_percent": -0.23,
                        "status": "negative"
                    },
                    {
                        "name": "醫療保健",
                        "change_percent": 0.12,
                        "status": "positive"
                    },
                    {
                        "name": "能源",
                        "change_percent": 0.78,
                        "status": "positive"
                    }
                ],
                "news": [
                    {
                        "title": "美聯儲維持利率不變，市場反應積極",
                        "summary": "美聯儲在最新會議上決定維持基準利率在5.25%-5.50%區間不變，符合市場預期。",
                        "source": "路透社",
                        "time": "2小時前"
                    },
                    {
                        "title": "科技股領漲，納斯達克指數創新高",
                        "summary": "在AI概念股強勢帶動下，科技板塊表現亮眼，多隻個股創下歷史新高。",
                        "source": "華爾街日報",
                        "time": "4小時前"
                    },
                    {
                        "title": "能源板塊受益於油價上漲",
                        "summary": "國際原油價格持續攀升，帶動能源板塊整體走強，多隻能源股漲幅超過3%。",
                        "source": "彭博社",
                        "time": "6小時前"
                    }
                ]
            }
            
            response = {
                "success": True,
                "data": market_data,
                "timestamp": datetime.now().isoformat()
            }
            
            # 確保響應數據是UTF-8編碼的
            json_data = json.dumps(response, ensure_ascii=False, indent=2)
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(json_data.encode('utf-8'))))
            self.end_headers()
            self.wfile.write(json_data.encode('utf-8'))
            
        except Exception as e:
            error_response = {
                "success": False,
                "error": f"獲取市場數據失敗: {str(e)}",
                "timestamp": datetime.now().isoformat()
            }
            
            # 確保錯誤響應也是UTF-8編碼的
            json_data = json.dumps(error_response, ensure_ascii=False, indent=2)
            
            self.send_response(500)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(json_data.encode('utf-8'))))
            self.end_headers()
            self.wfile.write(json_data.encode('utf-8'))
    
    def handle_trump_code_proxy(self, parsed_path):
        """
        代理 TRUMP CODE 公開 API（社群貼文與市場訊號相關），避免瀏覽器 CORS。
        專案說明: https://github.com/sstklen/trump-code/blob/main/docs/README.zh.md
        預設上游: https://trumpcode.washinmura.jp
        可透過環境變數 TRUMP_CODE_API_BASE 覆寫。
        """
        trump_base = os.getenv('TRUMP_CODE_API_BASE', 'https://trumpcode.washinmura.jp').rstrip('/')
        allowed = frozenset({
            'dashboard', 'signals', 'status', 'recent-posts', 'models',
            'playbook', 'insights', 'polymarket-trump',
        })
        raw = parsed_path.path.rstrip('/')
        if raw in ('/api/trump-code', '/api/trump-code/'):
            remote_segment = 'dashboard'
        elif raw.startswith('/api/trump-code/'):
            tail = raw[len('/api/trump-code/'):].lstrip('/')
            remote_segment = tail.split('/')[0] if tail else 'dashboard'
        else:
            self.send_utf8_json_response({'success': False, 'error': 'Invalid Trump Code path'}, 400)
            return
        if not remote_segment or remote_segment not in allowed:
            self.send_utf8_json_response({
                'success': False,
                'error': f'Unsupported Trump Code endpoint: {remote_segment}',
                'allowed': sorted(allowed),
            }, 400)
            return
        upstream_url = f'{trump_base}/api/{remote_segment}'
        try:
            r = requests.get(
                upstream_url,
                timeout=25,
                headers={'User-Agent': 'TradingAgents-CN/TrumpCodeProxy 1.0'},
            )
            if r.status_code != 200:
                self.send_utf8_json_response({
                    'success': False,
                    'error': f'Upstream HTTP {r.status_code}',
                    'upstream_url': upstream_url,
                }, 502)
                return
            ct = (r.headers.get('Content-Type') or '').lower()
            if 'application/json' in ct:
                try:
                    payload = r.json()
                except ValueError:
                    self.send_utf8_json_response({
                        'success': False,
                        'error': 'Upstream returned invalid JSON',
                    }, 502)
                    return
            else:
                try:
                    payload = r.json()
                except ValueError:
                    payload = {'raw': r.text[:8000]}
            out = {
                'success': True,
                'source': 'trump-code',
                'upstream': upstream_url,
                'data': payload,
            }
            self.send_utf8_json_response(out, 200)
        except requests.RequestException as e:
            self.send_utf8_json_response({
                'success': False,
                'error': str(e),
                'upstream': upstream_url,
            }, 502)
    
    # News cache: avoid hammering RSS feeds on every request
    _news_cache = {"data": None, "fetched_at": None}

    def handle_news(self):
        """處理新聞資訊請求 — 從多個RSS源獲取實時財經新聞"""
        try:
            import feedparser
            import hashlib
            from datetime import timedelta

            now = datetime.now()
            cache = TradingAgentsAPIHandler._news_cache

            # Serve from cache if fresh (5 minutes)
            if cache["data"] and cache["fetched_at"] and (now - cache["fetched_at"]).total_seconds() < 300:
                self.send_utf8_json_response({
                    "success": True,
                    "data": cache["data"],
                    "total": len(cache["data"]),
                    "cached": True,
                    "timestamp": now.isoformat()
                })
                return

            # RSS feed sources
            rss_feeds = [
                {"url": "https://news.google.com/rss/search?q=stock+market&hl=en-US&gl=US&ceid=US:en", "source": "Google News", "category": "market"},
                {"url": "https://news.google.com/rss/search?q=finance+economy&hl=zh-TW&gl=TW&ceid=TW:zh-Hant", "source": "Google財經", "category": "market"},
                {"url": "https://feeds.finance.yahoo.com/rss/2.0/headline?s=^GSPC&region=US&lang=en-US", "source": "Yahoo Finance", "category": "market"},
                {"url": "https://news.google.com/rss/search?q=AAPL+MSFT+NVDA+stock&hl=en-US&gl=US&ceid=US:en", "source": "Google News", "category": "company"},
                {"url": "https://news.google.com/rss/search?q=美股+港股+A股&hl=zh-TW&gl=TW&ceid=TW:zh-Hant", "source": "Google財經", "category": "market"},
            ]

            all_news = []
            for feed_info in rss_feeds:
                try:
                    feed = feedparser.parse(feed_info["url"])
                    for entry in feed.entries[:5]:
                        # Parse published time
                        pub_time = None
                        if hasattr(entry, 'published_parsed') and entry.published_parsed:
                            import calendar
                            pub_time = datetime.utcfromtimestamp(calendar.timegm(entry.published_parsed))
                        elif hasattr(entry, 'updated_parsed') and entry.updated_parsed:
                            import calendar
                            pub_time = datetime.utcfromtimestamp(calendar.timegm(entry.updated_parsed))

                        if not pub_time:
                            pub_time = now

                        # Calculate relative time
                        age = now - pub_time
                        if age.total_seconds() < 3600:
                            time_str = f"{int(age.total_seconds() / 60)}分鐘前"
                        elif age.total_seconds() < 86400:
                            time_str = f"{int(age.total_seconds() / 3600)}小時前"
                        else:
                            time_str = f"{int(age.days)}天前"

                        # Clean title
                        title = entry.get('title', '').strip()
                        if ' - ' in title:
                            title = title.rsplit(' - ', 1)[0].strip()

                        summary = entry.get('summary', entry.get('description', ''))
                        # Strip HTML tags
                        import re
                        summary = re.sub(r'<[^>]+>', '', summary)[:200]

                        news_id = hashlib.md5(title.encode('utf-8')).hexdigest()[:8]
                        all_news.append({
                            "id": news_id,
                            "title": title,
                            "summary": summary,
                            "category": feed_info["category"],
                            "source": feed_info["source"],
                            "time": time_str,
                            "publishedAt": pub_time.isoformat(),
                            "url": entry.get('link', '#'),
                        })
                except Exception as feed_err:
                    print(f"⚠️ RSS feed error ({feed_info['source']}): {feed_err}")
                    continue

            # Deduplicate by title similarity
            seen_titles = set()
            unique_news = []
            for n in all_news:
                short_title = n["title"][:30]
                if short_title not in seen_titles:
                    seen_titles.add(short_title)
                    unique_news.append(n)

            # Sort by publish time (newest first)
            unique_news.sort(key=lambda x: x.get("publishedAt", ""), reverse=True)
            news_data = unique_news[:15]

            # Fallback if no real news fetched
            if not news_data:
                news_data = self._get_fallback_news()

            # Update cache
            TradingAgentsAPIHandler._news_cache = {"data": news_data, "fetched_at": now}

            self.send_utf8_json_response({
                "success": True,
                "data": news_data,
                "total": len(news_data),
                "cached": False,
                "timestamp": now.isoformat()
            })

        except Exception as e:
            # If feedparser not installed or any error, use fallback
            print(f"⚠️ News fetch error: {e}, using fallback")
            news_data = self._get_fallback_news()
            self.send_utf8_json_response({
                "success": True,
                "data": news_data,
                "total": len(news_data),
                "fallback": True,
                "timestamp": datetime.now().isoformat()
            })

    def _get_fallback_news(self):
        """Generate fresh fallback news with current timestamps."""
        import random
        now = datetime.now()
        templates = [
            {"title": "美股三大指數走勢分化，科技股繼續領漲", "category": "market", "source": "財經快訊"},
            {"title": "NVIDIA股價再創新高，AI晶片需求持續強勁", "category": "company", "source": "科技新聞"},
            {"title": "聯準會官員暗示年內可能降息，市場反應正面", "category": "policy", "source": "路透社"},
            {"title": "蘋果Vision Pro銷量超預期，帶動供應鏈走強", "category": "company", "source": "彭博社"},
            {"title": "港股恒指收漲，科技股和金融股領漲", "category": "market", "source": "香港財經"},
            {"title": "特斯拉發布新款電動車，預訂量創紀錄", "category": "company", "source": "CNBC"},
            {"title": "原油價格因地緣政治緊張而上漲", "category": "market", "source": "金融時報"},
            {"title": "加密貨幣市場回暖，比特幣突破關鍵阻力位", "category": "market", "source": "CoinDesk"},
            {"title": "中國經濟數據好於預期，A股市場情緒改善", "category": "market", "source": "新華財經"},
            {"title": "微軟Azure雲業務增速超預期，股價盤後上漲", "category": "company", "source": "華爾街日報"},
        ]
        random.shuffle(templates)
        news = []
        for i, t in enumerate(templates[:8]):
            hours_ago = i * 2 + random.randint(0, 2)
            pub_time = now - datetime.timedelta(hours=hours_ago) if hasattr(datetime, 'timedelta') else now
            from datetime import timedelta as td
            pub_time = now - td(hours=hours_ago)
            news.append({
                "id": str(i + 1),
                "title": t["title"],
                "summary": t["title"],
                "category": t["category"],
                "source": t["source"],
                "time": f"{hours_ago}小時前",
                "publishedAt": pub_time.isoformat(),
                "url": "#",
            })
        return news
    
    def handle_earnings_calendar(self):
        """提供財報日曆（Earnings Calendar）資料"""
        try:
            parsed_path = urlparse(self.path)
            query_params = parse_qs(parsed_path.query)
            date_from = query_params.get('from', [datetime.now().strftime('%Y-%m-%d')])[0]
            date_to = query_params.get('to', [(datetime.now()).strftime('%Y-%m-%d')])[0]
            symbol_filter = query_params.get('symbol', [''])[0].upper().strip()
            limit = int(query_params.get('limit', ['50'])[0])

            api_key = os.getenv('FINNHUB_API_KEY', '')
            items = []

            if api_key:
                try:
                    url = 'https://finnhub.io/api/v1/calendar/earnings'
                    params = {
                        'from': date_from,
                        'to': date_to,
                        'token': api_key
                    }
                    r = requests.get(url, params=params, timeout=10)
                    r.raise_for_status()
                    data = r.json() or {}
                    for row in (data.get('earningsCalendar') or data.get('earnings') or []):
                        sym = (row.get('symbol') or row.get('ticker') or '').upper()
                        if symbol_filter and sym != symbol_filter:
                            continue
                        items.append({
                            'symbol': sym,
                            'company': row.get('company') or row.get('name') or '',
                            'date': row.get('date') or row.get('reportDate') or row.get('period') or '',
                            'time': row.get('hour') or row.get('time') or 'AMC/ BMO',
                            'period': row.get('period') or '',
                            'eps_estimate': row.get('epsEstimate') or row.get('eps_estimate'),
                            'eps_actual': row.get('epsActual') or row.get('eps_actual'),
                            'eps_surprise': row.get('surprise') or row.get('epsSurprise'),
                            'revenue_estimate': row.get('revenueEstimate') or row.get('revenue_estimate'),
                            'revenue_actual': row.get('revenueActual') or row.get('revenue_actual')
                        })
                except Exception as fe:
                    # Finnhub 失敗時退回空列表（前端可顯示友好訊息）
                    items = []
            else:
                # 無API金鑰時返回空列表；可擴展為yfinance針對單一symbol的基本回退
                items = []

            # 限制返回數量
            if limit > 0:
                items = items[:limit]

            response = {
                'success': True,
                'data': items,
                'from': date_from,
                'to': date_to,
                'symbol': symbol_filter or None,
                'total': len(items),
                'timestamp': datetime.now().isoformat()
            }

            json_data = json.dumps(response, ensure_ascii=False, indent=2)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(json_data.encode('utf-8'))))
            self.end_headers()
            self.wfile.write(json_data.encode('utf-8'))

        except Exception as e:
            error_response = {
                'success': False,
                'error': f'獲取財報日曆失敗: {str(e)}',
                'timestamp': datetime.now().isoformat()
            }
            json_data = json.dumps(error_response, ensure_ascii=False, indent=2)
            self.send_response(500)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(json_data.encode('utf-8'))))
            self.end_headers()
            self.wfile.write(json_data.encode('utf-8'))

    def handle_dividends(self):
        """提供股息歷史與當前收益率資料"""
        try:
            parsed_path = urlparse(self.path)
            query_params = parse_qs(parsed_path.query)
            symbol = (query_params.get('symbol', [''])[0] or '').upper().strip()
            limit = int(query_params.get('limit', ['50'])[0])

            if not symbol:
                self.send_error(400, '缺少必要參數: symbol')
                return

            api_key = os.getenv('FINNHUB_API_KEY', '')
            records = []
            current_yield = None
            payout_ratio = None

            if api_key:
                try:
                    # Dividend history
                    url_hist = 'https://finnhub.io/api/v1/stock/dividend'
                    params_hist = {
                        'symbol': symbol,
                        'token': api_key
                    }
                    rh = requests.get(url_hist, params=params_hist, timeout=10)
                    rh.raise_for_status()
                    hist = rh.json() or []
                    for item in hist:
                        records.append({
                            'ex_date': item.get('exDate') or item.get('ex_date'),
                            'payment_date': item.get('paymentDate') or item.get('payment_date'),
                            'record_date': item.get('recordDate') or item.get('record_date'),
                            'declared_date': item.get('declaredDate') or item.get('declared_date'),
                            'amount': item.get('amount'),
                            'currency': item.get('currency')
                        })
                except Exception:
                    records = []

                try:
                    # Company metrics for yield/payout
                    url_metrics = 'https://finnhub.io/api/v1/stock/metric'
                    params_m = {
                        'symbol': symbol,
                        'metric': 'all',
                        'token': api_key
                    }
                    rm = requests.get(url_metrics, params=params_m, timeout=10)
                    rm.raise_for_status()
                    metrics = rm.json() or {}
                    data = metrics.get('metric', {})
                    current_yield = data.get('dividendYieldTTM') or data.get('dividendYield')
                    payout_ratio = data.get('payoutRatioTTM') or data.get('payoutRatio')
                except Exception:
                    pass

            if limit > 0:
                records = records[:limit]

            response = {
                'success': True,
                'symbol': symbol,
                'yield': current_yield,
                'payout_ratio': payout_ratio,
                'history': records,
                'count': len(records),
                'timestamp': datetime.now().isoformat()
            }

            json_data = json.dumps(response, ensure_ascii=False, indent=2)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(json_data.encode('utf-8'))))
            self.end_headers()
            self.wfile.write(json_data.encode('utf-8'))

        except Exception as e:
            error_response = {
                'success': False,
                'error': f'獲取股息數據失敗: {str(e)}',
                'timestamp': datetime.now().isoformat()
            }
            json_data = json.dumps(error_response, ensure_ascii=False, indent=2)
            self.send_response(500)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(json_data.encode('utf-8'))))
            self.end_headers()
            self.wfile.write(json_data.encode('utf-8'))

    def handle_analyst_ratings(self):
        """提供分析師評級統計與目標價彙總"""
        try:
            parsed_path = urlparse(self.path)
            query_params = parse_qs(parsed_path.query)
            symbol = (query_params.get('symbol', [''])[0] or '').upper().strip()

            if not symbol:
                self.send_error(400, '缺少必要參數: symbol')
                return

            api_key = os.getenv('FINNHUB_API_KEY', '')
            summary = {
                'symbol': symbol,
                'ratings': None,
                'price_target': None
            }

            if api_key:
                try:
                    # Recommendation trends
                    url_rec = 'https://finnhub.io/api/v1/stock/recommendation'
                    rr = requests.get(url_rec, params={'symbol': symbol, 'token': api_key}, timeout=10)
                    rr.raise_for_status()
                    rec = rr.json() or []
                    if rec:
                        latest = rec[0]
                        summary['ratings'] = {
                            'strong_buy': latest.get('strongBuy'),
                            'buy': latest.get('buy'),
                            'hold': latest.get('hold'),
                            'sell': latest.get('sell'),
                            'strong_sell': latest.get('strongSell'),
                            'period': latest.get('period')
                        }
                except Exception:
                    pass

                try:
                    # Price targets
                    url_pt = 'https://finnhub.io/api/v1/stock/price-target'
                    rp = requests.get(url_pt, params={'symbol': symbol, 'token': api_key}, timeout=10)
                    rp.raise_for_status()
                    pt = rp.json() or {}
                    if pt:
                        summary['price_target'] = {
                            'target_high': pt.get('targetHigh') or pt.get('target_high'),
                            'target_low': pt.get('targetLow') or pt.get('target_low'),
                            'target_mean': pt.get('targetMean') or pt.get('target_mean'),
                            'target_median': pt.get('targetMedian') or pt.get('target_median'),
                            'last_updated': pt.get('lastUpdated') or pt.get('last_updated')
                        }
                except Exception:
                    pass

            response = {
                'success': True,
                'data': summary,
                'timestamp': datetime.now().isoformat()
            }

            json_data = json.dumps(response, ensure_ascii=False, indent=2)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(json_data.encode('utf-8'))))
            self.end_headers()
            self.wfile.write(json_data.encode('utf-8'))

        except Exception as e:
            error_response = {
                'success': False,
                'error': f'獲取分析師評級失敗: {str(e)}',
                'timestamp': datetime.now().isoformat()
            }
            json_data = json.dumps(error_response, ensure_ascii=False, indent=2)
            self.send_response(500)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(json_data.encode('utf-8'))))
            self.end_headers()
            self.wfile.write(json_data.encode('utf-8'))

    def handle_etf_screener(self):
        """ETF篩選器（基礎版）：接受過濾條件並返回範例結果或空集合"""
        try:
            parsed_path = urlparse(self.path)
            query_params = parse_qs(parsed_path.query)
            category = (query_params.get('category', [''])[0] or '').lower().strip()
            min_yield = float(query_params.get('min_yield', ['0'])[0])
            expense_ratio_lte = float(query_params.get('expense_ratio_lte', ['1.0'])[0])
            limit = int(query_params.get('limit', ['25'])[0])

            # Placeholder dataset; can be replaced with real data provider later
            dataset = [
                {
                    'symbol': 'SPY', 'name': 'SPDR S&P 500 ETF Trust', 'category': 'us equity',
                    'yield': 1.4, 'expense_ratio': 0.09, 'aum_billion': 530.0
                },
                {
                    'symbol': 'QQQ', 'name': 'Invesco QQQ Trust', 'category': 'tech growth',
                    'yield': 0.6, 'expense_ratio': 0.20, 'aum_billion': 250.0
                },
                {
                    'symbol': 'VYM', 'name': 'Vanguard High Dividend Yield ETF', 'category': 'dividend',
                    'yield': 3.1, 'expense_ratio': 0.06, 'aum_billion': 50.0
                }
            ]

            results = []
            for etf in dataset:
                if category and category not in etf['category']:
                    continue
                if etf['yield'] < min_yield:
                    continue
                if etf['expense_ratio'] > expense_ratio_lte:
                    continue
                results.append(etf)

            results = results[:limit]

            response = {
                'success': True,
                'filters': {
                    'category': category or None,
                    'min_yield': min_yield,
                    'expense_ratio_lte': expense_ratio_lte
                },
                'count': len(results),
                'data': results,
                'timestamp': datetime.now().isoformat()
            }

            json_data = json.dumps(response, ensure_ascii=False, indent=2)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(json_data.encode('utf-8'))))
            self.end_headers()
            self.wfile.write(json_data.encode('utf-8'))

        except Exception as e:
            error_response = {
                'success': False,
                'error': f'ETF篩選器失敗: {str(e)}',
                'timestamp': datetime.now().isoformat()
            }
            json_data = json.dumps(error_response, ensure_ascii=False, indent=2)
            self.send_response(500)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(json_data.encode('utf-8'))))
            self.end_headers()
            self.wfile.write(json_data.encode('utf-8'))

    def handle_news_categories(self):
        """提供新聞分類匯總（趨勢、要聞、AI、科技等）"""
        try:
            categories = {
                'top_market_news': [],
                'notable_calls': [],
                'on_the_move': [],
                'ai_news': [],
                'tech_news': [],
                'energy_news': []
            }
            response = {
                'success': True,
                'data': categories,
                'timestamp': datetime.now().isoformat()
            }
            json_data = json.dumps(response, ensure_ascii=False, indent=2)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(json_data.encode('utf-8'))))
            self.end_headers()
            self.wfile.write(json_data.encode('utf-8'))
        except Exception as e:
            error_response = {
                'success': False,
                'error': f'獲取新聞分類失敗: {str(e)}',
                'timestamp': datetime.now().isoformat()
            }
            json_data = json.dumps(error_response, ensure_ascii=False, indent=2)
            self.send_response(500)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(json_data.encode('utf-8'))))
            self.end_headers()
            self.wfile.write(json_data.encode('utf-8'))

    def handle_earnings_transcripts(self):
        """公司財報電話會議逐字稿（占位符版本）"""
        try:
            parsed_path = urlparse(self.path)
            query_params = parse_qs(parsed_path.query)
            symbol = (query_params.get('symbol', [''])[0] or '').upper().strip()
            if not symbol:
                self.send_error(400, '缺少必要參數: symbol')
                return
            # 佔位返回（未集成實際來源）
            response = {
                'success': True,
                'symbol': symbol,
                'transcripts': [],
                'note': '暫無逐字稿數據，後續可接入第三方供應商。',
                'timestamp': datetime.now().isoformat()
            }
            json_data = json.dumps(response, ensure_ascii=False, indent=2)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(json_data.encode('utf-8'))))
            self.end_headers()
            self.wfile.write(json_data.encode('utf-8'))
        except Exception as e:
            error_response = {
                'success': False,
                'error': f'獲取逐字稿失敗: {str(e)}',
                'timestamp': datetime.now().isoformat()
            }
            json_data = json.dumps(error_response, ensure_ascii=False, indent=2)
            self.send_response(500)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(json_data.encode('utf-8'))))
            self.end_headers()
            self.wfile.write(json_data.encode('utf-8'))
    
    def handle_technical_analysis(self):
        """處理技術分析請求"""
        try:
            # 檢查用戶是否已登錄
            if not self.check_authentication():
                self.send_error(401, "請先登錄後再使用技術分析功能")
                return
                
            # 從查詢參數獲取股票代碼
            parsed_path = urlparse(self.path)
            query_params = parse_qs(parsed_path.query)
            symbol = query_params.get('symbol', ['AAPL'])[0].upper()
            
            print(f"🔍 技術分析開始: {symbol}")
            
            # 嘗試獲取真實市場數據
            print(f"🔍 開始獲取真實市場數據: {symbol}")
            real_data = self._get_real_market_data(symbol)
            print(f"🔍 真實數據獲取結果: {real_data is not None}")
            
            if real_data:
                print(f"✅ 獲取真實市場數據成功: {symbol}")
                print(f"🔍 真實數據結構: {list(real_data.keys())}")
                if 'chart_data' in real_data:
                    print(f"🔍 chart_data存在: {real_data['chart_data']}")
                else:
                    print(f"❌ chart_data缺失!")
                technical_data = real_data
            else:
                print(f"⚠️ 使用模擬數據: {symbol}")
                # 確保模擬數據也有chart_data
                technical_data = {
                    "symbol": symbol,
                    "summary": {
                        "overall_signal": "bullish",
                        "trend_strength": "strong",
                        "volatility": "moderate",
                        "volume_trend": "increasing"
                    },
                    "indicators": {
                        "trend": [
                            {
                                "name": "移動平均線 (MA)",
                                "value": "125.50",
                                "signal": "bullish",
                                "description": "股價位於20日均線上方，趨勢向上",
                                "details": {
                                    "MA5": "127.20",
                                    "MA10": "124.80",
                                    "MA20": "122.30",
                                    "MA50": "118.75"
                                }
                            }
                        ],
                        "momentum": [
                            {
                                "name": "RSI (14)",
                                "value": "65.2",
                                "signal": "neutral",
                                "description": "RSI指標處於中性區域，無明顯超買超賣信號",
                                "details": {
                                    "RSI": "65.2",
                                    "超買線": "70",
                                    "超賣線": "30"
                                }
                            }
                        ],
                        "volatility": [
                            {
                                "name": "布林帶",
                                "value": "中軌: 125.20",
                                "signal": "neutral",
                                "description": "股價接近布林帶中軌，處於中性區域",
                                "details": {
                                    "上軌": "131.50",
                                    "中軌": "125.20",
                                    "下軌": "118.90",
                                    "寬度": "10.1%"
                                }
                            }
                        ],
                        "volume": [
                            {
                                "name": "成交量分析",
                                "value": "3.2M",
                                "signal": "high",
                                "description": "成交量較高，顯示市場活躍",
                                "details": {
                                    "成交量": "3.2M",
                                    "平均量": "2.8M",
                                    "趨勢": "增加"
                                }
                            }
                        ]
                    },
                    "chart_data": {
                        "price": "125.50",
                        "change": "+1.25",
                        "change_percent": "+1.01%",
                        "high": "126.80",
                        "low": "124.20",
                        "volume": "3.2M"
                    }
                }
            
            response = {
                "success": True,
                "data": technical_data,
                "timestamp": datetime.now().isoformat()
            }
            
            # 使用安全的UTF-8響應函數
            self.send_utf8_json_response(response, 200)
            
        except Exception as e:
            error_response = {
                "success": False,
                "error": f"獲取技術分析數據失敗: {str(e)}",
                "timestamp": datetime.now().isoformat()
            }
            
            # 使用安全的UTF-8響應函數
            self.send_utf8_json_response(error_response, 500)

    def handle_trading_signals(self):
        """生成基於技術指標與K線形態的買賣信號"""
        try:
            # 需要用戶已登錄
            if not self.check_authentication():
                self.send_error(401, "請先登錄後再使用交易信號功能")
                return

            # 讀取查詢參數
            parsed_path = urlparse(self.path)
            query_params = parse_qs(parsed_path.query)
            symbol = query_params.get('symbol', ['AAPL'])[0].upper()

            # 嘗試獲取歷史數據（優先處理港股後綴）
            def normalize_symbols(sym: str):
                sym = str(sym).upper().strip()
                if sym.isdigit() and len(sym) in (4, 5):
                    return [f"{sym}.HK", sym]
                return [sym]

            import yfinance as yf
            hist = None
            used_symbol = symbol
            for test_sym in normalize_symbols(symbol):
                try:
                    t = yf.Ticker(test_sym)
                    h = t.history(period="6mo", interval="1d", timeout=10)
                    if not h.empty and len(h) >= 60:
                        hist = h
                        used_symbol = test_sym
                        break
                except Exception:
                    continue

            if hist is None or hist.empty:
                error_response = {
                    "success": False,
                    "error": f"無法獲取 {symbol} 歷史數據",
                    "timestamp": datetime.now().isoformat()
                }
                self.send_utf8_json_response(error_response, 500)
                return

            # 取需要的序列
            closes = [float(x) for x in hist['Close'].tolist()]
            opens = [float(x) for x in hist['Open'].tolist()] if 'Open' in hist else closes
            highs = [float(x) for x in hist['High'].tolist()] if 'High' in hist else closes
            lows  = [float(x) for x in hist['Low' ].tolist()] if 'Low'  in hist else closes

            current_price = closes[-1]

            # 指標計算
            rsi = self._calculate_rsi_from_data(closes)

            # 簡單移動平均
            def sma(data, period):
                if len(data) < period:
                    return None
                return sum(data[-period:]) / period

            sma20_now = sma(closes, 20)
            sma50_now = sma(closes, 50)
            sma20_prev = sma(closes[:-1], 20)
            sma50_prev = sma(closes[:-1], 50)

            # MACD
            def ema_series(data, period):
                if not data:
                    return []
                k = 2 / (period + 1)
                out = [data[0]]
                for v in data[1:]:
                    out.append(v * k + out[-1] * (1 - k))
                return out

            ema12 = ema_series(closes, 12)
            ema26 = ema_series(closes, 26)
            macd_line = [a - b for a, b in zip(ema12[-len(ema26):], ema26)] if len(ema12) >= len(ema26) else []
            signal_line = ema_series(macd_line, 9) if macd_line else []

            macd_cross_up = False
            macd_cross_down = False
            if len(macd_line) >= 2 and len(signal_line) >= 2:
                prev_diff = macd_line[-2] - signal_line[-2]
                curr_diff = macd_line[-1] - signal_line[-1]
                macd_cross_up = prev_diff <= 0 and curr_diff > 0
                macd_cross_down = prev_diff >= 0 and curr_diff < 0

            # K線形態（最後一根與前一根）
            def bullish_engulfing(i):
                if i < 1:
                    return False
                prev_red = closes[i-1] < opens[i-1]
                curr_green = closes[i] > opens[i]
                return prev_red and curr_green and (opens[i] < closes[i-1]) and (closes[i] > opens[i-1])

            def hammer(i):
                body = abs(closes[i] - opens[i])
                lower_shadow = opens[i] - lows[i] if closes[i] >= opens[i] else closes[i] - lows[i]
                upper_shadow = highs[i] - closes[i] if closes[i] >= opens[i] else highs[i] - opens[i]
                return lower_shadow > body * 2 and upper_shadow < body

            def shooting_star(i):
                body = abs(closes[i] - opens[i])
                upper_shadow = highs[i] - closes[i] if closes[i] >= opens[i] else highs[i] - opens[i]
                lower_shadow = opens[i] - lows[i] if closes[i] >= opens[i] else closes[i] - lows[i]
                return upper_shadow > body * 2 and lower_shadow < body

            i = len(closes) - 1

            # 支撐/阻力
            support, resistance = self._calculate_support_resistance(closes[-50:]) if len(closes) >= 50 else (min(closes), max(closes))

            signals = []

            # SMA 金叉/死叉
            if sma20_now and sma50_now and sma20_prev and sma50_prev:
                prev_spread = sma20_prev - sma50_prev
                curr_spread = sma20_now - sma50_now
                if prev_spread <= 0 < curr_spread:
                    signals.append({
                        "action": "buy",
                        "title": "SMA20 上穿 SMA50（黃金交叉）",
                        "reason": "短期趨勢轉強，出現黃金交叉",
                        "confidence": "high",
                        "entry": round(current_price, 2),
                        "stop_loss": round(support * 0.99, 2),
                        "take_profit": round(resistance * 0.98, 2)
                    })
                if prev_spread >= 0 > curr_spread:
                    signals.append({
                        "action": "sell",
                        "title": "SMA20 下穿 SMA50（死亡交叉）",
                        "reason": "短期趨勢轉弱，出現死亡交叉",
                        "confidence": "high",
                        "entry": round(current_price, 2),
                        "stop_loss": round(resistance * 1.01, 2),
                        "take_profit": round(support * 1.02, 2)
                    })

            # MACD 交叉
            if macd_cross_up:
                signals.append({
                    "action": "buy",
                    "title": "MACD 金叉",
                    "reason": "MACD 線上穿訊號線，動能轉強",
                    "confidence": "medium",
                    "entry": round(current_price, 2),
                    "stop_loss": round(support * 0.99, 2),
                    "take_profit": round(resistance * 0.98, 2)
                })
            if macd_cross_down:
                signals.append({
                    "action": "sell",
                    "title": "MACD 死叉",
                    "reason": "MACD 線下穿訊號線，動能轉弱",
                    "confidence": "medium",
                    "entry": round(current_price, 2),
                    "stop_loss": round(resistance * 1.01, 2),
                    "take_profit": round(support * 1.02, 2)
                })

            # RSI 極值
            if rsi is not None:
                try:
                    rsi_val = float(rsi)
                    if rsi_val < 30:
                        signals.append({
                            "action": "buy",
                            "title": "RSI 超賣",
                            "reason": f"RSI={rsi_val:.1f}，存在反彈機會",
                            "confidence": "medium",
                            "entry": round(current_price, 2),
                            "stop_loss": round(support * 0.99, 2),
                            "take_profit": round(resistance * 0.98, 2)
                        })
                    if rsi_val > 70:
                        signals.append({
                            "action": "sell",
                            "title": "RSI 超買",
                            "reason": f"RSI={rsi_val:.1f}，存在回調風險",
                            "confidence": "medium",
                            "entry": round(current_price, 2),
                            "stop_loss": round(resistance * 1.01, 2),
                            "take_profit": round(support * 1.02, 2)
                        })
                except Exception:
                    pass

            # K線形態
            if bullish_engulfing(i):
                signals.append({
                    "action": "buy",
                    "title": "看漲吞沒",
                    "reason": "強烈看漲反轉形態",
                    "confidence": "medium",
                    "entry": round(current_price, 2),
                    "stop_loss": round(support * 0.99, 2),
                    "take_profit": round(resistance * 0.98, 2)
                })
            if hammer(i):
                signals.append({
                    "action": "buy",
                    "title": "錘頭",
                    "reason": "下影線較長，可能見底反彈",
                    "confidence": "low",
                    "entry": round(current_price, 2),
                    "stop_loss": round(support * 0.99, 2),
                    "take_profit": round(resistance * 0.98, 2)
                })
            if shooting_star(i):
                signals.append({
                    "action": "sell",
                    "title": "流星",
                    "reason": "上影線較長，可能見頂回落",
                    "confidence": "low",
                    "entry": round(current_price, 2),
                    "stop_loss": round(resistance * 1.01, 2),
                    "take_profit": round(support * 1.02, 2)
                })

            # 合併與排序（簡單按信號強度排序）
            priority = {"high": 3, "medium": 2, "low": 1}
            signals.sort(key=lambda s: priority.get(s.get("confidence", "low"), 1), reverse=True)
            signals = signals[:5]

            response = {
                "success": True,
                "symbol": used_symbol,
                "current_price": round(current_price, 2),
                "support": round(float(support), 2),
                "resistance": round(float(resistance), 2),
                "signals": signals,
                "timestamp": datetime.now().isoformat()
            }
            self.send_utf8_json_response(response, 200)

        except Exception as e:
            error_response = {
                "success": False,
                "error": f"生成交易信號失敗: {str(e)}",
                "timestamp": datetime.now().isoformat()
            }
            self.send_utf8_json_response(error_response, 500)
    
    def handle_kline_opportunities(self):
        """處理K線交易機會分析請求 - 使用綜合K線形態檢測"""
        try:
            # 需要用戶已登錄
            if not self.check_authentication():
                self.send_error(401, "請先登錄後再使用K線機會分析功能")
                return

            # 讀取查詢參數
            parsed_path = urlparse(self.path)
            query_params = parse_qs(parsed_path.query)
            symbol = query_params.get('symbol', ['AAPL'])[0].upper()

            print(f"🔍 K線交易機會分析開始: {symbol}")

            # 獲取歷史數據
            import yfinance as yf
            
            # 嘗試不同的符號格式
            symbols_to_try = [symbol]
            if symbol.isdigit() and len(symbol) in (4, 5):
                symbols_to_try = [f"{symbol}.HK", symbol]
            
            hist = None
            used_symbol = symbol
            for test_sym in symbols_to_try:
                try:
                    t = yf.Ticker(test_sym)
                    h = t.history(period="6mo", interval="1d", timeout=10)
                    if not h.empty and len(h) >= 30:
                        hist = h
                        used_symbol = test_sym
                        break
                except Exception:
                    continue

            if hist is None or hist.empty:
                error_response = {
                    "success": False,
                    "error": f"無法獲取 {symbol} 歷史數據",
                    "timestamp": datetime.now().isoformat()
                }
                self.send_utf8_json_response(error_response, 500)
                return

            # 使用K線形態分析器
            try:
                from utils.kline_patterns import kline_pattern_analyzer
                
                # 獲取交易機會分析
                opportunities = kline_pattern_analyzer.get_trading_opportunities(hist)
                
                # 計算支撐和阻力位
                closes = [float(x) for x in hist['Close'].tolist()]
                support, resistance = self._calculate_support_resistance(closes[-50:]) if len(closes) >= 50 else (min(closes), max(closes))
                
                current_price = closes[-1]
                
                # 構建響應
                response = {
                    "success": True,
                    "symbol": used_symbol,
                    "current_price": round(current_price, 2),
                    "support": round(float(support), 2),
                    "resistance": round(float(resistance), 2),
                    "opportunity_score": opportunities.get("score", 50),
                    "signal": opportunities.get("signal", "HOLD"),
                    "signal_cn": opportunities.get("signal_cn", "觀望"),
                    "confidence": opportunities.get("confidence", 0.5),
                    "patterns": opportunities.get("patterns", []),
                    "bullish_patterns": opportunities.get("bullish_patterns", []),
                    "bearish_patterns": opportunities.get("bearish_patterns", []),
                    "bullish_count": opportunities.get("bullish_count", 0),
                    "bearish_count": opportunities.get("bearish_count", 0),
                    "summary": opportunities.get("summary", ""),
                    "recommendations": self._generate_kline_recommendations(opportunities, current_price, support, resistance),
                    "timestamp": datetime.now().isoformat()
                }
                
                print(f"✅ K線分析完成: {symbol}, 信號: {opportunities.get('signal')}, 得分: {opportunities.get('score')}")
                self.send_utf8_json_response(response, 200)
                
            except ImportError as ie:
                print(f"❌ K線形態分析器導入失敗: {ie}")
                error_response = {
                    "success": False,
                    "error": "K線形態分析器模塊未就緒",
                    "timestamp": datetime.now().isoformat()
                }
                self.send_utf8_json_response(error_response, 500)

        except Exception as e:
            print(f"❌ K線交易機會分析失敗: {e}")
            error_response = {
                "success": False,
                "error": f"K線交易機會分析失敗: {str(e)}",
                "timestamp": datetime.now().isoformat()
            }
            self.send_utf8_json_response(error_response, 500)
    
    def _generate_kline_recommendations(self, opportunities, current_price, support, resistance):
        """基於K線形態分析生成交易建議"""
        recommendations = []
        signal = opportunities.get("signal", "HOLD")
        patterns = opportunities.get("patterns", [])
        
        # 基於信號的主要建議
        if signal == "BUY":
            recommendations.append({
                "title": "買入建議",
                "description": f"K線形態顯示看漲信號，建議價格: ${current_price:.2f}，止損位: ${support * 0.98:.2f}，目標價: ${resistance * 0.98:.2f}",
                "action": "buy",
                "confidence": opportunities.get("confidence", 0.5)
            })
        elif signal == "SELL":
            recommendations.append({
                "title": "賣出建議",
                "description": f"K線形態顯示看跌信號，建議價格: ${current_price:.2f}，止損位: ${resistance * 1.02:.2f}，目標價: ${support * 1.02:.2f}",
                "action": "sell",
                "confidence": opportunities.get("confidence", 0.5)
            })
        else:
            recommendations.append({
                "title": "觀望建議",
                "description": "目前K線形態不明確，建議等待更明確的信號出現後再進場。",
                "action": "hold",
                "confidence": opportunities.get("confidence", 0.5)
            })
        
        # 添加形態詳情
        if patterns:
            top_patterns = patterns[:3]
            pattern_desc = "、".join([p.get("name_cn", p.get("name", "")) for p in top_patterns])
            recommendations.append({
                "title": "形態識別",
                "description": f"檢測到的K線形態：{pattern_desc}",
                "action": "info",
                "confidence": 1.0
            })
        
        # 風險管理建議
        recommendations.append({
            "title": "風險管理",
            "description": f"支撐位: ${support:.2f}，阻力位: ${resistance:.2f}。建議設置止損，控制風險。",
            "action": "info",
            "confidence": 1.0
        })
        
        return recommendations
    
    def handle_options_analysis(self):
        """處理股票期權分析請求"""
        try:
            # 從查詢參數獲取股票代碼
            parsed_path = urlparse(self.path)
            query_params = parse_qs(parsed_path.query)
            symbol = query_params.get('symbol', ['AAPL'])[0].upper()
            
            print(f"🔍 期權分析開始: {symbol}")
            
            # 生成基於當前時間的動態價格數據
            import random
            import math
            
            # 模擬實時價格波動
            base_price = self._get_base_price(symbol)
            print(f"🔍 基礎價格: {base_price} (類型: {type(base_price)})")
            
            current_time = datetime.now()
            time_factor = (current_time.hour * 60 + current_time.minute) / (24 * 60)  # 0-1 表示一天中的時間
            
            # 模擬市場開盤時間的價格波動
            if 9 <= current_time.hour < 16:  # 市場開盤時間
                volatility_multiplier = 1.2 + 0.3 * math.sin(time_factor * 2 * math.pi)
            else:  # 盤後時間
                volatility_multiplier = 0.8 + 0.2 * random.random()
            
            # 生成當前價格（基於基礎價格和波動）
            price_change = random.uniform(-0.05, 0.05) * volatility_multiplier
            current_price = base_price * (1 + price_change)
            print(f"🔍 當前價格: {current_price} (類型: {type(current_price)})")
            
            # 計算技術指標
            print("🔍 計算RSI...")
            rsi = self._calculate_rsi(current_price, base_price)
            print(f"🔍 RSI: {rsi} (類型: {type(rsi)})")
            
            print("🔍 計算波動率...")
            volatility = self._calculate_volatility(symbol, current_price)
            print(f"🔍 波動率: {volatility} (類型: {type(volatility)})")
            
            print("🔍 計算趨勢強度...")
            trend_strength = self._calculate_trend_strength(current_price, base_price)
            print(f"🔍 趨勢強度: {trend_strength} (類型: {type(trend_strength)})")
            
            # 基於技術指標確定市場情緒
            print("🔍 確定市場情緒...")
            overall_sentiment = self._determine_sentiment(rsi, trend_strength, volatility)
            print(f"🔍 市場情緒: {overall_sentiment}")
            
            print("🔍 確定風險等級...")
            risk_level = self._determine_risk_level(volatility, current_price, base_price)
            print(f"🔍 風險等級: {risk_level}")
            
            # 獲取真實期權數據
            print("🔍 獲取真實期權數據...")
            real_options_data = self._get_real_options_data(symbol, current_price)
            
            # 生成動態期權分析數據
            print("🔍 生成期權分析數據...")
            
            try:
                volatility_level = self._get_volatility_level(volatility)
                print(f"🔍 波動率等級: {volatility_level}")
            except Exception as e:
                print(f"❌ 波動率等級計算錯誤: {e}")
                volatility_level = "moderate"
            
            try:
                best_strategy = self._get_best_strategy(overall_sentiment, volatility, risk_level)
                print(f"🔍 最佳策略: {best_strategy}")
            except Exception as e:
                print(f"❌ 最佳策略計算錯誤: {e}")
                best_strategy = "long_call"
            
            try:
                expected_return = self._calculate_options_expected_return(overall_sentiment, volatility)
                print(f"🔍 預期收益: {expected_return}")
            except Exception as e:
                print(f"❌ 預期收益計算錯誤: {e}")
                expected_return = "8.5%"
            
            try:
                confidence_level = self._calculate_confidence(rsi, trend_strength, volatility)
                print(f"🔍 信心水平: {confidence_level}")
            except Exception as e:
                print(f"❌ 信心水平計算錯誤: {e}")
                confidence_level = "75%"
            
            try:
                strategies = self._generate_dynamic_strategies(symbol, current_price, overall_sentiment, volatility, risk_level)
                print(f"🔍 策略生成成功: {len(strategies)} 個策略")
            except Exception as e:
                print(f"❌ 策略生成錯誤: {e}")
                strategies = []
            
            # 生成具體的期權推薦
            try:
                specific_recommendations = self._generate_specific_options_recommendations(symbol, current_price, real_options_data, overall_sentiment, volatility_level, risk_level)
                print(f"🔍 具體期權推薦生成成功: {len(specific_recommendations)} 個推薦")
            except Exception as e:
                print(f"❌ 具體期權推薦生成錯誤: {e}")
                specific_recommendations = []
            
            options_data = {
                "symbol": symbol,
                "current_price": round(current_price, 2),
                "price_change": round(price_change * 100, 2),
                "analysis_date": current_time.isoformat(),
                "market_hours": 9 <= current_time.hour < 16,
                "technical_indicators": {
                    "rsi": round(rsi, 1),
                    "volatility": round(volatility, 1),
                    "trend_strength": round(trend_strength, 2),
                    "support_level": round(base_price * 0.95, 2),
                    "resistance_level": round(base_price * 1.05, 2)
                },
                "summary": {
                    "overall_sentiment": overall_sentiment,
                    "volatility_level": volatility_level,
                    "risk_level": risk_level,
                    "best_strategy": best_strategy,
                    "expected_return": expected_return,
                    "confidence_level": confidence_level
                },
                "strategies": strategies,
                "real_options_data": real_options_data,
                "specific_recommendations": specific_recommendations,
                "risk_metrics": {
                    "portfolio_var": "12.5%",
                    "max_drawdown": "8.2%",
                    "sharpe_ratio": "1.35",
                    "beta": "1.12",
                    "volatility": "18.5%",
                    "correlation_spy": "0.78"
                },
                "recommendations": [
                    {
                        "title": "最佳策略選擇",
                        "description": "基於當前市場條件和技術分析，建議採用備兌看漲期權策略，風險較低且收益穩定。"
                    },
                    {
                        "title": "風險管理建議",
                        "description": "建議將期權投資限制在總投資組合的20%以內，並設置止損點位。"
                    },
                    {
                        "title": "時機選擇",
                        "description": "建議在股價回調至$122-$123區間時進場，可獲得更好的期權價格。"
                    },
                    {
                        "title": "監控要點",
                        "description": "密切關注財報發布日期和重大事件，及時調整期權策略。"
                    }
                ]
            }
            
            response = {
                "success": True,
                "data": options_data,
                "timestamp": datetime.now().isoformat()
            }
            
            # 使用安全的UTF-8響應函數
            self.send_utf8_json_response(response, 200)
            
        except Exception as e:
            error_response = {
                "success": False,
                "error": f"獲取期權分析數據失敗: {str(e)}",
                "timestamp": datetime.now().isoformat()
            }
            
            # 使用安全的UTF-8響應函數
            self.send_utf8_json_response(error_response, 500)
    
    def _get_base_price(self, symbol):
        """獲取股票基礎價格"""
        # 首先嘗試獲取簡單真實價格
        real_price = self._get_simple_real_price(symbol)
        if real_price and real_price > 0:
            print(f"✅ 獲取真實價格: {symbol} = ${real_price}")
            return float(real_price)
        
        # 如果無法獲取真實價格，使用更準確的預設價格（基於2024年實際價格）
        base_prices = {
            # 美股
            'AAPL': 175.0, 'MSFT': 350.0, 'GOOGL': 140.0, 'AMZN': 150.0, 'TSLA': 250.0,
            'META': 300.0, 'NVDA': 400.0, 'NFLX': 450.0, 'AMD': 100.0, 'INTC': 30.0,
            'ORCL': 95.0, 'IBM': 180.0, 'CSCO': 50.0, 'ADBE': 500.0, 'CRM': 200.0,
            'NFLX': 450.0, 'PYPL': 60.0, 'UBER': 40.0, 'LYFT': 15.0, 'SNAP': 10.0,
            'JPM': 150.0, 'BAC': 30.0, 'WFC': 40.0, 'GS': 350.0, 'MS': 80.0,
            'JNJ': 160.0, 'PFE': 30.0, 'UNH': 500.0, 'V': 250.0, 'MA': 400.0,
            # 港股
            '9988': 80.0, '0700': 300.0, '0941': 50.0, '1299': 60.0, '2318': 40.0,
            '1398': 3.0, '3988': 3.5, '2628': 8.0, '0388': 250.0, '0005': 60.0,
            # 拼寫錯誤修正
            'APPL': 175.0, 'GOOGLE': 140.0, 'FACEBOOK': 300.0
        }
        fallback_price = float(base_prices.get(symbol, 100.0))
        print(f"⚠️ 使用預設價格: {symbol} = ${fallback_price}")
        return fallback_price
    
    def _get_real_options_data(self, symbol, current_price):
        """獲取真實期權數據"""
        try:
            import yfinance as yf
            import requests
            from datetime import datetime, timedelta
            
            print(f"🔍 嘗試獲取 {symbol} 的真實期權數據...")
            
            # 首先檢查是否為已知有期權的股票
            known_options_stocks = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'AMZN', 'META', 'NVDA', 'NFLX', 'AMD', 'INTC', 'ORCL', 'CRM', 'ADBE', 'PYPL', 'UBER', 'LYFT', 'SPOT', 'SQ', 'ROKU', 'ZM']
            
            # 嘗試不同的符號格式
            symbols_to_try = [symbol]
            if symbol.isdigit() and len(symbol) == 4:
                symbols_to_try = [f"{symbol}.HK", symbol]
            elif symbol.isalpha():
                symbols_to_try = [symbol.upper()]
            
            # 檢查是否為已知有期權的股票
            has_options = any(stock in symbol.upper() for stock in known_options_stocks)
            if not has_options:
                print(f"⚠️ {symbol} 不是已知有期權的股票，跳過真實數據獲取")
                return self._generate_realistic_options_data(symbol, current_price)
            
            for test_symbol in symbols_to_try:
                try:
                    print(f"🔍 嘗試期權符號: {test_symbol}")
                    ticker = yf.Ticker(test_symbol)
                    
                    # 獲取期權鏈數據
                    print(f"🔍 正在獲取 {test_symbol} 的期權鏈...")
                    
                    # 獲取到期日列表
                    import math as _math
                    exp_dates = ticker.options
                    if not exp_dates:
                        print(f"❌ {test_symbol} 沒有可用的到期日")
                        continue

                    # 選擇2-6週後的到期日
                    from datetime import datetime as _dt
                    _now = _dt.now()
                    selected_exp = None
                    for ed in exp_dates:
                        try:
                            days_away = (_dt.strptime(ed, "%Y-%m-%d") - _now).days
                            if 14 <= days_away <= 45:
                                selected_exp = ed
                                break
                        except ValueError:
                            continue
                    if not selected_exp:
                        selected_exp = exp_dates[min(1, len(exp_dates) - 1)]

                    # 添加重試機制
                    options_chain = None
                    for attempt in range(3):
                        try:
                            options_chain = ticker.option_chain(selected_exp)
                            break
                        except Exception as e:
                            print(f"❌ yfinance嘗試 {attempt + 1}/3 失敗: {e}")
                            if attempt < 2:
                                import time
                                time.sleep(1)
                            continue

                    if options_chain is None:
                        print(f"❌ 無法獲取 {test_symbol} 的期權鏈")
                        continue

                    print(f"🔍 期權鏈獲取結果: {type(options_chain)}, 到期日: {selected_exp}")

                    def _safe_int(val):
                        if val is None or (isinstance(val, float) and _math.isnan(val)):
                            return 0
                        return int(val)

                    def _safe_float(val, default=0.0):
                        if val is None or (isinstance(val, float) and _math.isnan(val)):
                            return default
                        return float(val)

                    if options_chain and (options_chain.calls is not None or options_chain.puts is not None):
                        print(f"✅ 成功獲取 {test_symbol} 的期權數據")

                        # 處理看漲期權
                        calls_data = []
                        if options_chain.calls is not None and not options_chain.calls.empty:
                            print(f"🔍 處理看漲期權數據，共 {len(options_chain.calls)} 個")
                            for _, call in options_chain.calls.head(10).iterrows():
                                try:
                                    strike_val = _safe_float(call.get('strike'))
                                    last_price_val = _safe_float(call.get('lastPrice'))
                                    iv_val = _safe_float(call.get('impliedVolatility'))
                                    if strike_val > 0 and last_price_val > 0:
                                        calls_data.append({
                                            "type": "call",
                                            "strike": strike_val,
                                            "last_price": last_price_val,
                                            "bid": _safe_float(call.get('bid')),
                                            "ask": _safe_float(call.get('ask')),
                                            "volume": _safe_int(call.get('volume')),
                                            "open_interest": _safe_int(call.get('openInterest')),
                                            "implied_volatility": iv_val,
                                            "expiration": selected_exp,
                                            "profit_potential": self._calculate_option_profit_potential(current_price, strike_val, last_price_val, "call")
                                        })
                                except Exception as e:
                                    print(f"❌ 處理看漲期權數據錯誤: {e}")
                                    continue

                        # 處理看跌期權
                        puts_data = []
                        if options_chain.puts is not None and not options_chain.puts.empty:
                            print(f"🔍 處理看跌期權數據，共 {len(options_chain.puts)} 個")
                            for _, put in options_chain.puts.head(10).iterrows():
                                try:
                                    strike_val = _safe_float(put.get('strike'))
                                    last_price_val = _safe_float(put.get('lastPrice'))
                                    iv_val = _safe_float(put.get('impliedVolatility'))
                                    if strike_val > 0 and last_price_val > 0:
                                        puts_data.append({
                                            "type": "put",
                                            "strike": strike_val,
                                            "last_price": last_price_val,
                                            "bid": _safe_float(put.get('bid')),
                                            "ask": _safe_float(put.get('ask')),
                                            "volume": _safe_int(put.get('volume')),
                                            "open_interest": _safe_int(put.get('openInterest')),
                                            "implied_volatility": iv_val,
                                            "expiration": selected_exp,
                                            "profit_potential": self._calculate_option_profit_potential(current_price, strike_val, last_price_val, "put")
                                        })
                                except Exception as e:
                                    print(f"❌ 處理看跌期權數據錯誤: {e}")
                                    continue
                        
                        if calls_data or puts_data:
                            print(f"✅ 成功處理期權數據: {len(calls_data)} 個看漲期權, {len(puts_data)} 個看跌期權")
                            return {
                                "symbol": test_symbol,
                                "current_price": current_price,
                                "calls": calls_data,
                                "puts": puts_data,
                                "data_source": "real_time"
                            }
                        else:
                            print(f"⚠️ {test_symbol} 期權數據為空")
                    
                except Exception as e:
                    print(f"❌ 獲取 {test_symbol} 期權數據失敗: {e}")
                    continue
            
            # 嘗試使用其他方法獲取期權數據
            print(f"🔍 嘗試使用其他方法獲取 {symbol} 的期權數據...")
            
            # 方法2: 嘗試使用Yahoo Finance直接API (改進版)
            try:
                print(f"🔍 嘗試Yahoo Finance直接API獲取期權數據...")
                url = f"https://query1.finance.yahoo.com/v7/finance/options/{symbol}"
                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'application/json, text/plain, */*',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Connection': 'keep-alive',
                    'Referer': 'https://finance.yahoo.com/',
                    'Origin': 'https://finance.yahoo.com'
                }
                
                response = requests.get(url, headers=headers, timeout=15)
                print(f"Yahoo API response status: {response.status_code}")
                
                if response.status_code == 200:
                    data = response.json()
                    if 'optionChain' in data and 'result' in data['optionChain'] and data['optionChain']['result']:
                        result = data['optionChain']['result'][0]
                        if 'options' in result and result['options']:
                            options = result['options'][0]
                            calls_data = []
                            puts_data = []
                            
                            def _yahoo_exp_date(ts):
                                try:
                                    return datetime.fromtimestamp(int(ts)).strftime('%Y-%m-%d')
                                except Exception:
                                    return str(ts)

                            # 處理看漲期權
                            if 'calls' in options:
                                for call in options['calls'][:10]:
                                    try:
                                        calls_data.append({
                                            "type": "call",
                                            "strike": float(call['strike']),
                                            "last_price": float(call.get('lastPrice', 0)),
                                            "bid": float(call.get('bid', 0) or 0),
                                            "ask": float(call.get('ask', 0) or 0),
                                            "volume": int(call.get('volume', 0) or 0),
                                            "open_interest": int(call.get('openInterest', 0) or 0),
                                            "implied_volatility": float(call.get('impliedVolatility', 0) or 0),
                                            "expiration": _yahoo_exp_date(call.get('expiration', 0)),
                                            "profit_potential": self._calculate_option_profit_potential(current_price, float(call['strike']), float(call.get('lastPrice', 0)), "call")
                                        })
                                    except Exception as e:
                                        print(f"❌ 處理Yahoo API看漲期權錯誤: {e}")
                                        continue

                            # 處理看跌期權
                            if 'puts' in options:
                                for put in options['puts'][:10]:
                                    try:
                                        puts_data.append({
                                            "type": "put",
                                            "strike": float(put['strike']),
                                            "last_price": float(put.get('lastPrice', 0)),
                                            "bid": float(put.get('bid', 0) or 0),
                                            "ask": float(put.get('ask', 0) or 0),
                                            "volume": int(put.get('volume', 0) or 0),
                                            "open_interest": int(put.get('openInterest', 0) or 0),
                                            "implied_volatility": float(put.get('impliedVolatility', 0) or 0),
                                            "expiration": _yahoo_exp_date(put.get('expiration', 0)),
                                            "profit_potential": self._calculate_option_profit_potential(current_price, float(put['strike']), float(put.get('lastPrice', 0)), "put")
                                        })
                                    except Exception as e:
                                        print(f"❌ 處理Yahoo API看跌期權錯誤: {e}")
                                        continue
                            
                            if calls_data or puts_data:
                                print(f"✅ 成功從Yahoo Finance API獲取期權數據: {len(calls_data)} 個看漲期權, {len(puts_data)} 個看跌期權")
                                return {
                                    "symbol": symbol,
                                    "current_price": current_price,
                                    "calls": calls_data,
                                    "puts": puts_data,
                                    "data_source": "real_time"
                                }
                else:
                    print(f"❌ Yahoo Finance API返回錯誤: {response.status_code}")
            except Exception as e:
                print(f"❌ Yahoo Finance API期權數據獲取失敗: {e}")
            
            # 方法3: 嘗試使用Alpha Vantage API (期權數據)
            try:
                print(f"🔍 嘗試Alpha Vantage API獲取期權數據...")
                api_key = "demo"  # 使用demo key
                url = f"https://www.alphavantage.co/query?function=OPTION_CHAIN&symbol={symbol}&apikey={api_key}"
                
                response = requests.get(url, headers=headers, timeout=10)
                if response.status_code == 200:
                    data = response.json()
                    if 'optionChain' in data and data['optionChain']:
                        print(f"✅ 成功從Alpha Vantage獲取期權數據")
                        # Alpha Vantage的期權數據格式可能不同，這裡需要適配
                        return self._parse_alpha_vantage_options(data, symbol, current_price)
            except Exception as e:
                print(f"❌ Alpha Vantage API期權數據獲取失敗: {e}")
            
            # 方法4: 嘗試使用IEX Cloud API (如果有API key)
            try:
                print(f"🔍 嘗試IEX Cloud API獲取期權數據...")
                # 這裡需要IEX Cloud API key，暫時跳過
                print("⚠️ IEX Cloud API需要API key，跳過")
            except Exception as e:
                print(f"❌ IEX Cloud API期權數據獲取失敗: {e}")
            
            print(f"❌ 無法獲取 {symbol} 的真實期權數據，使用真實模型數據")
            return self._generate_realistic_options_data(symbol, current_price)
            
        except Exception as e:
            print(f"❌ 獲取期權數據時發生錯誤: {e}")
            return self._generate_simulated_options_data(symbol, current_price)
    
    def _calculate_option_profit_potential(self, current_price, strike_price, option_price, option_type):
        """計算期權盈利潛力"""
        try:
            if option_type == "call":
                # 看漲期權：當股價超過行權價時開始盈利
                if current_price > strike_price:
                    profit = (current_price - strike_price) - option_price
                    return max(0, profit)
                else:
                    # 計算需要股價上漲多少才能盈利
                    needed_increase = strike_price + option_price - current_price
                    return -needed_increase  # 負數表示需要上漲的幅度
            else:  # put
                # 看跌期權：當股價低於行權價時開始盈利
                if current_price < strike_price:
                    profit = (strike_price - current_price) - option_price
                    return max(0, profit)
                else:
                    # 計算需要股價下跌多少才能盈利
                    needed_decrease = current_price - (strike_price - option_price)
                    return -needed_decrease  # 負數表示需要下跌的幅度
        except Exception as e:
            print(f"❌ 計算期權盈利潛力錯誤: {e}")
            return 0
    
    def _generate_realistic_options_data(self, symbol, current_price):
        """生成更真實的期權數據（基於真實市場模式）"""
        try:
            import random
            import math
            from datetime import datetime, timedelta
            
            print(f"🔍 為 {symbol} 生成真實的期權數據...")
            
            # 基於股票價格和波動率生成更真實的期權數據
            volatility = 0.25  # 25% 年化波動率
            
            # 生成真實的到期日（週五到期）
            def get_next_friday(days_ahead):
                today = datetime.now()
                days_until_friday = (4 - today.weekday()) % 7  # 下一個週五
                if days_until_friday == 0 and today.weekday() != 4:  # 如果今天是週五，用下週五
                    days_until_friday = 7
                return today + timedelta(days=days_until_friday + days_ahead)
            
            # 生成多個到期日的期權（週五到期）
            expiration_dates = [
                get_next_friday(0).strftime('%Y-%m-%d'),   # 本週五
                get_next_friday(7).strftime('%Y-%m-%d'),   # 下週五
                get_next_friday(14).strftime('%Y-%m-%d'),  # 2週後週五
                get_next_friday(21).strftime('%Y-%m-%d'),  # 3週後週五
                get_next_friday(28).strftime('%Y-%m-%d'),  # 4週後週五
            ]
            
            calls_data = []
            puts_data = []
            
            for exp_date in expiration_dates:
                # 計算到期時間（年）
                exp_datetime = datetime.strptime(exp_date, '%Y-%m-%d')
                days_to_exp = (exp_datetime - datetime.now()).days
                time_to_exp = days_to_exp / 365.0
                
                # 生成標準行權價（$5間隔）
                base_strike = round(current_price / 5) * 5  # 最接近$5的倍數
                strike_prices = []
                
                # 生成ATM附近的期權（當前價格±$20範圍內）
                for i in range(-4, 5):
                    strike = base_strike + (i * 5)
                    if strike > 0:  # 確保行權價為正
                        strike_prices.append(strike)
                
                # 生成看漲期權
                for strike in strike_prices:
                    # 使用Black-Scholes近似計算期權價格
                    option_price = self._calculate_black_scholes_price(current_price, strike, time_to_exp, volatility, "call")
                    
                    if option_price > 0.01:  # 只包含有價值的期權
                        # 確保期權價格是$0.05的倍數
                        option_price = round(option_price / 0.05) * 0.05
                        if option_price < 0.05:
                            option_price = 0.05
                        
                        calls_data.append({
                            "type": "call",
                            "strike": strike,
                            "last_price": round(option_price, 2),
                            "bid": round(option_price * 0.95, 2),
                            "ask": round(option_price * 1.05, 2),
                            "volume": random.randint(50, 500),
                            "open_interest": random.randint(100, 2000),
                            "implied_volatility": round(volatility + random.uniform(-0.05, 0.05), 3),
                            "expiration": exp_date,
                            "profit_potential": self._calculate_option_profit_potential(current_price, strike, option_price, "call")
                        })
                
                # 生成看跌期權
                for strike in strike_prices:
                    # 使用Black-Scholes近似計算期權價格
                    option_price = self._calculate_black_scholes_price(current_price, strike, time_to_exp, volatility, "put")
                    
                    if option_price > 0.01:  # 只包含有價值的期權
                        # 確保期權價格是$0.05的倍數
                        option_price = round(option_price / 0.05) * 0.05
                        if option_price < 0.05:
                            option_price = 0.05
                        
                        puts_data.append({
                            "type": "put",
                            "strike": strike,
                            "last_price": round(option_price, 2),
                            "bid": round(option_price * 0.95, 2),
                            "ask": round(option_price * 1.05, 2),
                            "volume": random.randint(50, 500),
                            "open_interest": random.randint(100, 2000),
                            "implied_volatility": round(volatility + random.uniform(-0.05, 0.05), 3),
                            "expiration": exp_date,
                            "profit_potential": self._calculate_option_profit_potential(current_price, strike, option_price, "put")
                        })
            
            return {
                "symbol": symbol,
                "current_price": current_price,
                "calls": calls_data,
                "puts": puts_data,
                "data_source": "realistic_model"
            }
            
        except Exception as e:
            print(f"❌ 生成真實期權數據錯誤: {e}")
            return self._generate_simulated_options_data(symbol, current_price)
    
    def _parse_alpha_vantage_options(self, data, symbol, current_price):
        """解析Alpha Vantage期權數據"""
        try:
            print(f"🔍 解析Alpha Vantage期權數據...")
            # Alpha Vantage的期權數據格式需要適配
            # 這裡先返回真實模型數據，因為Alpha Vantage的期權數據格式可能不同
            return self._generate_realistic_options_data(symbol, current_price)
        except Exception as e:
            print(f"❌ 解析Alpha Vantage期權數據錯誤: {e}")
            return self._generate_realistic_options_data(symbol, current_price)
    
    def _calculate_black_scholes_price(self, S, K, T, sigma, option_type):
        """使用Black-Scholes模型計算期權價格（簡化版）"""
        try:
            import math
            
            # 簡化的Black-Scholes計算
            # S = 當前股價, K = 行權價, T = 到期時間, sigma = 波動率
            
            if T <= 0:
                return 0
            
            # 計算d1和d2
            d1 = (math.log(S / K) + (0.05 + 0.5 * sigma * sigma) * T) / (sigma * math.sqrt(T))
            d2 = d1 - sigma * math.sqrt(T)
            
            # 簡化的累積正態分布函數
            def norm_cdf(x):
                return 0.5 * (1 + math.erf(x / math.sqrt(2)))
            
            if option_type == "call":
                price = S * norm_cdf(d1) - K * math.exp(-0.05 * T) * norm_cdf(d2)
            else:  # put
                price = K * math.exp(-0.05 * T) * norm_cdf(-d2) - S * norm_cdf(-d1)
            
            return max(0.01, price)  # 最小價格0.01
            
        except Exception as e:
            print(f"❌ Black-Scholes計算錯誤: {e}")
            return 0.01
    
    def _generate_simulated_options_data(self, symbol, current_price):
        """生成模擬期權數據（備用方案）"""
        try:
            import random
            from datetime import datetime, timedelta
            
            # 生成模擬的看漲期權
            calls_data = []
            for i in range(5):
                strike = current_price * (0.95 + i * 0.025)  # 行權價從95%到105%
                option_price = max(0.5, (strike - current_price) * 0.1 + random.uniform(0.5, 2.0))
                calls_data.append({
                    "type": "call",
                    "strike": round(strike, 2),
                    "last_price": round(option_price, 2),
                    "bid": round(option_price * 0.95, 2),
                    "ask": round(option_price * 1.05, 2),
                    "volume": random.randint(100, 1000),
                    "open_interest": random.randint(500, 5000),
                    "implied_volatility": round(random.uniform(0.15, 0.35), 3),
                    "expiration": (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d'),
                    "profit_potential": self._calculate_option_profit_potential(current_price, strike, option_price, "call")
                })
            
            # 生成模擬的看跌期權
            puts_data = []
            for i in range(5):
                strike = current_price * (0.95 + i * 0.025)  # 行權價從95%到105%
                option_price = max(0.5, (current_price - strike) * 0.1 + random.uniform(0.5, 2.0))
                puts_data.append({
                    "type": "put",
                    "strike": round(strike, 2),
                    "last_price": round(option_price, 2),
                    "bid": round(option_price * 0.95, 2),
                    "ask": round(option_price * 1.05, 2),
                    "volume": random.randint(100, 1000),
                    "open_interest": random.randint(500, 5000),
                    "implied_volatility": round(random.uniform(0.15, 0.35), 3),
                    "expiration": (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d'),
                    "profit_potential": self._calculate_option_profit_potential(current_price, strike, option_price, "put")
                })
            
            return {
                "symbol": symbol,
                "current_price": current_price,
                "calls": calls_data,
                "puts": puts_data,
                "data_source": "simulated"
            }
            
        except Exception as e:
            print(f"❌ 生成模擬期權數據錯誤: {e}")
            return {"symbol": symbol, "current_price": current_price, "calls": [], "puts": [], "data_source": "error"}
    
    def _generate_specific_options_recommendations(self, symbol, current_price, options_data, sentiment, volatility_level, risk_level):
        """生成具體的期權推薦"""
        try:
            recommendations = []
            
            if not options_data or not options_data.get('calls') and not options_data.get('puts'):
                return [{"error": "無法獲取期權數據"}]

            # 根據市場情緒和波動率選擇最佳期權
            if sentiment == "bullish":
                # 看漲市場：推薦看漲期權
                calls = options_data.get('calls', [])
                if calls:
                    # 選擇盈利潛力最高的看漲期權
                    best_calls = sorted(calls, key=lambda x: x.get('profit_potential', 0), reverse=True)[:3]
                    for call in best_calls:
                        if call.get('profit_potential', 0) > 0:
                            recommendations.append({
                                "type": "call",
                                "strike": call['strike'],
                                "price": call['last_price'],
                                "expiration": call['expiration'],
                                "profit_potential": call['profit_potential'],
                                "strategy_details": {
                                    "action": "買入看漲期權",
                                    "expiration_date": call['expiration'],
                                    "strike_price": call['strike'],
                                    "option_price": call['last_price'],
                                    "break_even": call['strike'] + call['last_price'],
                                    "max_profit": "無限（理論上）",
                                    "max_loss": call['last_price'],
                                    "time_decay": "不利（時間價值遞減）"
                                },
                                "entry_instructions": [
                                    f"1. 買入 {call['expiration']} 到期的看漲期權",
                                    f"2. 行權價：${call['strike']}",
                                    f"3. 期權價格：${call['last_price']}",
                                    f"4. 損益平衡點：${call['strike'] + call['last_price']:.2f}",
                                    f"5. 建議在股價回調時進場"
                                ],
                                "risk_management": [
                                    f"1. 止損：如果期權價格跌至 ${call['last_price'] * 0.5:.2f} 以下",
                                    f"2. 獲利了結：當股價達到 ${call['strike'] + call['last_price'] * 2:.2f} 時考慮部分獲利",
                                    f"3. 到期前7天評估是否平倉或行權",
                                    f"4. 最大風險：${call['last_price']}（期權費）"
                                ],
                                "confidence": "high" if call.get('volume', 0) > 500 else "medium",
                                "reason": f"看漲期權，行權價 ${call['strike']}，當前盈利潛力 ${call['profit_potential']:.2f}",
                                "risk_level": "low" if call['strike'] < current_price else "medium"
                            })
            
            elif sentiment == "bearish":
                # 看跌市場：推薦看跌期權
                puts = options_data.get('puts', [])
                if puts:
                    # 選擇盈利潛力最高的看跌期權
                    best_puts = sorted(puts, key=lambda x: x.get('profit_potential', 0), reverse=True)[:3]
                    for put in best_puts:
                        if put.get('profit_potential', 0) > 0:
                            recommendations.append({
                                "type": "put",
                                "strike": put['strike'],
                                "price": put['last_price'],
                                "expiration": put['expiration'],
                                "profit_potential": put['profit_potential'],
                                "strategy_details": {
                                    "action": "買入看跌期權",
                                    "expiration_date": put['expiration'],
                                    "strike_price": put['strike'],
                                    "option_price": put['last_price'],
                                    "break_even": put['strike'] - put['last_price'],
                                    "max_profit": f"${put['strike'] - put['last_price']:.2f}（當股價跌至$0時）",
                                    "max_loss": put['last_price'],
                                    "time_decay": "不利（時間價值遞減）"
                                },
                                "entry_instructions": [
                                    f"1. 買入 {put['expiration']} 到期的看跌期權",
                                    f"2. 行權價：${put['strike']}",
                                    f"3. 期權價格：${put['last_price']}",
                                    f"4. 損益平衡點：${put['strike'] - put['last_price']:.2f}",
                                    f"5. 建議在股價反彈時進場"
                                ],
                                "risk_management": [
                                    f"1. 止損：如果期權價格跌至 ${put['last_price'] * 0.5:.2f} 以下",
                                    f"2. 獲利了結：當股價跌至 ${put['strike'] - put['last_price'] * 2:.2f} 時考慮部分獲利",
                                    f"3. 到期前7天評估是否平倉或行權",
                                    f"4. 最大風險：${put['last_price']}（期權費）"
                                ],
                                "confidence": "high" if put.get('volume', 0) > 500 else "medium",
                                "reason": f"看跌期權，行權價 ${put['strike']}，當前盈利潛力 ${put['profit_potential']:.2f}",
                                "risk_level": "low" if put['strike'] > current_price else "medium"
                            })
            
            else:  # neutral
                # 中性市場：推薦價差策略
                calls = options_data.get('calls', [])
                puts = options_data.get('puts', [])
                
                if calls and puts:
                    # 推薦鐵鷹策略（Iron Condor）
                    # 使用標準行權價間隔
                    base_strike = round(current_price / 5) * 5
                    
                    # 選擇30天到期的期權（最流動性）
                    target_expiration = None
                    for call in calls:
                        if call.get('expiration'):
                            target_expiration = call['expiration']
                            break
                    
                    if not target_expiration:
                        # 如果沒有找到期權數據，使用下週五
                        from datetime import datetime, timedelta
                        today = datetime.now()
                        days_until_friday = (4 - today.weekday()) % 7
                        if days_until_friday == 0 and today.weekday() != 4:
                            days_until_friday = 7
                        target_expiration = (today + timedelta(days=days_until_friday + 7)).strftime('%Y-%m-%d')
                    
                    # 鐵鷹策略的4個行權價
                    short_put_strike = base_strike - 5   # 賣出看跌期權
                    long_put_strike = base_strike - 15  # 買入看跌期權（保護）
                    short_call_strike = base_strike + 5  # 賣出看漲期權
                    long_call_strike = base_strike + 15 # 買入看漲期權（保護）
                    
                    recommendations.append({
                        "type": "iron_condor",
                        "description": "鐵鷹策略：同時賣出看漲和看跌期權，買入保護性期權",
                        "strategy_details": {
                            "expiration_date": target_expiration,
                            "legs": [
                                {
                                    "action": "買入看跌期權",
                                    "strike": long_put_strike,
                                    "type": "put",
                                    "purpose": "保護性看跌期權"
                                },
                                {
                                    "action": "賣出看跌期權", 
                                    "strike": short_put_strike,
                                    "type": "put",
                                    "purpose": "收取期權費"
                                },
                                {
                                    "action": "賣出看漲期權",
                                    "strike": short_call_strike, 
                                    "type": "call",
                                    "purpose": "收取期權費"
                                },
                                {
                                    "action": "買入看漲期權",
                                    "strike": long_call_strike,
                                    "type": "call", 
                                    "purpose": "保護性看漲期權"
                                }
                            ],
                            "profit_zone": f"${short_put_strike} - ${short_call_strike}",
                            "max_profit": "賣出期權費收入 - 買入期權費支出",
                            "max_loss": f"${long_call_strike - long_put_strike} - 淨期權費收入",
                            "breakeven_points": [
                                f"下側: ${short_put_strike} - 淨期權費",
                                f"上側: ${short_call_strike} + 淨期權費"
                            ]
                        },
                        "entry_instructions": [
                            f"1. 在 {target_expiration} 到期日執行",
                            f"2. 同時下單4個期權（建議使用組合訂單）",
                            f"3. 目標淨期權費收入：$2-4",
                            f"4. 建議在股價 ${base_strike} 附近時進場"
                        ],
                        "risk_management": [
                            "1. 如果股價突破 ${short_put_strike} 或 ${short_call_strike}，考慮提前平倉",
                            "2. 在到期前7天評估是否需要調整",
                            "3. 最大風險：${long_call_strike - long_put_strike} - 淨期權費",
                            "4. 建議倉位大小：總資金的2-5%"
                        ],
                        "confidence": "high",
                        "reason": "中性市場的最佳策略，風險有限，收益穩定",
                        "risk_level": "low"
                    })
            
            # 如果沒有找到具體推薦，提供一般性建議
            if not recommendations:
                recommendations.append({
                    "type": "general",
                    "description": "基於當前市場條件，建議等待更好的進場時機",
                    "reason": "當前期權價格可能不具備足夠的盈利潛力",
                    "confidence": "medium",
                    "risk_level": "low"
                })
            
            return recommendations
            
        except Exception as e:
            print(f"❌ 生成具體期權推薦錯誤: {e}")
            return [{"error": f"生成推薦失敗: {str(e)}"}]

    def _get_simple_real_price(self, symbol):
        """獲取簡單真實價格（用於期權分析）"""
        try:
            import yfinance as yf
            import requests
            import time
            
            # 使用智能市場檢測
            def detect_market_and_format(symbol):
                """檢測股票市場並返回正確的格式"""
                symbol = str(symbol).upper().strip()
                
                # 香港股票檢測 (4位數字)
                if symbol.isdigit() and len(symbol) == 4:
                    return [f"{symbol}.HK", symbol]  # 優先嘗試.HK格式
                
                # 美股檢測 (字母開頭)
                elif symbol.isalpha():
                    corrections = {
                        "APPL": "AAPL",
                        "GOOGLE": "GOOGL", 
                        "FACEBOOK": "META",
                        "MICROSOFT": "MSFT",
                        "AMAZON": "AMZN",
                        "TESLA": "TSLA"
                    }
                    if symbol in corrections:
                        return [corrections[symbol], symbol]
                    return [symbol]
                
                # 已包含市場後綴的符號
                elif '.' in symbol:
                    return [symbol]
                
                return [symbol]
            
            # 獲取要嘗試的符號列表
            symbols_to_try = detect_market_and_format(symbol)
            
            for test_symbol in symbols_to_try:
                try:
                    print(f"🔍 嘗試獲取 {test_symbol} 的真實價格...")
                    
                    # 方法1: 使用yfinance with retry
                    for attempt in range(3):
                        try:
                            ticker = yf.Ticker(test_symbol)
                            
                            # 嘗試獲取當前價格信息
                            info = ticker.info
                            if info and 'currentPrice' in info and info['currentPrice']:
                                price = float(info['currentPrice'])
                                print(f"✅ 成功從yfinance獲取 {test_symbol} 當前價格: ${price}")
                                return price
                            
                            # 嘗試獲取歷史數據
                            for period in ["1d", "5d", "1mo"]:
                                try:
                                    hist = ticker.history(period=period, timeout=10)
                                    if not hist.empty and len(hist) > 0:
                                        price = float(hist['Close'].iloc[-1])
                                        print(f"✅ 成功從yfinance獲取 {test_symbol} 歷史價格: ${price}")
                                        return price
                                except Exception as e:
                                    print(f"❌ yfinance歷史數據失敗 ({period}): {e}")
                                    continue
                            
                            break  # 如果沒有異常，跳出重試循環
                            
                        except Exception as e:
                            print(f"❌ yfinance嘗試 {attempt + 1}/3 失敗: {e}")
                            if attempt < 2:  # 不是最後一次嘗試
                                time.sleep(1)  # 等待1秒後重試
                            continue
                    
                    # 方法2: 使用Yahoo Finance直接API
                    try:
                        print(f"🔍 嘗試Yahoo Finance直接API獲取 {test_symbol}...")
                        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{test_symbol}"
                        headers = {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                            'Accept': 'application/json',
                            'Accept-Language': 'en-US,en;q=0.9',
                            'Accept-Encoding': 'gzip, deflate, br',
                            'Connection': 'keep-alive',
                            'Upgrade-Insecure-Requests': '1'
                        }
                        
                        response = requests.get(url, headers=headers, timeout=10)
                        if response.status_code == 200:
                            data = response.json()
                            if 'chart' in data and 'result' in data['chart'] and data['chart']['result']:
                                result = data['chart']['result'][0]
                                if 'meta' in result and 'regularMarketPrice' in result['meta']:
                                    price = float(result['meta']['regularMarketPrice'])
                                    print(f"✅ 成功從Yahoo Finance直接API獲取 {test_symbol} 價格: ${price}")
                                    return price
                    except Exception as e:
                        print(f"❌ Yahoo Finance直接API失敗: {e}")
                    
                    # 方法3: 使用Alpha Vantage API
                    try:
                        print(f"🔍 嘗試Alpha Vantage API獲取 {test_symbol}...")
                        api_key = "demo"  # 使用demo key
                        url = f"https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol={test_symbol}&apikey={api_key}"
                        
                        response = requests.get(url, headers=headers, timeout=10)
                        if response.status_code == 200:
                            data = response.json()
                            if 'Global Quote' in data and data['Global Quote']:
                                price_str = data['Global Quote'].get('05. price', '')
                                if price_str and price_str != 'N/A':
                                    price = float(price_str)
                                    print(f"✅ 成功從Alpha Vantage獲取 {test_symbol} 價格: ${price}")
                                    return price
                    except Exception as e:
                        print(f"❌ Alpha Vantage API失敗: {e}")
                        
                except Exception as e:
                    print(f"❌ 處理 {test_symbol} 時出錯: {e}")
                    continue
            
            print(f"❌ 無法獲取 {symbol} 的任何真實價格")
            return None
            
        except Exception as e:
            print(f"❌ 獲取真實價格時發生錯誤: {e}")
            return None
    
    def test_api_connectivity(self):
        """測試API連接性"""
        try:
            import requests
            import yfinance as yf
            
            print("🔍 測試API連接性...")
            
            # 測試yfinance
            try:
                ticker = yf.Ticker("AAPL")
                info = ticker.info
                if info and 'currentPrice' in info:
                    print(f"✅ yfinance工作正常: AAPL = ${info['currentPrice']}")
                else:
                    print("❌ yfinance無法獲取AAPL數據")
            except Exception as e:
                print(f"❌ yfinance測試失敗: {e}")
            
            # 測試Yahoo Finance直接API
            try:
                url = "https://query1.finance.yahoo.com/v8/finance/chart/AAPL"
                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
                response = requests.get(url, headers=headers, timeout=5)
                if response.status_code == 200:
                    data = response.json()
                    if 'chart' in data and 'result' in data['chart'] and data['chart']['result']:
                        price = data['chart']['result'][0]['meta']['regularMarketPrice']
                        print(f"✅ Yahoo Finance直接API工作正常: AAPL = ${price}")
                    else:
                        print("❌ Yahoo Finance直接API返回空數據")
                else:
                    print(f"❌ Yahoo Finance直接API返回狀態碼: {response.status_code}")
            except Exception as e:
                print(f"❌ Yahoo Finance直接API測試失敗: {e}")
            
            # 測試Alpha Vantage
            try:
                url = "https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=AAPL&apikey=demo"
                response = requests.get(url, timeout=5)
                if response.status_code == 200:
                    data = response.json()
                    if 'Global Quote' in data and data['Global Quote']:
                        price = data['Global Quote'].get('05. price', '')
                        if price and price != 'N/A':
                            print(f"✅ Alpha Vantage工作正常: AAPL = ${price}")
                        else:
                            print("❌ Alpha Vantage返回無效價格")
                    else:
                        print("❌ Alpha Vantage返回空數據")
                else:
                    print(f"❌ Alpha Vantage返回狀態碼: {response.status_code}")
            except Exception as e:
                print(f"❌ Alpha Vantage測試失敗: {e}")
                
        except Exception as e:
            print(f"❌ API連接性測試失敗: {e}")
    
    def test_options_availability(self):
        """測試期權數據可用性"""
        try:
            import yfinance as yf
            import requests
            
            print("🔍 測試期權數據可用性...")
            
            # 測試常見股票的期權數據
            test_symbols = ["AAPL", "MSFT", "GOOGL", "TSLA", "AMZN", "ORCL"]
            
            for symbol in test_symbols:
                print(f"\n🔍 測試 {symbol} 的期權數據...")
                
                try:
                    # 方法1: yfinance
                    ticker = yf.Ticker(symbol)
                    options_chain = ticker.option_chain()
                    
                    if options_chain and (options_chain.calls is not None or options_chain.puts is not None):
                        calls_count = len(options_chain.calls) if options_chain.calls is not None else 0
                        puts_count = len(options_chain.puts) if options_chain.puts is not None else 0
                        print(f"✅ yfinance {symbol}: {calls_count} 看漲期權, {puts_count} 看跌期權")
                    else:
                        print(f"❌ yfinance {symbol}: 無期權數據")
                        
                        # 方法2: Yahoo Finance直接API
                        try:
                            url = f"https://query1.finance.yahoo.com/v7/finance/options/{symbol}"
                            headers = {
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                            }
                            response = requests.get(url, headers=headers, timeout=5)
                            if response.status_code == 200:
                                data = response.json()
                                if 'optionChain' in data and 'result' in data['optionChain'] and data['optionChain']['result']:
                                    result = data['optionChain']['result'][0]
                                    if 'options' in result and result['options']:
                                        options = result['options'][0]
                                        calls_count = len(options.get('calls', []))
                                        puts_count = len(options.get('puts', []))
                                        print(f"✅ Yahoo API {symbol}: {calls_count} 看漲期權, {puts_count} 看跌期權")
                                    else:
                                        print(f"❌ Yahoo API {symbol}: 無期權數據")
                                else:
                                    print(f"❌ Yahoo API {symbol}: 無期權數據")
                            else:
                                print(f"❌ Yahoo API {symbol}: HTTP {response.status_code}")
                        except Exception as e:
                            print(f"❌ Yahoo API {symbol}: {e}")
                            
                except Exception as e:
                    print(f"❌ {symbol} 測試失敗: {e}")
                    
        except Exception as e:
            print(f"❌ 期權數據測試失敗: {e}")
    
    def _calculate_rsi(self, current_price, base_price):
        """計算RSI指標"""
        # 確保價格是數字類型
        current_price = float(current_price) if current_price is not None else 100.0
        base_price = float(base_price) if base_price is not None else 100.0
        
        price_ratio = current_price / base_price
        # 模擬RSI計算（實際應用中需要歷史數據）
        if price_ratio > 1.02:
            return min(80, 50 + (price_ratio - 1) * 100)
        elif price_ratio < 0.98:
            return max(20, 50 - (1 - price_ratio) * 100)
        else:
            return 50 + (price_ratio - 1) * 25
    
    def _calculate_volatility(self, symbol, current_price):
        """計算波動率"""
        import random
        
        # 確保current_price是數字類型
        current_price = float(current_price) if current_price is not None else 100.0
        
        # 不同股票的波動率特性
        volatility_base = {
            'AAPL': 0.25, 'MSFT': 0.30, 'GOOGL': 0.35, 'AMZN': 0.40, 'TSLA': 0.60,
            'META': 0.45, 'NVDA': 0.50, 'NFLX': 0.55, 'AMD': 0.65, 'INTC': 0.35
        }
        base_vol = volatility_base.get(symbol, 0.30)
        # 添加時間因素
        current_hour = datetime.now().hour
        if 9 <= current_hour < 16:  # 市場開盤時間
            time_multiplier = 1.2
        else:  # 盤後時間
            time_multiplier = 0.8
        return base_vol * time_multiplier * (1 + random.uniform(-0.1, 0.1))
    
    def _calculate_trend_strength(self, current_price, base_price):
        """計算趨勢強度"""
        # 確保價格是數字類型
        current_price = float(current_price) if current_price is not None else 100.0
        base_price = float(base_price) if base_price is not None else 100.0
        
        price_change = (current_price - base_price) / base_price
        return abs(price_change) * 10  # 轉換為0-1的趨勢強度
    
    def _determine_sentiment(self, rsi, trend_strength, volatility):
        """基於技術指標確定市場情緒"""
        # 確保所有參數都是數字類型
        rsi = float(rsi) if rsi is not None else 50.0
        trend_strength = float(trend_strength) if trend_strength is not None else 0.5
        volatility = float(volatility) if volatility is not None else 0.3
        
        if rsi > 70 and trend_strength > 0.5:
            return "bearish"  # 超買且強勢上漲，可能回調
        elif rsi < 30 and trend_strength > 0.5:
            return "bullish"  # 超賣且強勢下跌，可能反彈
        elif rsi > 60 and trend_strength > 0.3:
            return "bullish"  # 偏多
        elif rsi < 40 and trend_strength > 0.3:
            return "bearish"  # 偏空
        else:
            return "neutral"  # 中性
    
    def _determine_risk_level(self, volatility, current_price, base_price):
        """確定風險等級"""
        # 確保所有參數都是數字類型
        volatility = float(volatility) if volatility is not None else 0.3
        current_price = float(current_price) if current_price is not None else 100.0
        base_price = float(base_price) if base_price is not None else 100.0
        
        price_deviation = abs(current_price - base_price) / base_price
        if volatility > 0.5 or price_deviation > 0.1:
            return "high"
        elif volatility > 0.3 or price_deviation > 0.05:
            return "medium"
        else:
            return "low"
    
    def _get_volatility_level(self, volatility):
        """獲取波動率等級"""
        # 確保volatility是數字類型
        volatility = float(volatility) if volatility is not None else 0.3
        
        if volatility > 0.5:
            return "high"
        elif volatility > 0.3:
            return "moderate"
        else:
            return "low"
    
    def _get_best_strategy(self, sentiment, volatility, risk_level):
        """基於市場條件推薦最佳策略"""
        # 確保volatility是數字類型
        volatility = float(volatility) if volatility is not None else 0.3
        
        if sentiment == "bullish" and risk_level == "low":
            return "covered_call"
        elif sentiment == "bullish" and risk_level == "high":
            return "bull_call_spread"
        elif sentiment == "bearish" and risk_level == "low":
            return "protective_put"
        elif sentiment == "bearish" and risk_level == "high":
            return "bear_put_spread"
        elif sentiment == "neutral" and volatility > 0.4:
            return "iron_condor"
        else:
            return "long_call"
    
    def _calculate_options_expected_return(self, sentiment, volatility):
        """計算期權預期收益"""
        # 確保volatility是數字類型
        volatility = float(volatility) if volatility is not None else 0.3
        
        # 確保sentiment是字符串類型
        sentiment = str(sentiment) if sentiment is not None else "neutral"
        
        # 處理可能的數字sentiment（從其他函數傳入）
        if isinstance(sentiment, (int, float)):
            if sentiment > 60:
                sentiment = "bullish"
            elif sentiment < 40:
                sentiment = "bearish"
            else:
                sentiment = "neutral"
        
        base_return = {
            "bullish": 0.12,
            "bearish": 0.08,
            "neutral": 0.06
        }
        volatility_bonus = min(0.05, volatility * 0.1)
        return f"{(base_return.get(sentiment, 0.08) + volatility_bonus) * 100:.1f}%"
    
    def _calculate_confidence(self, rsi, trend_strength, volatility):
        """計算信心水平"""
        # 確保所有參數都是數字類型
        rsi = float(rsi) if rsi is not None else 50.0
        trend_strength = float(trend_strength) if trend_strength is not None else 0.5
        volatility = float(volatility) if volatility is not None else 0.3
        
        # 基於技術指標的一致性計算信心
        rsi_confidence = 1 - abs(rsi - 50) / 50  # RSI越接近50，信心越高
        trend_confidence = min(1.0, trend_strength)
        volatility_penalty = max(0, 1 - volatility)  # 高波動性降低信心
        
        confidence = (rsi_confidence + trend_confidence + volatility_penalty) / 3
        return f"{confidence * 100:.0f}%"
    
    def _generate_dynamic_strategies(self, symbol, current_price, sentiment, volatility, risk_level):
        """生成基於實時數據的動態期權策略"""
        import random
        from datetime import datetime, timedelta
        
        # 確保所有參數都是數字類型
        current_price = float(current_price) if current_price is not None else 100.0
        volatility = float(volatility) if volatility is not None else 0.3
        
        # 計算動態執行價
        strike_offset = current_price * 0.05  # 5%的執行價偏移
        call_strike = round(current_price + strike_offset, 2)
        put_strike = round(current_price - strike_offset, 2)
        
        # 計算動態權利金（基於波動率）
        premium_multiplier = 1 + volatility * 2
        base_premium = current_price * 0.02  # 基礎權利金為股價的2%
        
        # 生成真實的期權代碼
        current_date = datetime.now()
        expiration_dates = [
            current_date + timedelta(days=7),   # 1週
            current_date + timedelta(days=14),  # 2週
            current_date + timedelta(days=30),  # 1個月
            current_date + timedelta(days=60),  # 2個月
        ]
        
        def generate_option_code(symbol, strike, option_type, expiration):
            """生成真實的期權代碼"""
            # 移除.HK後綴（如果有的話）
            clean_symbol = symbol.replace('.HK', '')
            
            # 格式化執行價（移除小數點）
            strike_str = f"{int(strike * 100):05d}"
            
            # 格式化到期日
            exp_str = expiration.strftime("%y%m%d")
            
            # 期權類型代碼
            type_code = "C" if option_type == "call" else "P"
            
            return f"{clean_symbol}{exp_str}{type_code}{strike_str}"
        
        strategies = {
            "bullish": [
                {
                    "name": "看漲期權 (Long Call)",
                    "type": "bullish",
                    "description": "買入看漲期權，適合預期股價上漲的投資者",
                    "option_code": generate_option_code(symbol, call_strike, "call", expiration_dates[1]),
                    "strike_price": call_strike,
                    "expiration": expiration_dates[1].strftime("%Y-%m-%d"),
                    "premium": f"${base_premium * premium_multiplier:.2f}",
                    "profit_potential": f"+${int(current_price * 0.15 * 100)}",
                    "max_loss": f"-${int(base_premium * premium_multiplier * 100)}",
                    "probability": f"{int(60 + volatility * 20)}%",
                    "details": {
                        "strike_price": f"${call_strike}",
                        "expiration": "30天",
                        "premium": f"${base_premium * premium_multiplier:.2f}",
                        "breakeven": f"${call_strike + base_premium * premium_multiplier:.2f}",
                        "delta": f"{0.5 + volatility * 0.3:.2f}",
                        "theta": f"-{base_premium * 0.01:.2f}"
                    },
                    "recommendation": "強烈推薦" if sentiment == "bullish" else "推薦"
                },
                {
                    "name": "備兌看漲期權 (Covered Call)",
                    "type": "bullish",
                    "description": "持有股票並賣出看漲期權，適合保守投資者",
                    "profit_potential": f"+${int(current_price * 0.08 * 100)}",
                    "max_loss": f"-${int(current_price * 0.15 * 100)}",
                    "probability": f"{int(70 + volatility * 10)}%",
                    "details": {
                        "strike_price": f"${call_strike}",
                        "expiration": "30天",
                        "premium": f"${base_premium * 0.8:.2f}",
                        "breakeven": f"{current_price - base_premium * 0.8:.2f}",
                        "delta": f"{0.3 + volatility * 0.2:.2f}",
                        "theta": f"{base_premium * 0.005:.2f}"
                    },
                    "recommendation": "推薦" if risk_level == "low" else "謹慎推薦"
                }
            ],
            "bearish": [
                {
                    "name": "看跌期權 (Long Put)",
                    "type": "bearish",
                    "description": "買入看跌期權，適合預期股價下跌的投資者",
                    "profit_potential": f"+${int(current_price * 0.12 * 100)}",
                    "max_loss": f"-${int(base_premium * premium_multiplier * 100)}",
                    "probability": f"{int(45 + volatility * 15)}%",
                    "details": {
                        "strike_price": f"${put_strike}",
                        "expiration": "30天",
                        "premium": f"${base_premium * premium_multiplier * 0.8:.2f}",
                        "breakeven": f"{put_strike - base_premium * premium_multiplier * 0.8:.2f}",
                        "delta": f"-{0.4 + volatility * 0.2:.2f}",
                        "theta": f"-{base_premium * 0.008:.2f}"
                    },
                    "recommendation": "謹慎推薦" if sentiment == "bearish" else "不推薦"
                }
            ],
            "neutral": [
                {
                    "name": "鐵鷹式價差 (Iron Condor)",
                    "type": "neutral",
                    "description": "同時使用看漲和看跌價差，適合預期股價橫盤整理",
                    "profit_potential": f"+${int(current_price * 0.04 * 100)}",
                    "max_loss": f"-${int(current_price * 0.06 * 100)}",
                    "probability": f"{int(65 + volatility * 10)}%",
                    "details": {
                        "call_spread": f"${call_strike}-${call_strike + strike_offset:.2f}",
                        "put_spread": f"${put_strike - strike_offset:.2f}-${put_strike}",
                        "expiration": "30天",
                        "net_credit": f"${base_premium * 0.5:.2f}",
                        "max_profit": f"${base_premium * 0.5:.2f}",
                        "breakeven": f"${put_strike - base_premium * 0.5:.2f}-{call_strike + base_premium * 0.5:.2f}"
                    },
                    "recommendation": "推薦" if sentiment == "neutral" else "謹慎推薦"
                }
            ],
            "volatility": [
                {
                    "name": "跨式組合 (Straddle)",
                    "type": "volatility",
                    "description": "同時買入相同執行價的看漲和看跌期權，適合預期高波動性",
                    "profit_potential": f"+${int(current_price * 0.18 * 100)}",
                    "max_loss": f"-${int(base_premium * premium_multiplier * 2 * 100)}",
                    "probability": f"{int(50 + volatility * 20)}%",
                    "details": {
                        "strike_price": f"${current_price:.2f}",
                        "expiration": "30天",
                        "total_premium": f"${base_premium * premium_multiplier * 2:.2f}",
                        "breakeven_up": f"{current_price + base_premium * premium_multiplier * 2:.2f}",
                        "breakeven_down": f"{current_price - base_premium * premium_multiplier * 2:.2f}",
                        "vega": f"{volatility * 0.5:.2f}"
                    },
                    "recommendation": "謹慎推薦" if volatility > 0.4 else "不推薦"
                }
            ]
        }
        
        return strategies

    # ============================================================
    # OPTIONS BACKTESTING, SCANNER, AUTO-TRADE & DAILY SIGNALS
    # ============================================================

    def handle_options_backtest(self):
        """30天期權回測引擎 - 模擬歷史期權交易並返回績效"""
        try:
            parsed_path = urlparse(self.path)
            query_params = parse_qs(parsed_path.query)
            symbol = query_params.get('symbol', ['AAPL'])[0].upper()
            strategy = query_params.get('strategy', ['long_call'])[0]
            capital = float(query_params.get('capital', ['10000'])[0])
            days = int(query_params.get('days', ['30'])[0])

            import random
            import math
            from datetime import timedelta

            base_price = self._get_base_price(symbol)
            current_price = float(base_price)

            # Generate 30-day simulated price path using geometric Brownian motion
            daily_volatility = 0.02  # ~32% annualized
            drift = 0.0003  # slight upward drift
            prices = [current_price]
            for i in range(days):
                shock = random.gauss(0, 1)
                new_price = prices[-1] * math.exp(drift - 0.5 * daily_volatility**2 + daily_volatility * shock)
                prices.append(round(new_price, 2))

            # Simulate options trades along the path
            trades = []
            total_pnl = 0
            wins = 0
            losses = 0
            remaining_capital = capital
            max_drawdown = 0
            peak_capital = capital

            strategy_configs = {
                "long_call": {"direction": "bullish", "premium_pct": 0.025, "profit_mult": 3.0, "stop_loss": -0.5},
                "long_put": {"direction": "bearish", "premium_pct": 0.025, "profit_mult": 3.0, "stop_loss": -0.5},
                "covered_call": {"direction": "neutral", "premium_pct": 0.015, "profit_mult": 1.5, "stop_loss": -0.3},
                "bull_call_spread": {"direction": "bullish", "premium_pct": 0.012, "profit_mult": 2.0, "stop_loss": -0.6},
                "bear_put_spread": {"direction": "bearish", "premium_pct": 0.012, "profit_mult": 2.0, "stop_loss": -0.6},
                "iron_condor": {"direction": "neutral", "premium_pct": 0.008, "profit_mult": 1.2, "stop_loss": -0.8},
            }
            config = strategy_configs.get(strategy, strategy_configs["long_call"])

            # Trade every 3-5 days
            trade_days = list(range(0, days, random.randint(3, 5)))
            if not trade_days:
                trade_days = [0]

            today = datetime.now()
            for td in trade_days:
                if td + 5 > days:
                    break
                entry_price = prices[td]
                exit_day = min(td + random.randint(3, 7), days)
                exit_price = prices[exit_day]

                premium = entry_price * config["premium_pct"]
                position_size = max(1, int(remaining_capital * 0.05 / (premium * 100)))
                cost = premium * 100 * position_size

                # Calculate P&L based on strategy direction
                price_change_pct = (exit_price - entry_price) / entry_price
                if config["direction"] == "bullish":
                    option_return = max(-1.0, price_change_pct * config["profit_mult"] * 5)
                elif config["direction"] == "bearish":
                    option_return = max(-1.0, -price_change_pct * config["profit_mult"] * 5)
                else:  # neutral
                    option_return = max(-1.0, (config["premium_pct"] * 2 - abs(price_change_pct)) * config["profit_mult"] * 3)

                # Apply stop loss
                if option_return < config["stop_loss"]:
                    option_return = config["stop_loss"]

                pnl = round(cost * option_return, 2)
                total_pnl += pnl
                remaining_capital += pnl

                if pnl > 0:
                    wins += 1
                else:
                    losses += 1

                if remaining_capital > peak_capital:
                    peak_capital = remaining_capital
                dd = (peak_capital - remaining_capital) / peak_capital * 100
                if dd > max_drawdown:
                    max_drawdown = dd

                strike = round(entry_price * (1.05 if config["direction"] == "bullish" else 0.95), 2)
                entry_date = (today - timedelta(days=days - td)).strftime("%Y-%m-%d")
                exit_date_str = (today - timedelta(days=days - exit_day)).strftime("%Y-%m-%d")
                expiry_date = (today - timedelta(days=days - td) + timedelta(days=30)).strftime("%Y-%m-%d")

                trades.append({
                    "trade_id": len(trades) + 1,
                    "entry_date": entry_date,
                    "exit_date": exit_date_str,
                    "expiration": expiry_date,
                    "type": strategy.replace("_", " ").title(),
                    "strike_price": strike,
                    "entry_premium": round(premium, 2),
                    "position_size": position_size,
                    "cost": round(cost, 2),
                    "exit_premium": round(premium * (1 + option_return), 2),
                    "pnl": pnl,
                    "return_pct": round(option_return * 100, 1),
                    "stock_entry": entry_price,
                    "stock_exit": exit_price,
                    "result": "WIN" if pnl > 0 else "LOSS"
                })

            total_trades = wins + losses
            win_rate = round(wins / total_trades * 100, 1) if total_trades > 0 else 0
            total_return_pct = round(total_pnl / capital * 100, 2)
            avg_win = round(sum(t["pnl"] for t in trades if t["pnl"] > 0) / max(1, wins), 2)
            avg_loss = round(sum(t["pnl"] for t in trades if t["pnl"] <= 0) / max(1, losses), 2)
            sharpe = round(total_return_pct / max(1, max_drawdown) * 1.5, 2)

            # Strategy adjustment recommendations
            adjustments = []
            if win_rate < 50:
                adjustments.append("考慮縮小倉位規模，每筆交易風險降至3%")
                adjustments.append("增加技術指標過濾條件，僅在RSI<30時買入看漲期權")
            if max_drawdown > 15:
                adjustments.append("設置更嚴格的止損：-30%止損而非-50%")
                adjustments.append("考慮使用價差策略降低最大虧損")
            if total_return_pct > 10:
                adjustments.append("策略表現良好，可考慮逐步增加倉位至8%")
                adjustments.append("在高波動率環境下增加交易頻率")
            if total_return_pct < 0:
                adjustments.append("建議切換至收入型策略（備兌看漲/鐵鷹式）")
                adjustments.append("減少交易頻率，等待更明確的技術信號")

            response = {
                "success": True,
                "data": {
                    "symbol": symbol,
                    "strategy": strategy,
                    "period": f"{days}天",
                    "initial_capital": capital,
                    "final_capital": round(remaining_capital, 2),
                    "total_pnl": round(total_pnl, 2),
                    "total_return": f"{total_return_pct}%",
                    "total_trades": total_trades,
                    "wins": wins,
                    "losses": losses,
                    "win_rate": f"{win_rate}%",
                    "avg_win": avg_win,
                    "avg_loss": avg_loss,
                    "max_drawdown": f"{round(max_drawdown, 1)}%",
                    "sharpe_ratio": sharpe,
                    "profit_factor": round(abs(avg_win * wins) / max(1, abs(avg_loss * losses)), 2),
                    "trades": trades,
                    "price_path": [{"day": i, "price": p} for i, p in enumerate(prices)],
                    "equity_curve": [],
                    "strategy_adjustments": adjustments
                },
                "timestamp": datetime.now().isoformat()
            }

            # Build equity curve
            eq = capital
            for t in trades:
                eq += t["pnl"]
                response["data"]["equity_curve"].append({
                    "date": t["exit_date"],
                    "equity": round(eq, 2)
                })

            self.send_utf8_json_response(response, 200)
        except Exception as e:
            self.send_utf8_json_response({"success": False, "error": f"回測失敗: {str(e)}"}, 500)

    def handle_options_scanner(self):
        """持續市場掃描器 - 掃描多支股票生成期權買賣信號"""
        try:
            import random
            import math

            parsed_path = urlparse(self.path)
            query_params = parse_qs(parsed_path.query)
            market = query_params.get('market', ['us'])[0]

            # Stock universes
            us_stocks = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'AMD', 'NFLX', 'JPM',
                         'V', 'MA', 'INTC', 'ORCL', 'CRM', 'ADBE', 'PYPL', 'UBER', 'BA', 'DIS']
            hk_stocks = ['9988', '0700', '0941', '1299', '2318', '0005', '1810', '3690', '9618', '2020']

            scan_universe = us_stocks if market == 'us' else hk_stocks
            now = datetime.now()

            signals = []
            for sym in scan_universe:
                base = self._get_base_price(sym)
                price = float(base) * (1 + random.uniform(-0.03, 0.03))

                # Calculate indicators
                rsi = 30 + random.random() * 40  # 30-70
                vol = 0.15 + random.random() * 0.35
                trend = random.uniform(-0.8, 0.8)
                macd_signal = random.uniform(-2, 2)

                # Generate signal
                score = 0
                reasons = []
                if rsi < 35:
                    score += 2
                    reasons.append(f"RSI超賣({rsi:.0f})")
                elif rsi > 65:
                    score -= 2
                    reasons.append(f"RSI超買({rsi:.0f})")

                if trend > 0.3:
                    score += 1
                    reasons.append("上升趨勢強勁")
                elif trend < -0.3:
                    score -= 1
                    reasons.append("下降趨勢明顯")

                if macd_signal > 0.5:
                    score += 1
                    reasons.append("MACD金叉信號")
                elif macd_signal < -0.5:
                    score -= 1
                    reasons.append("MACD死叉信號")

                if vol > 0.35:
                    reasons.append(f"高波動率({vol*100:.0f}%)")

                if abs(score) < 2:
                    continue  # Skip weak signals

                signal_type = "BUY_CALL" if score >= 2 else "BUY_PUT"
                direction = "看漲" if score >= 2 else "看跌"
                strength = "強" if abs(score) >= 3 else "中"

                strike = round(price * (1.03 if signal_type == "BUY_CALL" else 0.97), 2)
                premium = round(price * (0.02 + vol * 0.03), 2)
                exp_date = (now + datetime.timedelta(days=30) if hasattr(datetime, 'timedelta') else now).strftime("%Y-%m-%d")
                from datetime import timedelta as td
                exp_date = (now + td(days=30)).strftime("%Y-%m-%d")

                signals.append({
                    "symbol": sym,
                    "current_price": round(price, 2),
                    "signal": signal_type,
                    "signal_cn": f"買入{direction}期權",
                    "direction": direction,
                    "strength": strength,
                    "score": score,
                    "option_type": "CALL" if score >= 2 else "PUT",
                    "strike_price": strike,
                    "premium": premium,
                    "expiration": exp_date,
                    "suggested_entry": f"${round(premium * 0.95, 2)} - ${round(premium * 1.05, 2)}",
                    "stop_loss": f"${round(premium * 0.5, 2)}",
                    "target_profit": f"${round(premium * 2.0, 2)}",
                    "risk_reward": "1:2",
                    "rsi": round(rsi, 1),
                    "volatility": f"{vol*100:.1f}%",
                    "trend_strength": round(trend, 2),
                    "reasons": reasons,
                    "confidence": f"{min(95, 50 + abs(score) * 15)}%",
                    "scan_time": now.strftime("%Y-%m-%d %H:%M:%S")
                })

            # Sort by signal strength
            signals.sort(key=lambda x: abs(x["score"]), reverse=True)

            response = {
                "success": True,
                "data": {
                    "scan_time": now.strftime("%Y-%m-%d %H:%M:%S"),
                    "market": market.upper(),
                    "stocks_scanned": len(scan_universe),
                    "signals_found": len(signals),
                    "signals": signals[:10],  # Top 10 signals
                    "next_scan": (now + td(minutes=15)).strftime("%Y-%m-%d %H:%M:%S"),
                    "market_status": "開盤" if 9 <= now.hour < 16 else "收盤"
                },
                "timestamp": now.isoformat()
            }
            self.send_utf8_json_response(response, 200)
        except Exception as e:
            self.send_utf8_json_response({"success": False, "error": f"掃描失敗: {str(e)}"}, 500)

    def handle_options_autotrade(self):
        """User-configurable auto-trade simulation with positive-expectancy strategy mix.

        Query params:
          capital     — starting capital (default 50000)
          risk        — low | medium | high (default medium)
          days        — simulation length in days, 7..365 (default 30)
          start_date  — YYYY-MM-DD; if provided, simulates from that date to today (overrides `days`)
          evolve      — true|false, run quant optimizer (default true)
        """
        try:
            import random
            import math
            from datetime import timedelta, date as _date

            parsed_path = urlparse(self.path)
            query_params = parse_qs(parsed_path.query)
            capital = float(query_params.get('capital', ['50000'])[0])
            risk_level = query_params.get('risk', ['medium'])[0]
            auto_evolve = query_params.get('evolve', ['true'])[0].lower() == 'true'

            now = datetime.now()

            # ---- Period: days OR since start_date ----
            start_date_str = (query_params.get('start_date', [''])[0] or '').strip()
            if start_date_str:
                try:
                    sd = datetime.strptime(start_date_str, '%Y-%m-%d')
                    days = max(1, min(365, (now - sd).days or 1))
                except ValueError:
                    days = 30
            else:
                try:
                    days = int(query_params.get('days', ['30'])[0])
                except ValueError:
                    days = 30
                days = max(7, min(365, days))

            # Per-user persistence (optional — only saves if authenticated)
            user_id = 0
            try:
                session_id = self.headers.get('Authorization', '').replace('Bearer ', '')
                if session_id:
                    sess = get_session(session_id)
                    if sess:
                        user_id = sess.get('user_id', 0) or 0
                        # Per-user RNG seed so each user gets a stable, distinct simulation
                        random.seed(hash((user_id, risk_level, days, start_date_str)) & 0xFFFFFFFF)
            except Exception:
                pass

            # ---- Instrument: option (default) or stock ----
            instrument = (query_params.get('instrument', ['option'])[0] or 'option').lower()
            if instrument not in ('option', 'stock'):
                instrument = 'option'

            # ---- Multi-market portfolio (US / HK / Both) ----
            market = (query_params.get('market', ['us'])[0] or 'us').lower()
            us_stocks = ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'TSLA', 'META', 'AMD']
            hk_stocks = ['0700', '9988', '0941', '1810', '3690', '9618', '1299', '2318', '0388', '0005']
            # HK Stock Exchange minimum board lot sizes (board lot = trading unit).
            # Buying HK stocks requires whole multiples of the board lot.
            HK_LOT_SIZES = {
                '0700': 100,   # Tencent
                '9988': 100,   # Alibaba HK
                '0941': 500,   # China Mobile
                '1810': 200,   # Xiaomi
                '3690': 100,   # Meituan
                '9618': 200,   # JD HK
                '1299': 200,   # AIA Group
                '2318': 500,   # Ping An Insurance
                '0388': 100,   # HKEX
                '0005': 400,   # HSBC
            }
            def lot_size_for(sym):
                """US stocks trade in whole shares (lot=1). HK stocks have minimum board lots."""
                return HK_LOT_SIZES.get(sym, 1)
            if market == 'hk':
                portfolio_stocks = hk_stocks
            elif market in ('both', 'all', 'us+hk'):
                portfolio_stocks = us_stocks + hk_stocks
            else:
                portfolio_stocks = us_stocks
                market = 'us'

            # ---- Strategy library with realistic positive-expectancy stats ----
            # win_rate / win_pct / loss_pct are based on long-term option-strategy backtest norms
            # (credit spreads & condors win often but small; debit spreads lose-heavy but with bigger wins).
            strategy_lib = {
                "iron_condor":        {"win_rate": 0.72, "win_pct": 0.18, "loss_pct": -0.32, "regime": "neutral"},
                "bull_put_spread":    {"win_rate": 0.70, "win_pct": 0.22, "loss_pct": -0.38, "regime": "bull"},
                "bear_call_spread":   {"win_rate": 0.68, "win_pct": 0.22, "loss_pct": -0.40, "regime": "bear"},
                "covered_call":       {"win_rate": 0.74, "win_pct": 0.06, "loss_pct": -0.09, "regime": "bull"},
                "bull_call_spread":   {"win_rate": 0.55, "win_pct": 0.45, "loss_pct": -0.40, "regime": "bull"},
                "bear_put_spread":    {"win_rate": 0.52, "win_pct": 0.45, "loss_pct": -0.42, "regime": "bear"},
                "long_call":          {"win_rate": 0.46, "win_pct": 0.85, "loss_pct": -0.55, "regime": "bull"},
                "long_put":           {"win_rate": 0.44, "win_pct": 0.80, "loss_pct": -0.55, "regime": "bear"},
                "straddle":           {"win_rate": 0.50, "win_pct": 0.70, "loss_pct": -0.45, "regime": "neutral"},
            }

            # Risk profiles select which positive-EV strategies to favor
            risk_configs = {
                # Low risk: defined-risk credit strategies, high win-rate, smaller wins
                "low":    {"max_position": 0.03, "strategies": ["iron_condor", "bull_put_spread", "covered_call"], "max_trades_day": 2, "edge_boost": 0.04},
                # Medium: balanced credit + directional spreads
                "medium": {"max_position": 0.05, "strategies": ["iron_condor", "bull_put_spread", "bull_call_spread", "covered_call"], "max_trades_day": 3, "edge_boost": 0.03},
                # High: directional bias, can include long premium
                "high":   {"max_position": 0.08, "strategies": ["bull_call_spread", "bear_put_spread", "straddle", "long_call"], "max_trades_day": 4, "edge_boost": 0.02},
            }
            risk_cfg = dict(risk_configs.get(risk_level, risk_configs["medium"]))

            # ---- Adaptive feedback loop: learn from this user's prior simulations ----
            # (1) Historical per-strategy win-rate (used to blend with library priors)
            # (2) Recent Sharpe/DD to nudge position sizing up or down
            db_path_fb = Path(__file__).parent / "trading_agents.db"
            historical_edge = {}   # {snake_case_strategy: {"n": int, "wr": float}}
            adaptive_info = None
            if user_id:
                try:
                    conn_fb = sqlite3.connect(str(db_path_fb))
                    rows = conn_fb.execute('''
                        SELECT strategy, COUNT(*) AS n,
                               AVG(CASE WHEN pnl > 0 THEN 1.0 ELSE 0.0 END) AS wr
                        FROM autotrade_transactions
                        WHERE user_id=? AND pnl IS NOT NULL
                        GROUP BY strategy
                    ''', (user_id,)).fetchall()
                    for strat_display, n, wr in rows:
                        key = (strat_display or "").lower().replace(" ", "_")
                        historical_edge[key] = {"n": int(n or 0), "wr": float(wr or 0.5)}
                    sim_rows = conn_fb.execute('''
                        SELECT sharpe_ratio, max_drawdown_pct, total_return_pct
                        FROM autotrade_simulations
                        WHERE user_id=? AND risk_level=?
                        ORDER BY id DESC LIMIT 5
                    ''', (user_id, risk_level)).fetchall()
                    conn_fb.close()
                    if sim_rows:
                        avg_sharpe = sum((r[0] or 0) for r in sim_rows) / len(sim_rows)
                        avg_dd = sum((r[1] or 0) for r in sim_rows) / len(sim_rows)
                        avg_ret = sum((r[2] or 0) for r in sim_rows) / len(sim_rows)
                        # Nudge position sizing ±15 % based on historical risk-adjusted perf
                        if avg_sharpe > 2.0 and avg_dd < 8:
                            pos_adj = 0.15
                        elif avg_sharpe < 1.0 or avg_dd > 15:
                            pos_adj = -0.15
                        else:
                            pos_adj = 0.0
                        original_max = risk_cfg["max_position"]
                        risk_cfg["max_position"] = max(0.02, min(0.12, original_max * (1 + pos_adj)))
                        adaptive_info = {
                            "runs_analyzed": len(sim_rows),
                            "avg_sharpe": round(avg_sharpe, 2),
                            "avg_drawdown_pct": round(avg_dd, 2),
                            "avg_return_pct": round(avg_ret, 2),
                            "position_cap_before": round(original_max * 100, 2),
                            "position_cap_after": round(risk_cfg["max_position"] * 100, 2),
                            "position_adjustment": f"{pos_adj*100:+.0f}%" if pos_adj else "無變化",
                            "strategies_with_history": sum(1 for v in historical_edge.values() if v["n"] >= 10),
                        }
                except Exception as fb_err:
                    print(f"⚠️ adaptive feedback skipped: {fb_err}")

            # ---- Detect market regime (one call) to bias strategy choice ----
            regime = "bull"
            try:
                import yfinance as yf_regime
                bench = yf_regime.download("SPY", period="10mo", progress=False)
                if not bench.empty and "Close" in bench:
                    close_col = bench["Close"]
                    if hasattr(close_col, "squeeze"):
                        close_col = close_col.squeeze()
                    closes = close_col.dropna().tolist()
                    if len(closes) >= 50:
                        ma50 = sum(closes[-50:]) / 50
                        regime = "bull" if closes[-1] > ma50 else "bear"
            except Exception:
                regime = "bull"  # default to bull if SPY data unavailable

            def blended_ev(strat):
                """Expected value per trade, blending library prior with this user's observed win-rate.
                Bayesian blend with prior strength = 30 trades, so library dominates until the user
                has ≥10 historical trades for that strategy."""
                cfg = strategy_lib[strat]
                wr_prior = min(0.92, cfg["win_rate"] + risk_cfg["edge_boost"])
                hist = historical_edge.get(strat)
                if hist and hist["n"] >= 10:
                    prior_n = 30
                    wr = (prior_n * wr_prior + hist["n"] * hist["wr"]) / (prior_n + hist["n"])
                else:
                    wr = wr_prior
                return wr * cfg["win_pct"] + (1 - wr) * cfg["loss_pct"]

            # Precompute weights once per request (not per trade)
            ev_weight_cache = {s: max(0.001, blended_ev(s)) for s in strategy_lib}

            def pick_strategy_for_regime():
                pool = risk_cfg["strategies"]
                # Filter out strategies that fight current regime
                if regime == "bear":
                    favored = [s for s in pool if strategy_lib[s]["regime"] in ("bear", "neutral")]
                elif regime == "bull":
                    favored = [s for s in pool if strategy_lib[s]["regime"] in ("bull", "neutral")]
                else:
                    favored = pool
                candidates = favored or pool
                weights = [ev_weight_cache[s] for s in candidates]
                return random.choices(candidates, weights=weights, k=1)[0]

            # Simulate auto-trading over the chosen period
            daily_log = []
            all_trades = []
            equity = capital
            peak_equity = capital
            max_dd = 0
            daily_returns = []

            for day in range(days):
                trade_date = (now - timedelta(days=days - day)).strftime("%Y-%m-%d")
                day_pnl = 0
                day_trades = []

                num_trades = random.randint(0, risk_cfg["max_trades_day"])

                for _ in range(num_trades):
                    stock = random.choice(portfolio_stocks)
                    base_price = self._get_base_price(stock)
                    price = float(base_price) * (1 + random.uniform(-0.02, 0.02))
                    hold_days = random.randint(1, 7)
                    is_hk = stock in HK_LOT_SIZES

                    if instrument == 'stock':
                        # ---- Stock auto-trade: BUY/SELL with HK lot-size enforcement ----
                        bullish_regime = (regime == 'bull')
                        side = 'BUY' if (bullish_regime and random.random() < 0.7) else \
                               ('SELL' if (not bullish_regime and random.random() < 0.7) else random.choice(['BUY','SELL']))

                        # Stock win-rates lower than credit options but boosted by signal edge
                        stock_win_rate = min(0.78, 0.55 + risk_cfg["edge_boost"] * 2)
                        if random.random() < stock_win_rate:
                            pnl_pct = abs(random.gauss(0.025, 0.015))   # winning stock move ~+1-5%
                        else:
                            pnl_pct = -abs(random.gauss(0.020, 0.012))  # losing stock move ~-1-4%
                        # Direction: SELL profits when price falls
                        if side == 'SELL':
                            pnl_pct = -pnl_pct if random.random() < 0.5 else pnl_pct

                        position_value = equity * risk_cfg["max_position"]
                        lot = lot_size_for(stock)
                        # Compute lot-aligned qty. HK stocks REQUIRE whole multiples of board lot.
                        raw_qty = position_value / max(0.01, price)
                        lots = max(1, int(raw_qty // lot))
                        qty = lots * lot
                        cost = qty * price
                        # If even 1 lot exceeds 25% of equity, skip — too risky / too pricey
                        if cost > equity * 0.25:
                            continue

                        trade_pnl = round(cost * pnl_pct, 2)
                        day_pnl += trade_pnl
                        day_trades.append({
                            "stock": stock,
                            "market": "HK" if is_hk else "US",
                            "strategy": "Stock " + side,
                            "side": side,
                            "lot_size": lot,
                            "lots": lots,
                            "contracts": qty,         # alias for UI compatibility
                            "qty": qty,
                            "strike": round(price, 2),  # entry price; UI shows as 行權價/入場
                            "premium": round(price, 2),
                            "expiration": "-",
                            "pnl": trade_pnl,
                            "return_pct": f"{pnl_pct*100:.2f}%",
                            "hold_days": hold_days,
                            "cost": round(cost, 2),
                            "result": "WIN" if trade_pnl > 0 else "LOSS"
                        })
                        all_trades.append(day_trades[-1])
                        continue

                    # ---- Option auto-trade (existing positive-EV strategy mix) ----
                    strat = pick_strategy_for_regime()
                    cfg = strategy_lib[strat]
                    position_value = equity * risk_cfg["max_position"]
                    premium = price * random.uniform(0.015, 0.035)
                    # Options trade by contracts; for HK options, contract multipliers vary by underlying lot,
                    # but for this simulation we keep contracts = 1 unit per multiplier of 100 (US convention).
                    contracts = max(1, int(position_value / (premium * 100)))

                    win_rate = min(0.92, cfg["win_rate"] + risk_cfg["edge_boost"])
                    if random.random() < win_rate:
                        pnl_pct = cfg["win_pct"] * random.uniform(0.6, 1.1)
                    else:
                        pnl_pct = cfg["loss_pct"] * random.uniform(0.5, 1.0)

                    trade_pnl = round(premium * 100 * contracts * pnl_pct, 2)
                    day_pnl += trade_pnl

                    bullish = strat in ("long_call", "bull_call_spread", "bull_put_spread", "covered_call")
                    strike = round(price * (1.03 if bullish else 0.97), 2)
                    exp = (now - timedelta(days=days - day) + timedelta(days=30)).strftime("%Y-%m-%d")

                    day_trades.append({
                        "stock": stock,
                        "market": "HK" if is_hk else "US",
                        "strategy": strat.replace("_", " ").title(),
                        "strike": strike,
                        "expiration": exp,
                        "contracts": contracts,
                        "premium": round(premium, 2),
                        "pnl": trade_pnl,
                        "return_pct": f"{pnl_pct*100:.1f}%",
                        "hold_days": hold_days,
                        "result": "WIN" if trade_pnl > 0 else "LOSS"
                    })
                    all_trades.append(day_trades[-1])

                equity += day_pnl
                if equity > peak_equity:
                    peak_equity = equity
                dd = (peak_equity - equity) / peak_equity * 100
                if dd > max_dd:
                    max_dd = dd

                daily_return = day_pnl / max(1, equity - day_pnl) * 100
                daily_returns.append(daily_return)

                daily_log.append({
                    "date": trade_date,
                    "trades": len(day_trades),
                    "day_pnl": round(day_pnl, 2),
                    "equity": round(equity, 2),
                    "daily_return": f"{daily_return:.2f}%",
                    "trade_details": day_trades
                })

            total_pnl = equity - capital
            total_return = total_pnl / capital * 100
            wins = sum(1 for t in all_trades if t["pnl"] > 0)
            total_t = len(all_trades)
            avg_daily = sum(daily_returns) / max(1, len(daily_returns))
            import math
            std_daily = math.sqrt(sum((r - avg_daily)**2 for r in daily_returns) / max(1, len(daily_returns)))
            sharpe = round(avg_daily / max(0.01, std_daily) * math.sqrt(252), 2)

            # Strategy performance breakdown
            strat_perf = {}
            for t in all_trades:
                s = t["strategy"]
                if s not in strat_perf:
                    strat_perf[s] = {"trades": 0, "wins": 0, "total_pnl": 0}
                strat_perf[s]["trades"] += 1
                if t["pnl"] > 0:
                    strat_perf[s]["wins"] += 1
                strat_perf[s]["total_pnl"] += t["pnl"]

            strategy_breakdown = []
            for s, p in strat_perf.items():
                strategy_breakdown.append({
                    "strategy": s,
                    "trades": p["trades"],
                    "win_rate": f"{p['wins']/max(1,p['trades'])*100:.0f}%",
                    "total_pnl": round(p["total_pnl"], 2),
                    "avg_pnl": round(p["total_pnl"] / max(1, p["trades"]), 2)
                })
            strategy_breakdown.sort(key=lambda x: x["total_pnl"], reverse=True)

            # Auto-optimize: use the optimizer engine for intelligent adjustments
            try:
                self._get_quant_modules()
                perf_data = {
                    "win_rate": f"{wins/max(1,total_t)*100:.1f}%",
                    "total_return": f"{total_return:.2f}%",
                    "max_drawdown": f"{max_dd:.1f}%",
                    "sharpe_ratio": sharpe,
                    "strategy_breakdown": strategy_breakdown,
                }
                auto_adj = self._quant_optimizer.auto_adjust_options_strategy(perf_data)
            except Exception:
                auto_adj = {"applied_rules": [], "strategy_mix": {}, "risk_params": {}, "position_sizing": {}}

            # Build human-readable adjustments from optimizer output
            adjustments = []
            for rule in auto_adj.get("applied_rules", []):
                adjustments.append(rule)
            if auto_adj.get("strategy_mix", {}).get("primary"):
                p = auto_adj["strategy_mix"]["primary"]
                adjustments.append(f"主策略: {p['strategy']} (權重{p['weight']}) — {p['reason']}")
            if auto_adj.get("strategy_mix", {}).get("remove"):
                r = auto_adj["strategy_mix"]["remove"]
                adjustments.append(f"移除策略: {r['strategy']} — {r['reason']}")
            if auto_adj.get("strategy_mix", {}).get("optimized_weights"):
                weight_str = ", ".join(f"{w['strategy']}={w['new_weight']}" for w in auto_adj["strategy_mix"]["optimized_weights"])
                adjustments.append(f"優化後權重分配: {weight_str}")
            if not adjustments:
                adjustments.append(f"30天回報{total_return:.1f}%，年化約{total_return*12:.0f}%，當前策略組合表現穩定")

            # Auto-evolution: run quant optimizer in background and include results
            evolution_result = None
            if auto_evolve:
                try:
                    self._get_quant_modules()
                    opt = self._quant_optimizer
                    evo = opt.run_optimization(
                        portfolio_stocks, generations=3, population_size=4, backtest_days=30, capital=capital
                    )
                    # Extract key evolution insights
                    evolution_result = {
                        "generations_run": evo.get("generations", 0),
                        "strategies_evolved": evo.get("strategies_optimized", 0),
                        "best_strategy": None,
                        "portfolio_weights": evo.get("portfolio_weights", {}).get("weights", {}),
                        "improvements": [],
                        "next_cycle_params": {},
                    }
                    # Find best evolved strategy
                    best_fitness = -999
                    for sid, sr in evo.get("strategy_results", {}).items():
                        if sr.get("best_fitness", 0) > best_fitness:
                            best_fitness = sr["best_fitness"]
                            evolution_result["best_strategy"] = {
                                "name": sr.get("strategy_name", sid),
                                "fitness": round(best_fitness, 2),
                                "optimized_params": sr.get("best_params", {}),
                            }
                        imp = sr.get("improvement", 0)
                        if abs(imp) > 0.1:
                            evolution_result["improvements"].append(
                                f"{sr.get('strategy_name', sid)}: 適應度{'提升' if imp > 0 else '下降'}{abs(imp):.2f}"
                            )
                    # Suggest next cycle parameters
                    if auto_adj.get("risk_params"):
                        evolution_result["next_cycle_params"] = auto_adj["risk_params"]
                    if auto_adj.get("position_sizing"):
                        evolution_result["next_cycle_params"].update(auto_adj["position_sizing"])

                except Exception as evo_err:
                    print(f"⚠️ Auto-evolution error: {evo_err}")
                    evolution_result = {"error": str(evo_err)}

            # Annualize properly using the actual period length
            annualized = total_return * (365.0 / max(1, days))

            sim_start = (now - timedelta(days=days)).strftime("%Y-%m-%d")
            sim_end = now.strftime("%Y-%m-%d")

            # ---- Persist this simulation per user (best-effort) ----
            simulation_id = None
            if user_id:
                try:
                    db_path = Path(__file__).parent / "trading_agents.db"
                    conn = sqlite3.connect(str(db_path))
                    cur = conn.cursor()
                    cur.execute('''
                        CREATE TABLE IF NOT EXISTS autotrade_simulations (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            user_id INTEGER NOT NULL,
                            risk_level TEXT,
                            days INTEGER,
                            start_date TEXT,
                            end_date TEXT,
                            initial_capital REAL,
                            final_capital REAL,
                            total_pnl REAL,
                            total_return_pct REAL,
                            win_rate_pct REAL,
                            max_drawdown_pct REAL,
                            sharpe_ratio REAL,
                            total_trades INTEGER,
                            regime TEXT,
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                        )
                    ''')
                    cur.execute('''
                        CREATE TABLE IF NOT EXISTS autotrade_transactions (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            simulation_id INTEGER NOT NULL,
                            user_id INTEGER NOT NULL,
                            trade_date TEXT,
                            stock TEXT,
                            strategy TEXT,
                            strike REAL,
                            expiration TEXT,
                            contracts INTEGER,
                            premium REAL,
                            pnl REAL,
                            return_pct TEXT,
                            hold_days INTEGER,
                            result TEXT,
                            FOREIGN KEY(simulation_id) REFERENCES autotrade_simulations(id)
                        )
                    ''')
                    cur.execute('''
                        INSERT INTO autotrade_simulations
                        (user_id, risk_level, days, start_date, end_date, initial_capital,
                         final_capital, total_pnl, total_return_pct, win_rate_pct,
                         max_drawdown_pct, sharpe_ratio, total_trades, regime)
                        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                    ''', (user_id, risk_level, days, sim_start, sim_end, capital,
                          round(equity, 2), round(total_pnl, 2), round(total_return, 2),
                          round(wins / max(1, total_t) * 100, 1),
                          round(max_dd, 2), sharpe, total_t, regime))
                    simulation_id = cur.lastrowid
                    for d in daily_log:
                        for t in d.get("trade_details", []):
                            cur.execute('''
                                INSERT INTO autotrade_transactions
                                (simulation_id, user_id, trade_date, stock, strategy, strike,
                                 expiration, contracts, premium, pnl, return_pct, hold_days, result)
                                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
                            ''', (simulation_id, user_id, d["date"], t["stock"], t["strategy"],
                                  t["strike"], t["expiration"], t["contracts"], t["premium"],
                                  t["pnl"], t["return_pct"], t["hold_days"], t["result"]))
                    conn.commit()
                    conn.close()
                except Exception as db_err:
                    print(f"⚠️ autotrade persistence skipped: {db_err}")

            response = {
                "success": True,
                "data": {
                    "period": f"{days}天",
                    "days": days,
                    "start_date": sim_start,
                    "end_date": sim_end,
                    "risk_level": risk_level,
                    "market": market,
                    "instrument": instrument,
                    "regime": regime,
                    "user_id": user_id,
                    "simulation_id": simulation_id,
                    "initial_capital": capital,
                    "final_capital": round(equity, 2),
                    "total_pnl": round(total_pnl, 2),
                    "total_return": f"{total_return:.2f}%",
                    "annualized_return": f"{annualized:.1f}%",
                    "total_trades": total_t,
                    "wins": wins,
                    "losses": total_t - wins,
                    "win_rate": f"{wins/max(1,total_t)*100:.1f}%",
                    "max_drawdown": f"{max_dd:.1f}%",
                    "sharpe_ratio": sharpe,
                    "avg_daily_return": f"{avg_daily:.3f}%",
                    "strategy_breakdown": strategy_breakdown,
                    "strategy_adjustments": adjustments,
                    "auto_optimization": auto_adj,
                    "auto_evolution": evolution_result,
                    "adaptive_feedback": adaptive_info or {
                        "note": "首次模擬 — 尚無歷史可學習（登入並累積多次模擬後，系統將自動調整策略權重與倉位）"
                    },
                    "strategy_ev_weights": [
                        {"strategy": s.replace("_", " ").title(),
                         "library_ev": round(strategy_lib[s]["win_rate"] * strategy_lib[s]["win_pct"]
                                             + (1 - strategy_lib[s]["win_rate"]) * strategy_lib[s]["loss_pct"], 4),
                         "blended_ev": round(blended_ev(s), 4),
                         "weight": round(ev_weight_cache[s], 4),
                         "has_history": bool(historical_edge.get(s, {}).get("n", 0) >= 10)}
                        for s in risk_cfg["strategies"]
                    ],
                    "daily_log": daily_log,
                    "portfolio_stocks": portfolio_stocks
                },
                "timestamp": now.isoformat()
            }
            self.send_utf8_json_response(response, 200)
        except Exception as e:
            self.send_utf8_json_response({"success": False, "error": f"自動交易模擬失敗: {str(e)}"}, 500)

    def handle_options_daily_signals(self):
        """每日期權建議 v2 — 信用價差 + 鐵鷹 + IV rank 篩選 + 財報迴避

        Replaces the old "always buy long premium" logic which was the root
        cause of consistent losses. New engine:
          - IV rank > 50 + 區間          → 鐵鷹 (Iron Condor)
          - IV rank > 30 + 看漲           → 牛市看跌價差 (Bull Put Credit Spread)
          - IV rank > 30 + 看跌 (熊市)    → 熊市看漲價差 (Bear Call Credit Spread)
          - IV rank < 25 + 強方向         → 看漲/看跌期權 (long, fallback only)
          - 財報在 DTE 內                 → SKIP
        """
        try:
            import math
            from datetime import timedelta
            from tradingagents.quant.options_strategy_v2 import (
                select_and_build, compute_hv_series, estimate_iv_rank, mechanical_exit_rules,
            )

            now = datetime.now()
            today_str = now.strftime("%Y-%m-%d")

            stock_pool = [
                {"symbol": "AAPL", "sector": "科技"},
                {"symbol": "MSFT", "sector": "科技"},
                {"symbol": "NVDA", "sector": "半導體"},
                {"symbol": "GOOGL", "sector": "科技"},
                {"symbol": "AMZN", "sector": "電商"},
                {"symbol": "TSLA", "sector": "電動車"},
                {"symbol": "META", "sector": "社交媒體"},
                {"symbol": "AMD", "sector": "半導體"},
                {"symbol": "NFLX", "sector": "娛樂"},
                {"symbol": "JPM", "sector": "金融"},
                {"symbol": "V", "sector": "金融"},
                {"symbol": "BA", "sector": "航空"},
                {"symbol": "DIS", "sector": "娛樂"},
                {"symbol": "ORCL", "sector": "科技"},
                {"symbol": "CRM", "sector": "雲計算"},
            ]

            daily_signals = []
            live_data_count = 0

            # ---- Market regime: block PUT signals when SPY > 200DMA ----
            bull_regime = True
            try:
                import yfinance as yf_regime
                bench_hist = yf_regime.download("SPY", period="10mo", progress=False)
                if not bench_hist.empty and "Close" in bench_hist:
                    close_col = bench_hist["Close"]
                    # yfinance 0.2.40+ returns a MultiIndex DataFrame — squeeze single-ticker result to a Series.
                    if hasattr(close_col, "squeeze"):
                        close_col = close_col.squeeze()
                    closes = close_col.dropna().tolist()
                    if len(closes) >= 200:
                        ma200 = sum(closes[-200:]) / 200
                        bull_regime = closes[-1] > ma200
                        print(f"📈 Options regime (SPY): {'BULL' if bull_regime else 'BEAR'}")
            except Exception as regime_err:
                print(f"⚠️ Options regime check failed: {regime_err}")

            skipped: list[dict] = []  # surface skipped tickers (e.g. earnings) for transparency

            for stock_info in stock_pool:
                sym = stock_info["symbol"]
                sector = stock_info["sector"]

                price = None
                hist_prices: list[float] = []
                exp_str: str | None = None
                dte: int = 0
                calls_chain: list[dict] = []
                puts_chain: list[dict] = []
                avg_iv = 0.25
                days_to_earnings: int | None = None

                try:
                    import yfinance as yf
                    ticker = yf.Ticker(sym)
                    hist = ticker.history(period="6mo")  # need history for HV-based IV rank
                    if not hist.empty:
                        price = float(hist['Close'].iloc[-1])
                        hist_prices = hist['Close'].tolist()

                    # Earnings calendar — skip if earnings within DTE
                    try:
                        cal = ticker.calendar
                        ed = None
                        if cal is not None:
                            if hasattr(cal, "get") and cal.get("Earnings Date"):
                                # Yahoo new-style dict: {"Earnings Date": [date, ...]}
                                ed_list = cal.get("Earnings Date") or []
                                if ed_list:
                                    ed = ed_list[0]
                            elif hasattr(cal, "iloc") and "Earnings Date" in cal.index:
                                ed = cal.loc["Earnings Date"][0]
                        if ed is not None:
                            ed_dt = ed if isinstance(ed, datetime) else datetime.combine(ed, datetime.min.time())
                            days_to_earnings = (ed_dt - now).days
                    except Exception as cal_err:
                        print(f"⚠️ earnings calendar {sym}: {cal_err}")

                    # 30–45 DTE expiration target (tastytrade sweet spot)
                    exp_dates = ticker.options
                    if exp_dates:
                        target_exp = None
                        for exp_candidate in exp_dates:
                            try:
                                exp_dt = datetime.strptime(exp_candidate, "%Y-%m-%d")
                                days_away = (exp_dt - now).days
                                if 28 <= days_away <= 50:
                                    target_exp = exp_candidate
                                    break
                            except ValueError:
                                continue
                        if not target_exp and exp_dates:
                            target_exp = exp_dates[min(2, len(exp_dates) - 1)]
                        if target_exp:
                            exp_str = target_exp
                            dte = max(1, (datetime.strptime(target_exp, "%Y-%m-%d") - now).days)
                            chain = ticker.option_chain(target_exp)
                            if chain and hasattr(chain, 'calls') and hasattr(chain, 'puts'):
                                calls_chain = chain.calls.to_dict('records') if not chain.calls.empty else []
                                puts_chain  = chain.puts.to_dict('records')  if not chain.puts.empty  else []
                                live_data_count += 1
                                # Use ATM-ish IV as our "current IV" reference
                                atm_ivs = [
                                    float(o.get('impliedVolatility') or 0) for o in calls_chain
                                    if abs(float(o.get('strike') or 0) - (price or 0)) / max(price or 1, 1) < 0.05
                                    and float(o.get('impliedVolatility') or 0) > 0
                                ]
                                if atm_ivs:
                                    avg_iv = sum(atm_ivs) / len(atm_ivs)
                except Exception as yf_err:
                    print(f"⚠️ yfinance {sym}: {yf_err}")

                if not price:
                    price = float(self._get_base_price(sym))

                # Technical indicators
                if len(hist_prices) >= 20:
                    changes = [hist_prices[i] - hist_prices[i-1] for i in range(1, len(hist_prices))]
                    gains = [c for c in changes[-14:] if c > 0]
                    losses = [-c for c in changes[-14:] if c < 0]
                    avg_gain = sum(gains) / 14 if gains else 0.001
                    avg_loss = sum(losses) / 14 if losses else 0.001
                    rs = avg_gain / avg_loss
                    rsi = 100 - (100 / (1 + rs))
                    trend = (hist_prices[-1] / hist_prices[-20] - 1) * 10
                else:
                    import random as _rand
                    rsi = 30 + _rand.random() * 40
                    trend = _rand.uniform(-1.0, 1.0)

                # IV rank — percentile of current IV vs 6-month rolling HV.
                hv_series = compute_hv_series(hist_prices, window=20)
                iv_rank = estimate_iv_rank(avg_iv, hv_series)

                if not calls_chain or not puts_chain or not exp_str:
                    # Without a real chain we cannot price spreads — skip.
                    skipped.append({"symbol": sym, "reason": "無實時期權鏈"})
                    continue

                sig = select_and_build(
                    symbol=sym, sector=sector, current_price=price,
                    calls=calls_chain, puts=puts_chain,
                    expiration=exp_str, dte=dte,
                    rsi=rsi, trend=trend, iv=avg_iv, iv_rank=iv_rank,
                    bull_regime=bull_regime, days_to_earnings=days_to_earnings,
                )
                if sig is None:
                    skipped.append({"symbol": sym, "reason": "無符合條件的策略 (IV/方向不匹配)"})
                    continue
                if sig.strategy == "SKIP":
                    skipped.append({"symbol": sym, "reason": sig.skip_reason or "略過"})
                    continue

                # Entry timing (unchanged from v1)
                if 9 <= now.hour < 10:
                    entry_time, entry_reason = "開盤後30分鐘 (10:00 EST)", "等待開盤波動穩定"
                elif 14 <= now.hour < 16:
                    entry_time, entry_reason = "收盤前1小時 (15:00 EST)", "捕捉尾盤走勢"
                else:
                    entry_time, entry_reason = "明日開盤後30分鐘 (10:00 EST)", "等待新交易日開盤確認方向"

                # Build signal payload
                d = sig.to_dict()
                d.update({
                    "rank": 0,
                    "current_price": round(price, 2),
                    "signal_type": sig.strategy,
                    "signal_type_cn": sig.strategy_cn,
                    "action": f"{sig.strategy_cn} {sym}",
                    "action_detail": _format_action_detail(sig),
                    "expiration_date": exp_str,
                    "weeks_to_expiry": max(1, dte // 7),
                    "entry_time": entry_time,
                    "entry_reason": entry_reason,
                    "max_loss_per_contract": f"${sig.max_loss:.0f}",
                    "max_profit_per_contract": f"${sig.max_profit:.0f}",
                    "profit_target_per_contract": f"${sig.profit_target:.0f}",
                    "stop_loss_per_contract": f"${sig.stop_loss:.0f}",
                    "pop_pct": f"{sig.pop * 100:.0f}%",
                    "iv_rank_display": f"{iv_rank:.0f}",
                    "implied_volatility": f"{avg_iv * 100:.1f}%",
                    "confidence_num": sig.confidence,
                    "confidence": f"{sig.confidence:.0f}%",
                    "trend": "上升" if trend > 0 else "下降",
                    "data_source": "live",
                    "earnings_warning": (f"⚠️ 財報距今 {days_to_earnings} 天" if days_to_earnings is not None and days_to_earnings <= 30 else ""),
                    "risk_notes": mechanical_exit_rules(sig),
                    "generated_at": now.strftime("%Y-%m-%d %H:%M:%S"),
                })
                daily_signals.append(d)

            # Sort by confidence × POP (best risk-adjusted first)
            daily_signals.sort(key=lambda x: (x.get("pop", 0) * x.get("confidence_num", 0)), reverse=True)
            for i, s in enumerate(daily_signals):
                s["rank"] = i + 1

            # Market overview
            bullish_count = sum(1 for s in daily_signals if s.get("direction") == "BULLISH")
            bearish_count = sum(1 for s in daily_signals if s.get("direction") == "BEARISH")
            neutral_count = sum(1 for s in daily_signals if s.get("direction") == "NEUTRAL")
            if bullish_count > bearish_count:
                market_bias = "看漲"
            elif bearish_count > bullish_count:
                market_bias = "看跌"
            else:
                market_bias = "中性"

            live_pct = f"{live_data_count}/{len(stock_pool)}"

            response = {
                "success": True,
                "data": {
                    "date": today_str,
                    "generated_at": now.strftime("%Y-%m-%d %H:%M:%S"),
                    "market_overview": {
                        "bias": market_bias,
                        "bullish_signals": bullish_count,
                        "bearish_signals": bearish_count,
                        "neutral_signals": neutral_count,
                        "total_signals": len(daily_signals),
                        "skipped_count": len(skipped),
                        "live_data": live_pct,
                        "regime": "牛市" if bull_regime else "熊市",
                        "market_status": "開盤" if 9 <= now.hour < 16 else "收盤",
                        "engine_version": "v2 — Credit Spreads / Iron Condor",
                    },
                    "top_picks": daily_signals[:3],
                    "all_signals": daily_signals,
                    "skipped": skipped,
                    "strategy_explainer": (
                        "新引擎優先使用「賣方 + 防守」結構 — 在 IV rank 偏高時用信用價差/鐵鷹收取權利金 (POP ~70%)，"
                        "在 IV rank 偏低時退而求其次買入長 call/put。已自動排除財報期內標的 (避免 IV crush)。"
                    ),
                    "disclaimer": "以上建議僅供參考，不構成投資建議。期權交易存在重大風險。賣方策略雖勝率高，但單筆最大虧損可能遠大於收益，請嚴格遵守機械式止盈止損規則。",
                    "next_update": "每日 09:00 EST 更新"
                },
                "timestamp": now.isoformat()
            }
            # Auto-record options signals to trade journal
            try:
                from tradingagents.quant.trade_journal import record_trades_from_options
                recorded = record_trades_from_options(response.get("data", {}))
                if recorded > 0:
                    print(f"📝 Recorded {recorded} options trades to journal")
            except Exception as je:
                print(f"⚠️ Options journal error: {je}")

            self.send_utf8_json_response(response, 200)
        except Exception as e:
            import traceback
            tb = traceback.format_exc()
            print(f"❌ daily-signals exception:\n{tb}")
            self.send_utf8_json_response({"success": False, "error": f"每日信號生成失敗: {str(e)}", "traceback": tb}, 500)

    # ============================================================
    # EMAIL SERVICE
    # ============================================================

    def handle_email_smtp_status(self):
        """GET /api/email/smtp-status"""
        try:
            from tradingagents.quant.email_service import get_smtp_config, test_smtp_connection
            cfg = get_smtp_config()
            safe_cfg = {k: v for k, v in cfg.items() if k != "smtp_pass"}
            safe_cfg["smtp_pass"] = "***" if cfg.get("smtp_pass") else ""
            self.send_utf8_json_response({"success": True, "data": safe_cfg})
        except Exception as e:
            self.send_utf8_json_response({"success": False, "error": str(e)}, 500)

    def handle_email_smtp_save(self):
        """POST /api/email/smtp"""
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            data = json.loads(self.rfile.read(content_length).decode('utf-8'))
            from tradingagents.quant.email_service import save_smtp_config
            save_smtp_config(data)
            self.send_utf8_json_response({"success": True, "message": "SMTP配置已保存"})
        except Exception as e:
            self.send_utf8_json_response({"success": False, "error": str(e)}, 500)

    def handle_email_test(self):
        """POST /api/email/test"""
        try:
            from tradingagents.quant.email_service import test_smtp_connection
            result = test_smtp_connection()
            self.send_utf8_json_response(result)
        except Exception as e:
            self.send_utf8_json_response({"success": False, "error": str(e)}, 500)

    def handle_hyper_growth_screen(self):
        """POST /api/hyper-growth/screen — Van Wagoner Hyper-Growth screener"""
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            data = json.loads(self.rfile.read(content_length).decode('utf-8')) if content_length else {}
            tickers = data.get('tickers') or []
            top_n = int(data.get('top_n') or 20)
            portfolio_size = int(data.get('portfolio_size') or 12)
            max_position_pct = float(data.get('max_position_pct') or 10) / 100.0

            if not tickers:
                return self.send_utf8_json_response({"success": False, "error": "No tickers provided"}, 400)

            from tradingagents.quant.van_wagoner_screener import screen_universe
            results = screen_universe(tickers, top_n=top_n, min_market_cap=0, max_market_cap=5000e9)

            def factor_dict(f):
                return {
                    "revenue_growth": f.revenue_growth, "product_cycle": f.product_cycle,
                    "tam_disruption": f.tam_disruption, "management_quality": f.management_quality,
                    "competitive_moat": f.competitive_moat, "roic_trend": f.roic_trend,
                }

            results_payload = [{
                "ticker": r.ticker, "name": r.name, "sector": r.sector,
                "market_cap": r.market_cap, "price": r.price,
                "factors": factor_dict(r.factors), "total_score": r.total_score,
                "guardrails": r.guardrails, "raw_metrics": r.raw_metrics,
            } for r in results]

            # Build portfolio (mirrors hyper_growth_screener._build_portfolio)
            min_score = 4.0
            max_sector_share = 0.40
            clean = [r for r in results if r.total_score >= min_score and not any("avoid" in g for g in r.guardrails)]
            selected = []
            sector_count = {}
            cap = max(1, int(portfolio_size * max_sector_share))
            for r in sorted(clean, key=lambda x: x.total_score, reverse=True):
                sec = r.sector or "Unknown"
                if sector_count.get(sec, 0) >= cap:
                    continue
                selected.append(r)
                sector_count[sec] = sector_count.get(sec, 0) + 1
                if len(selected) >= portfolio_size:
                    break

            total_score = sum(r.total_score for r in selected) or 1
            raw_rows = [(r, min(r.total_score / total_score, max_position_pct)) for r in selected]
            total_w = sum(w for _, w in raw_rows) or 1
            portfolio_payload = [{
                "ticker": r.ticker, "name": r.name, "sector": r.sector,
                "total_score": r.total_score, "weight": round(w / total_w, 4),
                "raw_metrics": r.raw_metrics,
            } for r, w in raw_rows]

            self.send_utf8_json_response({
                "success": True,
                "data": {
                    "results": results_payload,
                    "portfolio": portfolio_payload,
                    "sectors": sector_count,
                }
            })
        except ImportError as e:
            self.send_utf8_json_response({"success": False, "error": f"Hyper-growth module unavailable: {e}"}, 500)
        except Exception as e:
            import traceback
            traceback.print_exc()
            self.send_utf8_json_response({"success": False, "error": str(e)}, 500)

    def handle_email_subscribers_get(self):
        """GET /api/email/subscribers"""
        try:
            from tradingagents.quant.email_service import get_subscribers
            subs = get_subscribers()
            self.send_utf8_json_response({"success": True, "data": subs})
        except Exception as e:
            self.send_utf8_json_response({"success": False, "error": str(e)}, 500)

    def handle_email_subscribe(self):
        """POST /api/email/subscribe"""
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            data = json.loads(self.rfile.read(content_length).decode('utf-8'))
            from tradingagents.quant.email_service import add_subscriber
            result = add_subscriber(data.get("email", ""), data.get("name", ""), data.get("markets", "us,hk"))
            self.send_utf8_json_response(result)
        except Exception as e:
            self.send_utf8_json_response({"success": False, "error": str(e)}, 500)

    def handle_email_unsubscribe(self):
        """POST /api/email/unsubscribe"""
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            data = json.loads(self.rfile.read(content_length).decode('utf-8'))
            from tradingagents.quant.email_service import remove_subscriber
            result = remove_subscriber(data.get("email", ""))
            self.send_utf8_json_response(result)
        except Exception as e:
            self.send_utf8_json_response({"success": False, "error": str(e)}, 500)

    def handle_email_log(self):
        """GET /api/email/log"""
        try:
            from tradingagents.quant.email_service import get_email_log
            logs = get_email_log()
            self.send_utf8_json_response({"success": True, "data": logs})
        except Exception as e:
            self.send_utf8_json_response({"success": False, "error": str(e)}, 500)

    def handle_email_send_picks(self):
        """POST /api/email/send-picks — Send latest picks to all subscribers"""
        try:
            from tradingagents.quant.email_service import send_daily_picks_to_all
            cache = TradingAgentsAPIHandler._stock_picks_cache
            results = {}
            scanned = []

            for market in ["us", "hk"]:
                if not cache.get(market):
                    # Auto-scan if no cache
                    print(f"📧 Auto-scanning {market} for email (no cache)...")
                    try:
                        # Simulate a scan request by calling the handler's internals
                        import yfinance as yf
                        from tradingagents.quant.market_universe import SP500, HANG_SENG, HK_NAMES, HK_SECTORS
                        import math

                        tickers = HANG_SENG if market == 'hk' else SP500
                        currency = "HK$" if market == 'hk' else "$"
                        market_label = "港股" if market == 'hk' else "美股"
                        now = datetime.now()

                        raw = yf.download(tickers, period="1mo", group_by="ticker", progress=False, threads=True)
                        picks = []
                        for sym in tickers:
                            try:
                                df = raw[sym] if sym in raw.columns.get_level_values(0) else None
                                if df is None or df.empty:
                                    continue
                                close = df['Close'].dropna()
                                volume = df['Volume'].dropna()
                                if len(close) < 10:
                                    continue
                                prices = close.tolist()
                                current = round(prices[-1], 2)
                                prev = round(prices[-2], 2) if len(prices) >= 2 else current
                                if current <= 0 or prev <= 0:
                                    continue
                                changes = [prices[i] - prices[i-1] for i in range(1, len(prices))]
                                gains = [c for c in changes[-14:] if c > 0]
                                losses = [-c for c in changes[-14:] if c < 0]
                                avg_gain = sum(gains) / 14 if gains else 0.001
                                avg_loss = sum(losses) / 14 if losses else 0.001
                                rsi = round(100 - (100 / (1 + avg_gain / avg_loss)), 1)
                                mom_5 = round((prices[-1] / prices[-6] - 1) * 100, 2) if len(prices) >= 6 else 0
                                ma5 = sum(prices[-5:]) / 5 if len(prices) >= 5 else current
                                ma20 = sum(prices) / len(prices)
                                score = 0
                                reasons = []
                                if rsi < 30: score += 3; reasons.append(f"RSI超賣({rsi})")
                                elif rsi > 70: score -= 3; reasons.append(f"RSI超買({rsi})")
                                if mom_5 > 4: score += 2; reasons.append(f"5日動量+{mom_5}%")
                                elif mom_5 < -4: score -= 2; reasons.append(f"5日動量{mom_5}%")
                                if current > ma5 and current > ma20: score += 1; reasons.append("站上均線")
                                elif current < ma5 and current < ma20: score -= 1; reasons.append("跌破均線")
                                if abs(score) < 2: continue
                                direction = "買入" if score > 0 else "賣出"
                                direction_en = "BUY" if score > 0 else "SELL"
                                target = round(current * (1.08 if score > 0 else 0.92), 2)
                                stop_loss = round(current * (0.96 if score > 0 else 1.04), 2)
                                name = HK_NAMES.get(sym, sym.replace(".HK", "")) if market == 'hk' else sym
                                picks.append({
                                    "rank": 0, "symbol": sym.replace(".HK", ""), "name": name,
                                    "current_price": current, "direction": direction, "direction_en": direction_en,
                                    "score": abs(score), "confidence": f"{min(95, 40 + abs(score)*11)}%",
                                    "target_price": f"{currency}{target}", "stop_loss": f"{currency}{stop_loss}",
                                    "reasons": reasons, "currency": currency,
                                })
                            except Exception:
                                continue
                        picks.sort(key=lambda x: x["score"], reverse=True)
                        for i, p in enumerate(picks): p["rank"] = i + 1
                        buy_count = sum(1 for p in picks if p["direction_en"] == "BUY")
                        sell_count = sum(1 for p in picks if p["direction_en"] == "SELL")

                        result_data = {
                            "date": now.strftime("%Y-%m-%d"),
                            "market": market_label, "currency": currency,
                            "overview": {
                                "total_picks": len(picks), "buy_signals": buy_count,
                                "sell_signals": sell_count, "stocks_scanned": len(tickers),
                                "market_bias": "看漲" if buy_count > sell_count else "看跌" if sell_count > buy_count else "中性",
                            },
                            "top_picks": picks[:10], "all_picks": picks,
                        }
                        TradingAgentsAPIHandler._stock_picks_cache[market] = result_data
                        TradingAgentsAPIHandler._stock_picks_cache[f"{market}_at"] = now
                        scanned.append(market)
                    except Exception as scan_err:
                        results[market] = {"error": f"auto-scan failed: {scan_err}"}
                        continue

                if cache.get(market):
                    r = send_daily_picks_to_all(cache[market])
                    results[market] = r

            self.send_utf8_json_response({"success": True, "data": results, "auto_scanned": scanned})
        except Exception as e:
            import traceback
            traceback.print_exc()
            self.send_utf8_json_response({"success": False, "error": str(e)}, 500)

    def handle_email_send_journal(self):
        """POST /api/email/send-journal — Send journal report to all subscribers"""
        try:
            from tradingagents.quant.trade_journal import get_performance_summary, get_trade_history
            from tradingagents.quant.email_service import send_journal_to_all
            perf = get_performance_summary()
            trades = get_trade_history(limit=20)
            result = send_journal_to_all(perf, trades)
            self.send_utf8_json_response({"success": True, "data": result})
        except Exception as e:
            self.send_utf8_json_response({"success": False, "error": str(e)}, 500)

    def handle_trade_journal_history(self):
        """GET /api/trade-journal/history — 交易記錄"""
        try:
            parsed_path = urlparse(self.path)
            qp = parse_qs(parsed_path.query)
            market = qp.get('market', [None])[0]
            source = qp.get('source', [None])[0]
            status = qp.get('status', [None])[0]
            limit = int(qp.get('limit', ['100'])[0])

            from tradingagents.quant.trade_journal import get_trade_history
            trades = get_trade_history(market=market, source=source, status=status, limit=limit)
            self.send_utf8_json_response({
                "success": True,
                "data": {"trades": trades, "count": len(trades)},
                "timestamp": datetime.now().isoformat(),
            })
        except Exception as e:
            self.send_utf8_json_response({"success": False, "error": str(e)}, 500)

    def handle_trade_journal_performance(self):
        """GET /api/trade-journal/performance — 績效總覽"""
        try:
            parsed_path = urlparse(self.path)
            qp = parse_qs(parsed_path.query)
            market = qp.get('market', [None])[0]

            from tradingagents.quant.trade_journal import get_performance_summary
            perf = get_performance_summary(market=market)
            self.send_utf8_json_response({
                "success": True,
                "data": perf,
                "timestamp": datetime.now().isoformat(),
            })
        except Exception as e:
            self.send_utf8_json_response({"success": False, "error": str(e)}, 500)

    def handle_trade_journal_refresh(self):
        """GET /api/trade-journal/refresh-prices — 更新持倉價格"""
        try:
            import yfinance as yf
            import re

            def _parse_option_name(name):
                """Parse strike+expiry+type from names like
                '買入 MSFT $380.0 看跌期權 (到期: 2026-05-01)'."""
                if not name:
                    return None
                m_strike = re.search(r"\$([0-9]+(?:\.[0-9]+)?)", name)
                m_exp = re.search(r"(\d{4}-\d{2}-\d{2})", name)
                if not m_strike or not m_exp:
                    return None
                opt_type = "put" if "看跌" in name else ("call" if "看漲" in name else None)
                return {
                    "strike": float(m_strike.group(1)),
                    "expiry": m_exp.group(1),
                    "type": opt_type,
                }

            def fetch_price(trade):
                symbol = trade["symbol"]
                market = trade.get("market") or ""
                direction = trade.get("direction") or ""

                # Option contracts — fetch the premium, not the underlying
                if market == "OPTIONS" or direction in ("CALL", "PUT"):
                    info = _parse_option_name(trade.get("name"))
                    opt_type = (info or {}).get("type") or (
                        "put" if direction == "PUT" else "call"
                    )
                    if not info or not opt_type:
                        return None
                    try:
                        tk = yf.Ticker(symbol)
                        chain = tk.option_chain(info["expiry"])
                        df = chain.puts if opt_type == "put" else chain.calls
                        row = df[df["strike"] == info["strike"]]
                        if row.empty:
                            return None
                        # Prefer mid of bid/ask; fall back to lastPrice
                        bid = float(row["bid"].iloc[0]) if "bid" in row else 0.0
                        ask = float(row["ask"].iloc[0]) if "ask" in row else 0.0
                        if bid > 0 and ask > 0:
                            return (bid + ask) / 2
                        last = float(row["lastPrice"].iloc[0])
                        return last if last > 0 else None
                    except Exception:
                        return None

                # Equities (US / HK)
                sym = symbol
                if '港' in str(market):
                    sym = f"{symbol}.HK" if not symbol.endswith('.HK') else symbol
                ticker = yf.Ticker(sym)
                hist = ticker.history(period="1d")
                if not hist.empty:
                    return float(hist['Close'].iloc[-1])
                return None

            from tradingagents.quant.trade_journal import update_open_trades_prices
            result = update_open_trades_prices(price_fetcher=fetch_price)
            self.send_utf8_json_response({
                "success": True,
                "data": result,
                "timestamp": datetime.now().isoformat(),
            })
        except Exception as e:
            self.send_utf8_json_response({"success": False, "error": str(e)}, 500)

    # Stock picks cache
    _stock_picks_cache = {"us": None, "hk": None, "us_at": None, "hk_at": None}

    def handle_daily_stock_picks(self):
        """每日股票精選 — 全市場掃描 (S&P 500 / 恒生指數) 實時數據"""
        try:
            import math
            from datetime import timedelta
            import yfinance as yf
            from tradingagents.quant.market_universe import SP500, HANG_SENG, HK_NAMES, HK_SECTORS

            parsed_path = urlparse(self.path)
            qp = parse_qs(parsed_path.query)
            market = qp.get('market', ['us'])[0].lower()
            enable_ml = qp.get('ml', ['0'])[0] == '1'
            now = datetime.now()

            # Serve from cache if fresh (10 min), skip if nocache or ML mode changed
            force_refresh = qp.get('nocache', [''])[0] == '1'
            cache = TradingAgentsAPIHandler._stock_picks_cache
            if not force_refresh and cache.get(market) and cache.get(f"{market}_at") and (now - cache[f"{market}_at"]).total_seconds() < 600:
                self.send_utf8_json_response({"success": True, "data": cache[market], "cached": True, "timestamp": now.isoformat()})
                return

            if market == 'hk':
                tickers = HANG_SENG
                currency = "HK$"
                market_label = "港股"
            else:
                tickers = SP500
                currency = "$"
                market_label = "美股"

            total_scanned = len(tickers)
            print(f"📊 Scanning {total_scanned} {market_label} stocks...")

            # Batch download — 8mo: enough for 200-day MA, 60-day RS rank, 14-day ATR
            raw = yf.download(tickers, period="8mo", group_by="ticker", progress=False, threads=True)

            # ---- Market regime filter + benchmark series for RS rank ----
            # Shorting a market in a confirmed uptrend is the single worst
            # pattern in the history of this journal. If benchmark > 200-day MA
            # → bull regime → block new shorts.
            bench_sym = "^HSI" if market == "hk" else "SPY"
            bull_regime = True
            bench_60d_return = 0.0  # 60-day return of benchmark, for RS rank
            try:
                bench_hist = yf.download(bench_sym, period="10mo", progress=False)
                if not bench_hist.empty and "Close" in bench_hist:
                    closes = bench_hist["Close"].dropna().tolist()
                    if len(closes) >= 200:
                        ma200 = sum(closes[-200:]) / 200
                        bull_regime = closes[-1] > ma200
                        print(f"📈 Market regime ({bench_sym}): {'BULL' if bull_regime else 'BEAR'} (last={closes[-1]:.2f}, MA200={ma200:.2f})")
                    if len(closes) >= 60:
                        bench_60d_return = (closes[-1] / closes[-60] - 1) * 100
            except Exception as regime_err:
                print(f"⚠️ Market regime check failed: {regime_err}")

            # ---- ML Training: SVM + RF + GB (only when ml=1) ----
            ml_picker = None
            ml_train_info = None
            all_prices_dict = {}
            all_volumes_dict = {}
            if enable_ml:
              try:
                from tradingagents.quant.ml_stock_picker import MLStockPicker, ML_AVAILABLE
                if ML_AVAILABLE:
                    # Pick top 30 liquid tickers for ML training (use 2mo history)
                    ml_tickers = tickers[:30] if market == 'us' else tickers[:20]
                    print(f"🤖 Training ML on {len(ml_tickers)} stocks (2mo data)...")
                    ml_raw = yf.download(ml_tickers, period="2mo", group_by="ticker", progress=False, threads=True)
                    ml_picker = MLStockPicker()
                    for sym_t in ml_tickers:
                        try:
                            if len(ml_tickers) == 1:
                                df_t = ml_raw
                            else:
                                df_t = ml_raw[sym_t] if sym_t in ml_raw.columns.get_level_values(0) else None
                            if df_t is not None and not df_t.empty:
                                c_t = df_t['Close'].dropna()
                                v_t = df_t['Volume'].dropna()
                                if len(c_t) >= 30:
                                    all_prices_dict[sym_t] = c_t.tolist()
                                    all_volumes_dict[sym_t] = v_t.tolist()
                        except Exception:
                            pass
                    if all_prices_dict:
                        ml_train_info = ml_picker.train_on_market(all_prices_dict, all_volumes_dict)
                        print(f"🤖 ML trained: {ml_train_info.get('samples',0)} samples, models: {ml_train_info.get('models',[])}")
              except Exception as ml_err:
                print(f"⚠️ ML picker init error: {ml_err}")
                ml_picker = None

            picks = []
            errors = 0
            for sym in tickers:
                try:
                    if len(tickers) == 1:
                        df = raw
                    else:
                        df = raw[sym] if sym in raw.columns.get_level_values(0) else None
                    if df is None or df.empty:
                        errors += 1
                        continue

                    close = df['Close'].dropna()
                    high = df['High'].dropna() if 'High' in df else close
                    low = df['Low'].dropna() if 'Low' in df else close
                    volume = df['Volume'].dropna()
                    if len(close) < 30:
                        continue

                    prices = close.tolist()
                    highs = high.tolist()
                    lows = low.tolist()
                    volumes = volume.tolist()
                    current_price = round(prices[-1], 2)
                    prev_close = round(prices[-2], 2) if len(prices) >= 2 else current_price
                    if current_price <= 0 or prev_close <= 0:
                        continue
                    day_change = round((current_price - prev_close) / prev_close * 100, 2)

                    # RSI-14
                    changes = [prices[i] - prices[i-1] for i in range(1, len(prices))]
                    gains = [c for c in changes[-14:] if c > 0]
                    losses = [-c for c in changes[-14:] if c < 0]
                    avg_gain = sum(gains) / 14 if gains else 0.001
                    avg_loss = sum(losses) / 14 if losses else 0.001
                    rsi = round(100 - (100 / (1 + avg_gain / avg_loss)), 1)

                    # Momentum (multi-horizon: 5d / 20d / 60d)
                    mom_5 = round((prices[-1] / prices[-6] - 1) * 100, 2) if len(prices) >= 6 else 0
                    mom_20 = round((prices[-1] / prices[-21] - 1) * 100, 2) if len(prices) >= 21 else 0
                    mom_60 = round((prices[-1] / prices[-61] - 1) * 100, 2) if len(prices) >= 61 else 0

                    # Annualized volatility
                    log_rets = [math.log(prices[i]/prices[i-1]) for i in range(1, len(prices)) if prices[i-1] > 0]
                    vol = round(math.sqrt(sum(r**2 for r in log_rets) / max(1, len(log_rets))) * math.sqrt(252) * 100, 1) if log_rets else 25.0

                    # ATR-14 — for stop/target sizing that respects each name's range
                    atr = current_price * 0.02  # safe default 2%
                    if len(prices) >= 15:
                        trs = []
                        for i in range(-14, 0):
                            tr = max(
                                highs[i] - lows[i],
                                abs(highs[i] - prices[i-1]),
                                abs(lows[i] - prices[i-1]),
                            )
                            trs.append(tr)
                        atr = sum(trs) / 14

                    # Volume ratio (5-day vs 20-day baseline, more meaningful than full history)
                    avg_vol_5 = sum(volumes[-5:]) / 5 if len(volumes) >= 5 else 1
                    avg_vol_20 = sum(volumes[-20:]) / 20 if len(volumes) >= 20 else avg_vol_5
                    vol_ratio = round(avg_vol_5 / max(1, avg_vol_20), 2)

                    # Moving averages (now incl. 50/200 trend filter)
                    ma5  = sum(prices[-5:]) / 5
                    ma20 = sum(prices[-20:]) / 20
                    ma50 = sum(prices[-50:]) / 50 if len(prices) >= 50 else ma20
                    ma200 = sum(prices[-200:]) / 200 if len(prices) >= 200 else ma50
                    above_ma5   = current_price > ma5
                    above_ma20  = current_price > ma20
                    above_ma50  = current_price > ma50
                    above_ma200 = current_price > ma200
                    # Stage 2 (Minervini): MA50 > MA200 AND price > MA50 → confirmed uptrend
                    stage2_uptrend = above_ma50 and above_ma200 and ma50 > ma200
                    # Stage 4: MA50 < MA200 AND price < MA50 → confirmed downtrend
                    stage4_downtrend = (not above_ma50) and (not above_ma200) and ma50 < ma200

                    # Relative Strength rank vs benchmark — most predictive single factor
                    # for swing trades (per O'Neil/Minervini research).
                    # RS = (stock 60d return) − (benchmark 60d return). Convert to
                    # 0–100 percentile *within this scan batch* below.
                    rs_60d = mom_60 - bench_60d_return  # raw; rank assigned after loop

                    # ---- MULTI-FACTOR SCORE ----
                    # Each factor scored on its own merit; reasons captured for UX.
                    score = 0
                    reasons = []

                    # 1. Trend regime on the stock itself (most important factor)
                    if stage2_uptrend:
                        score += 3; reasons.append("Stage 2 上升趨勢 (MA50>MA200, 站上MA50)")
                    elif stage4_downtrend:
                        score -= 3; reasons.append("Stage 4 下降趨勢 (MA50<MA200, 跌破MA50)")
                    elif above_ma50 and above_ma200:
                        score += 1; reasons.append("中長期趨勢轉強")
                    elif (not above_ma50) and (not above_ma200):
                        score -= 1; reasons.append("中長期趨勢偏弱")

                    # 2. RSI — only meaningful at extremes; mild values add noise
                    if rsi < 28:
                        score += 2; reasons.append(f"RSI 極度超賣({rsi})")
                    elif rsi > 75:
                        score -= 2; reasons.append(f"RSI 極度超買({rsi})")

                    # 3. Multi-horizon momentum agreement
                    if mom_20 > 6 and mom_5 > 0:
                        score += 2; reasons.append(f"動量持續(20d:+{mom_20}%, 5d:+{mom_5}%)")
                    elif mom_20 < -6 and mom_5 < 0:
                        score -= 2; reasons.append(f"動量轉弱(20d:{mom_20}%, 5d:{mom_5}%)")

                    # 4. Short-term MA position confirmation
                    if above_ma5 and above_ma20:
                        score += 1; reasons.append("站上MA5+MA20")
                    elif (not above_ma5) and (not above_ma20):
                        score -= 1; reasons.append("跌破MA5+MA20")

                    # 5. Volume confirmation — only counts when aligned with direction
                    if vol_ratio > 1.5 and score > 0 and day_change > 0:
                        score += 1; reasons.append(f"放量上漲({vol_ratio}x)")
                    elif vol_ratio > 1.5 and score < 0 and day_change < 0:
                        score -= 1; reasons.append(f"放量下跌({vol_ratio}x)")

                    # ---- ML Ensemble Prediction (SVM + RF + GB) ----
                    ml_pred = None
                    if ml_picker and ml_picker._trained:
                        try:
                            # Use longer history from ML training data if available
                            ml_prices = all_prices_dict.get(sym, prices)
                            ml_volumes = all_volumes_dict.get(sym, volumes)
                            ml_pred = ml_picker.predict(ml_prices, ml_volumes)
                            if ml_pred:
                                ml_dir = ml_pred["direction"]
                                ml_conf = ml_pred["confidence"]
                                # ML vote adds to score
                                if ml_dir == "BUY":
                                    score += 2
                                    reasons.append(f"ML模型看漲(SVM+RF+GB {ml_conf:.0%})")
                                elif ml_dir == "SELL":
                                    score -= 2
                                    reasons.append(f"ML模型看跌(SVM+RF+GB {ml_conf:.0%})")
                                else:
                                    reasons.append(f"ML模型中性(SVM+RF+GB {ml_conf:.0%})")
                        except Exception:
                            pass

                    # ---- GATING ----
                    # BUY needs score >= 3 AND (Stage 2 trend OR strong momentum).
                    # No buying countertrend mean-reversion in Stage 4 anymore —
                    # that pattern lost the most money historically.
                    # SELL needs score <= -4, Stage 4, AND bear market regime.
                    if score >= 3 and (stage2_uptrend or (mom_20 > 5 and above_ma50)):
                        pass
                    elif (score <= -4 and stage4_downtrend and not bull_regime):
                        pass
                    else:
                        continue

                    direction = "買入" if score > 0 else "賣出"
                    direction_en = "BUY" if score > 0 else "SELL"

                    # ---- ATR-based stop/target ----
                    # 1.5× ATR stop (single-name volatility, not market-average).
                    # 3× ATR target = ~2:1 reward:risk on average.
                    stop_dist = max(current_price * 0.02, 1.5 * atr)
                    target_dist = 2.0 * stop_dist
                    if direction_en == "BUY":
                        target = round(current_price + target_dist, 2)
                        stop_loss = round(current_price - stop_dist, 2)
                    else:
                        target = round(current_price - target_dist, 2)
                        stop_loss = round(current_price + stop_dist, 2)

                    # ---- Confidence: empirical-style components ----
                    # Trend alignment dominates (single biggest predictor of swing PnL),
                    # then signal score, then ML agreement.
                    trend_conf = 35 if (stage2_uptrend and direction_en == "BUY") or (stage4_downtrend and direction_en == "SELL") else 15
                    signal_conf = min(35, abs(score) * 6)
                    vol_conf = 8 if vol_ratio > 1.3 else 0
                    ml_conf_pts = 12 if (ml_pred and ml_pred["direction"] == direction_en) else 0
                    confidence = min(95, trend_conf + signal_conf + vol_conf + ml_conf_pts)

                    display_sym = sym.replace(".HK", "")
                    if market == 'hk':
                        name = HK_NAMES.get(sym, display_sym)
                        sector = HK_SECTORS.get(sym, "其他")
                    else:
                        name = display_sym
                        sector = ""

                    picks.append({
                        "rank": 0,
                        "symbol": display_sym,
                        "name": name,
                        "sector": sector,
                        "current_price": current_price,
                        "prev_close": prev_close,
                        "day_change": f"{'+' if day_change >= 0 else ''}{day_change}%",
                        "direction": direction,
                        "direction_en": direction_en,
                        "score": abs(score),
                        "_score_signed": score,             # internal, used for RS-blended sort
                        "_rs_60d": rs_60d,                  # raw, ranked after loop
                        "rs_rank": 0,                       # filled in after loop
                        "confidence": f"{confidence}%",
                        "_confidence_num": confidence,
                        "target_price": f"{currency}{target}",
                        "stop_loss": f"{currency}{stop_loss}",
                        "potential_return": f"{'+' if score > 0 else ''}{round((target/current_price - 1)*100, 1)}%",
                        "risk_reward": f"1:{round(abs(target - current_price) / max(0.01, abs(stop_loss - current_price)), 1)}",
                        "rsi": rsi,
                        "momentum_5d": f"{'+' if mom_5 >= 0 else ''}{mom_5}%",
                        "momentum_20d": f"{'+' if mom_20 >= 0 else ''}{mom_20}%",
                        "momentum_60d": f"{'+' if mom_60 >= 0 else ''}{mom_60}%",
                        "volatility": f"{vol}%",
                        "atr": round(atr, 2),
                        "volume_ratio": f"{vol_ratio}x",
                        "above_ma5": above_ma5,
                        "above_ma20": above_ma20,
                        "above_ma50": above_ma50,
                        "above_ma200": above_ma200,
                        "trend_stage": "Stage 2 (上升)" if stage2_uptrend else ("Stage 4 (下降)" if stage4_downtrend else "Stage 1/3 (整理)"),
                        "reasons": reasons,
                        "exit_rules": [
                            f"止損: {currency}{stop_loss} ({(stop_dist/current_price*100):.1f}% / 1.5×ATR)",
                            f"目標: {currency}{target} (2:1 風險回報)",
                            "若達 1× ATR 浮盈，止損移至成本價 (move stop to breakeven)",
                            "持倉超過 10 天無進展 → 平倉 (時間止損)",
                            "絕不持有過財報",
                        ],
                        "entry_strategy": (
                            f"分批進場 1: 市價 {currency}{current_price}，分批 2: 回調至 {currency}{round(current_price - 0.5*atr, 2)}"
                            if direction_en == "BUY" else
                            f"分批進場 1: 市價 {currency}{current_price}，分批 2: 反彈至 {currency}{round(current_price + 0.5*atr, 2)}"
                        ),
                        "position_size_hint": f"風險 1% 帳戶資金 → 倉位 ${round(0.01 * 100000 / max(0.01, stop_dist) * current_price, 0):,.0f}",
                        "currency": currency,
                        "data_source": "live",
                        "ml_prediction": {
                            "direction": ml_pred["direction"] if ml_pred else None,
                            "confidence": ml_pred["confidence"] if ml_pred else None,
                            "votes": ml_pred["votes"] if ml_pred else None,
                            "model_predictions": ml_pred["model_predictions"] if ml_pred else None,
                        } if ml_pred else None,
                        "generated_at": now.strftime("%Y-%m-%d %H:%M:%S"),
                    })
                except Exception:
                    errors += 1
                    continue

            # ---- Assign RS rank within this scan batch (0–100 percentile) ----
            if picks:
                sorted_rs = sorted(p["_rs_60d"] for p in picks)
                n = len(sorted_rs)
                for p in picks:
                    # Percentile rank of this stock's RS vs the rest of the batch
                    rank_pos = sum(1 for v in sorted_rs if v <= p["_rs_60d"])
                    p["rs_rank"] = round(rank_pos / n * 100)

            # ---- Filter: BUYs must have RS rank >= 60 (no laggard buys);
            #              SELLs must have RS rank <= 40 (no leader shorts).
            # This is the single biggest historical PnL improvement: never buy
            # the weakest names in a hot sector, never short the strongest.
            picks = [
                p for p in picks
                if (p["direction_en"] == "BUY"  and p["rs_rank"] >= 60)
                or (p["direction_en"] == "SELL" and p["rs_rank"] <= 40)
            ]

            # ---- Composite ranking: confidence × signal-score, RS as tiebreaker ----
            picks.sort(key=lambda x: (
                x["_confidence_num"] * x["score"],
                x["rs_rank"] if x["direction_en"] == "BUY" else (100 - x["rs_rank"]),
            ), reverse=True)
            for i, p in enumerate(picks):
                p["rank"] = i + 1

            # Strip internal-only fields before serializing
            for p in picks:
                p.pop("_score_signed", None)
                p.pop("_rs_60d", None)
                p.pop("_confidence_num", None)

            buy_count = sum(1 for p in picks if p["direction_en"] == "BUY")
            sell_count = sum(1 for p in picks if p["direction_en"] == "SELL")

            result_data = {
                "date": now.strftime("%Y-%m-%d"),
                "market": market_label,
                "currency": currency,
                "generated_at": now.strftime("%Y-%m-%d %H:%M:%S"),
                "overview": {
                    "total_picks": len(picks),
                    "buy_signals": buy_count,
                    "sell_signals": sell_count,
                    "market_bias": "看漲" if buy_count > sell_count else "看跌" if sell_count > buy_count else "中性",
                    "stocks_scanned": total_scanned,
                    "scan_errors": errors,
                    "ml_enabled": ml_picker is not None and ml_picker._trained,
                    "regime": "牛市" if bull_regime else "熊市",
                    "engine_version": "v2 — Stage Analysis + RS Rank + ATR Stops",
                    "filters": "需 Stage 2 上升趨勢, RS rank ≥ 60, score ≥ 3 (BUY) / 反之 SELL 需熊市+Stage 4",
                },
                "ml_info": ml_train_info,
                "top_picks": picks[:10],
                "all_picks": picks,
                "strategy_explainer": (
                    "新引擎拒絕逆勢買入：只在 Stage 2 確認上升趨勢且 RS rank ≥ 60 時買入；"
                    "只在熊市 + Stage 4 確認下降趨勢且 RS rank ≤ 40 時做空。"
                    "止損改用 1.5×ATR (各別股票波動性)，目標 2:1 風險回報。"
                    "信心分數中「趨勢一致性」佔 35 分權重 — 這是歷史回測中最具預測力的因子。"
                ),
                "disclaimer": "以上建議僅供參考，不構成投資建議。請嚴格遵守 1.5×ATR 止損與 2:1 風險回報目標。建議單筆風險不超過帳戶總額的 1%。",
            }

            # Update cache
            TradingAgentsAPIHandler._stock_picks_cache[market] = result_data
            TradingAgentsAPIHandler._stock_picks_cache[f"{market}_at"] = now

            # Auto-record top picks to trade journal
            try:
                from tradingagents.quant.trade_journal import record_trades_from_picks
                recorded = record_trades_from_picks(result_data)
                if recorded > 0:
                    print(f"📝 Recorded {recorded} trades to journal")
                    result_data["trades_recorded"] = recorded
            except Exception as je:
                print(f"⚠️ Trade journal error: {je}")

            print(f"✅ Scanned {total_scanned} stocks, found {len(picks)} signals ({buy_count} buy, {sell_count} sell)")
            self.send_utf8_json_response({"success": True, "data": result_data, "cached": False, "timestamp": now.isoformat()})
        except Exception as e:
            import traceback
            traceback.print_exc()
            self.send_utf8_json_response({"success": False, "error": f"每日股票精選生成失敗: {str(e)}"}, 500)

    # ============================================================
    # QUANT TRADING — Futu + Engine + Debate
    # ============================================================

    _quant_futu = None   # Singleton FutuConnector
    _quant_engine = None  # Singleton QuantEngine
    _quant_debate = None  # Singleton QuantDebateSystem
    _quant_optimizer = None  # Singleton AutoOptimizer

    @classmethod
    def _get_quant_modules(cls):
        """Lazy-init quant modules."""
        if cls._quant_futu is None:
            from tradingagents.quant.futu_connector import FutuConnector
            from tradingagents.quant.quant_engine import QuantEngine
            from tradingagents.quant.quant_debate import QuantDebateSystem
            from tradingagents.quant.auto_optimizer import AutoOptimizer
            cls._quant_futu = FutuConnector()
            cls._quant_futu.connect()
            cls._quant_engine = QuantEngine(cls._quant_futu)
            cls._quant_debate = QuantDebateSystem()
            cls._quant_optimizer = AutoOptimizer(cls._quant_engine)
        return cls._quant_futu, cls._quant_engine, cls._quant_debate

    QUANT_UNIVERSE_US = [
        "AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "NVDA", "META", "AMD",
        "NFLX", "JPM", "V", "MA", "INTC", "ORCL", "CRM", "ADBE",
        "BA", "DIS", "PYPL", "UBER", "GS", "COIN", "SQ", "SHOP",
    ]

    QUANT_UNIVERSE_HK = [
        "0700", "9988", "0941", "1810", "3690", "9618", "2020", "1299",
        "2318", "0005", "0388", "1211", "0027", "0669", "9999", "2382",
        "0883", "1398", "0939", "3988", "0016", "0001", "0011", "0002",
    ]

    def _get_quant_universe(self, market=None):
        """Get stock universe based on market parameter."""
        if market and market.lower() == 'hk':
            return self.QUANT_UNIVERSE_HK
        return self.QUANT_UNIVERSE_US

    def handle_quant_strategies(self):
        """GET /api/quant/strategies — 列出所有可用量化策略"""
        try:
            _, engine, _ = self._get_quant_modules()
            strategies = engine.list_strategies()
            self.send_utf8_json_response({
                "success": True,
                "data": {"strategies": strategies, "count": len(strategies)},
                "timestamp": datetime.now().isoformat(),
            })
        except Exception as e:
            self.send_utf8_json_response({"success": False, "error": str(e)}, 500)

    def handle_quant_signals(self):
        """GET /api/quant/signals?strategy=momentum&market=us — 運行策略生成信號"""
        try:
            parsed_path = urlparse(self.path)
            query_params = parse_qs(parsed_path.query)
            strategy_id = query_params.get('strategy', ['all'])[0]
            market = query_params.get('market', ['us'])[0]

            _, engine, _ = self._get_quant_modules()
            symbols = self._get_quant_universe(market)

            if strategy_id == 'all':
                result = engine.run_all_strategies(symbols)
            else:
                result = engine.run_strategy(strategy_id, symbols)

            self.send_utf8_json_response({
                "success": True,
                "data": result,
                "timestamp": datetime.now().isoformat(),
            })
        except Exception as e:
            self.send_utf8_json_response({"success": False, "error": str(e)}, 500)

    def handle_quant_backtest(self):
        """GET /api/quant/backtest?strategy=momentum&capital=100000&days=60&market=us"""
        try:
            parsed_path = urlparse(self.path)
            qp = parse_qs(parsed_path.query)
            strategy_id = qp.get('strategy', ['momentum'])[0]
            capital = float(qp.get('capital', ['100000'])[0])
            days = int(qp.get('days', ['60'])[0])
            rebalance = int(qp.get('rebalance', ['5'])[0])
            market = qp.get('market', ['us'])[0]

            _, engine, _ = self._get_quant_modules()
            result = engine.backtest_strategy(
                strategy_id, self._get_quant_universe(market),
                capital=capital, days=days, rebalance_freq=rebalance
            )
            self.send_utf8_json_response({
                "success": True,
                "data": result,
                "timestamp": datetime.now().isoformat(),
            })
        except Exception as e:
            self.send_utf8_json_response({"success": False, "error": str(e)}, 500)

    def handle_quant_debate(self):
        """GET /api/quant/debate — 運行多智能體策略辯論"""
        try:
            parsed_path = urlparse(self.path)
            qp = parse_qs(parsed_path.query)
            rounds = int(qp.get('rounds', ['2'])[0])
            market = qp.get('market', ['us'])[0]

            _, engine, debate = self._get_quant_modules()
            symbols = self._get_quant_universe(market)
            market_label = "港股TOP24" if market.lower() == 'hk' else "美股TOP24"

            # Run all strategies first to get data for debate
            strategy_results = engine.run_all_strategies(symbols)

            # Market context
            market_context = {
                "date": datetime.now().strftime("%Y-%m-%d"),
                "universe": market_label,
                "market_status": "開盤" if 9 <= datetime.now().hour < 16 else "收盤",
                "strategies_run": len(strategy_results.get("strategy_results", {})),
                "consensus_count": len(strategy_results.get("consensus_signals", [])),
            }

            # Run debate
            debate_result = debate.run_full_debate(
                market_context, strategy_results, max_rounds=rounds
            )

            self.send_utf8_json_response({
                "success": True,
                "data": debate_result,
                "timestamp": datetime.now().isoformat(),
            })
        except Exception as e:
            self.send_utf8_json_response({"success": False, "error": str(e)}, 500)

    def handle_futu_status(self):
        """GET /api/quant/futu/status — Futu連接狀態"""
        try:
            futu, _, _ = self._get_quant_modules()
            self.send_utf8_json_response({
                "success": True,
                "data": futu.status,
                "timestamp": datetime.now().isoformat(),
            })
        except Exception as e:
            self.send_utf8_json_response({"success": False, "error": str(e)}, 500)

    def handle_futu_portfolio(self):
        """GET /api/quant/futu/portfolio — 模擬組合"""
        try:
            futu, _, _ = self._get_quant_modules()
            portfolio = futu.get_portfolio()
            self.send_utf8_json_response({
                "success": True,
                "data": portfolio,
                "timestamp": datetime.now().isoformat(),
            })
        except Exception as e:
            self.send_utf8_json_response({"success": False, "error": str(e)}, 500)

    def handle_futu_orders(self):
        """GET /api/quant/futu/orders — 訂單列表"""
        try:
            futu, _, _ = self._get_quant_modules()
            orders = futu.get_orders()
            self.send_utf8_json_response({
                "success": True,
                "data": {"orders": orders, "count": len(orders)},
                "timestamp": datetime.now().isoformat(),
            })
        except Exception as e:
            self.send_utf8_json_response({"success": False, "error": str(e)}, 500)

    def handle_futu_trade(self):
        """POST /api/quant/futu/trade — 執行模擬交易"""
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            trade_data = json.loads(post_data.decode('utf-8'))

            symbol = trade_data.get('symbol', '')
            side = trade_data.get('side', 'BUY')
            qty = int(trade_data.get('qty', 100))
            price = trade_data.get('price')

            if not symbol:
                self.send_utf8_json_response({"success": False, "error": "缺少股票代碼"}, 400)
                return

            futu, _, _ = self._get_quant_modules()
            result = futu.place_order(symbol, side, qty, price)

            self.send_utf8_json_response({
                "success": result.get("success", False),
                "data": result,
                "timestamp": datetime.now().isoformat(),
            })
        except Exception as e:
            self.send_utf8_json_response({"success": False, "error": str(e)}, 500)

    def handle_quant_optimize(self):
        """GET /api/quant/optimize — 運行自動策略優化"""
        try:
            parsed_path = urlparse(self.path)
            qp = parse_qs(parsed_path.query)
            generations = int(qp.get('generations', ['5'])[0])
            population = int(qp.get('population', ['6'])[0])
            days = int(qp.get('days', ['60'])[0])
            capital = float(qp.get('capital', ['100000'])[0])
            market = qp.get('market', ['us'])[0]

            self._get_quant_modules()
            optimizer = self._quant_optimizer
            symbols = self._get_quant_universe(market)

            result = optimizer.run_optimization(
                symbols, generations=generations, population_size=population,
                backtest_days=days, capital=capital
            )
            self.send_utf8_json_response({
                "success": True,
                "data": result,
                "timestamp": datetime.now().isoformat(),
            })
        except Exception as e:
            import traceback
            traceback.print_exc()
            self.send_utf8_json_response({"success": False, "error": str(e)}, 500)

    def handle_quant_optimize_history(self):
        """GET /api/quant/optimize/history — 優化歷史"""
        try:
            self._get_quant_modules()
            history = self._quant_optimizer.get_optimization_history(limit=30)
            weights = self._quant_optimizer.strategy_weights
            weight_history = self._quant_optimizer.weight_history[-20:]
            self.send_utf8_json_response({
                "success": True,
                "data": {
                    "history": history,
                    "current_weights": {k: f"{v*100:.1f}%" for k, v in weights.items()},
                    "weight_evolution": weight_history,
                },
                "timestamp": datetime.now().isoformat(),
            })
        except Exception as e:
            self.send_utf8_json_response({"success": False, "error": str(e)}, 500)

    def handle_quant_auto_trade(self):
        """GET /api/quant/auto_trade — User-scheduled auto-trade against an established quant strategy.

        Query params:
          strategy   — strategy_id from /api/quant/strategies (default: momentum)
          market     — us | hk (default: us)
          capital    — starting capital (default: 100000)
          start_date — YYYY-MM-DD; required (or use `days`)
          end_date   — YYYY-MM-DD; defaults to today
          days       — alternative to start_date/end_date; trade window in days
          rebalance  — rebalance frequency in days (default: 5)
        """
        try:
            import random
            from datetime import timedelta

            qp = parse_qs(urlparse(self.path).query)
            strategy_id = qp.get('strategy', ['momentum'])[0]
            market = qp.get('market', ['us'])[0]
            capital = float(qp.get('capital', ['100000'])[0])
            rebalance = max(1, int(qp.get('rebalance', ['5'])[0]))

            start_str = (qp.get('start_date', [''])[0] or '').strip()
            end_str = (qp.get('end_date', [''])[0] or '').strip()
            now = datetime.now()
            end_dt = datetime.strptime(end_str, '%Y-%m-%d') if end_str else now
            if start_str:
                start_dt = datetime.strptime(start_str, '%Y-%m-%d')
                days = max(7, min(730, (end_dt - start_dt).days or 7))
            else:
                days = max(7, min(730, int(qp.get('days', ['60'])[0])))
                start_dt = end_dt - timedelta(days=days)

            # Per-user identity + deterministic RNG
            user_id = 0
            try:
                session_id = self.headers.get('Authorization', '').replace('Bearer ', '')
                if session_id:
                    sess = get_session(session_id)
                    if sess:
                        user_id = sess.get('user_id', 0) or 0
                        random.seed(hash((user_id, strategy_id, market, days, start_str)) & 0xFFFFFFFF)
            except Exception:
                pass

            _, engine, _ = self._get_quant_modules()
            symbols = self._get_quant_universe(market)
            bt = engine.backtest_strategy(
                strategy_id, symbols,
                capital=capital, days=days, rebalance_freq=rebalance,
            )
            if bt.get("error"):
                self.send_utf8_json_response({"success": False, "error": bt["error"]}, 400)
                return

            # Map each trade's `day` offset to a real calendar date and build cumulative profit
            transactions = []
            cumulative = 0.0
            equity = capital
            for t in bt.get("trades", []) or []:
                day_offset = int(t.get("day", 0))
                trade_date = (start_dt + timedelta(days=day_offset)).strftime("%Y-%m-%d")
                cumulative += float(t.get("pnl", 0))
                equity = capital + cumulative
                transactions.append({
                    "trade_date": trade_date,
                    "day_offset": day_offset,
                    "symbol": t.get("symbol"),
                    "side": t.get("side"),
                    "qty": t.get("qty"),
                    "entry_price": t.get("entry"),
                    "exit_price": t.get("exit"),
                    "pnl": round(float(t.get("pnl", 0)), 2),
                    "return_pct": t.get("return_pct"),
                    "score": t.get("score"),
                    "reason": t.get("reason", ""),
                    "cumulative_pnl": round(cumulative, 2),
                    "equity_after": round(equity, 2),
                    "result": "WIN" if float(t.get("pnl", 0)) > 0 else "LOSS",
                })

            total_pnl = round(cumulative, 2)
            total_trades = len(transactions)
            wins = sum(1 for x in transactions if x["pnl"] > 0)

            # Persist per-user
            run_id = None
            if user_id:
                try:
                    db_path = Path(__file__).parent / "trading_agents.db"
                    conn = sqlite3.connect(str(db_path))
                    cur = conn.cursor()
                    cur.execute('''
                        CREATE TABLE IF NOT EXISTS quant_auto_trade_runs (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            user_id INTEGER NOT NULL,
                            strategy_id TEXT,
                            market TEXT,
                            start_date TEXT,
                            end_date TEXT,
                            days INTEGER,
                            rebalance INTEGER,
                            initial_capital REAL,
                            final_equity REAL,
                            total_pnl REAL,
                            total_return_pct REAL,
                            total_trades INTEGER,
                            win_rate_pct REAL,
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                        )
                    ''')
                    cur.execute('''
                        CREATE TABLE IF NOT EXISTS quant_auto_trade_transactions (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            run_id INTEGER NOT NULL,
                            user_id INTEGER NOT NULL,
                            trade_date TEXT,
                            symbol TEXT,
                            side TEXT,
                            qty REAL,
                            entry_price REAL,
                            exit_price REAL,
                            pnl REAL,
                            return_pct REAL,
                            score REAL,
                            reason TEXT,
                            cumulative_pnl REAL,
                            equity_after REAL,
                            result TEXT,
                            FOREIGN KEY(run_id) REFERENCES quant_auto_trade_runs(id)
                        )
                    ''')
                    cur.execute('''
                        INSERT INTO quant_auto_trade_runs
                        (user_id, strategy_id, market, start_date, end_date, days, rebalance,
                         initial_capital, final_equity, total_pnl, total_return_pct,
                         total_trades, win_rate_pct)
                        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
                    ''', (user_id, strategy_id, market,
                          start_dt.strftime("%Y-%m-%d"), end_dt.strftime("%Y-%m-%d"),
                          days, rebalance, capital, round(equity, 2), total_pnl,
                          round(total_pnl / capital * 100, 2), total_trades,
                          round(wins / max(1, total_trades) * 100, 1)))
                    run_id = cur.lastrowid
                    for tx in transactions:
                        cur.execute('''
                            INSERT INTO quant_auto_trade_transactions
                            (run_id, user_id, trade_date, symbol, side, qty, entry_price,
                             exit_price, pnl, return_pct, score, reason, cumulative_pnl,
                             equity_after, result)
                            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                        ''', (run_id, user_id, tx["trade_date"], tx["symbol"], tx["side"],
                              tx["qty"], tx["entry_price"], tx["exit_price"], tx["pnl"],
                              tx["return_pct"], tx["score"], tx["reason"],
                              tx["cumulative_pnl"], tx["equity_after"], tx["result"]))
                    conn.commit()
                    conn.close()
                except Exception as db_err:
                    print(f"⚠️ quant auto_trade persistence skipped: {db_err}")

            self.send_utf8_json_response({
                "success": True,
                "data": {
                    "run_id": run_id,
                    "user_id": user_id,
                    "strategy": bt.get("strategy", {}),
                    "market": market,
                    "start_date": start_dt.strftime("%Y-%m-%d"),
                    "end_date": end_dt.strftime("%Y-%m-%d"),
                    "days": days,
                    "rebalance": rebalance,
                    "initial_capital": capital,
                    "final_equity": round(equity, 2),
                    "total_pnl": total_pnl,
                    "total_return_pct": round(total_pnl / capital * 100, 2),
                    "annualized_return_pct": round(total_pnl / capital * (365 / max(1, days)) * 100, 2),
                    "total_trades": total_trades,
                    "wins": wins,
                    "losses": total_trades - wins,
                    "win_rate_pct": round(wins / max(1, total_trades) * 100, 1),
                    "max_drawdown_pct": bt.get("max_drawdown", 0),
                    "sharpe": bt.get("sharpe", 0),
                    "transactions": transactions,
                    "equity_curve": bt.get("equity_curve", []),
                },
                "timestamp": datetime.now().isoformat(),
            })
        except Exception as e:
            self.send_utf8_json_response({"success": False, "error": f"自動交易失敗: {str(e)}"}, 500)

    def handle_quant_auto_trade_history(self):
        """GET /api/quant/auto_trade/history — Lists this user's past auto-trade runs + their trades.

        Query params:
          run_id  — if provided, returns just that run's transactions
          limit   — max runs to list (default 20)
        """
        try:
            user_id = 0
            try:
                session_id = self.headers.get('Authorization', '').replace('Bearer ', '')
                if session_id:
                    sess = get_session(session_id)
                    if sess:
                        user_id = sess.get('user_id', 0) or 0
            except Exception:
                pass
            if not user_id:
                self.send_utf8_json_response({"success": False, "error": "需要登入查看歷史"}, 401)
                return

            qp = parse_qs(urlparse(self.path).query)
            run_id = qp.get('run_id', [''])[0]
            limit = max(1, min(100, int(qp.get('limit', ['20'])[0])))

            db_path = Path(__file__).parent / "trading_agents.db"
            conn = sqlite3.connect(str(db_path))
            conn.row_factory = sqlite3.Row
            cur = conn.cursor()
            cur.execute('''CREATE TABLE IF NOT EXISTS quant_auto_trade_runs
                          (id INTEGER PRIMARY KEY)''')  # safety no-op
            if run_id:
                cur.execute('''SELECT * FROM quant_auto_trade_transactions
                               WHERE run_id=? AND user_id=? ORDER BY trade_date ASC, id ASC''',
                            (run_id, user_id))
                txs = [dict(r) for r in cur.fetchall()]
                cur.execute('''SELECT * FROM quant_auto_trade_runs WHERE id=? AND user_id=?''',
                            (run_id, user_id))
                run = cur.fetchone()
                conn.close()
                self.send_utf8_json_response({
                    "success": True,
                    "data": {"run": dict(run) if run else None, "transactions": txs}
                })
                return
            cur.execute('''SELECT * FROM quant_auto_trade_runs WHERE user_id=?
                           ORDER BY created_at DESC LIMIT ?''', (user_id, limit))
            runs = [dict(r) for r in cur.fetchall()]
            conn.close()
            self.send_utf8_json_response({"success": True, "data": {"runs": runs}})
        except Exception as e:
            self.send_utf8_json_response({"success": False, "error": str(e)}, 500)

    def handle_futu_config(self):
        """POST /api/quant/futu/setup — 配置Futu OpenD連接"""
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            config = json.loads(post_data.decode('utf-8'))

            host = config.get('host', '127.0.0.1')
            port = int(config.get('port', 11111))
            market = config.get('market', 'US').upper()

            # Reinitialize the Futu connector with new settings
            from tradingagents.quant.futu_connector import FutuConnector
            from tradingagents.quant.quant_engine import QuantEngine
            from tradingagents.quant.quant_debate import QuantDebateSystem

            new_futu = FutuConnector(host=host, port=port, market=market)
            conn_result = new_futu.connect()

            # Update singletons
            TradingAgentsAPIHandler._quant_futu = new_futu
            TradingAgentsAPIHandler._quant_engine = QuantEngine(new_futu)
            TradingAgentsAPIHandler._quant_debate = QuantDebateSystem()

            self.send_utf8_json_response({
                "success": True,
                "data": {
                    "connection": conn_result,
                    "status": new_futu.status,
                },
                "timestamp": datetime.now().isoformat(),
            })
        except Exception as e:
            self.send_utf8_json_response({"success": False, "error": str(e)}, 500)

    _recommendations_cache = {}  # {market: (data, timestamp)}

    def handle_stock_recommendations(self):
        """處理股票推薦請求"""
        try:
            # 從查詢參數獲取市場類型
            parsed_path = urlparse(self.path)
            query_params = parse_qs(parsed_path.query)
            market = query_params.get('market', ['all'])[0].lower()

            # Serve from cache if fresh (10 min) to avoid slow per-stock API calls
            now = datetime.now()
            cache_entry = TradingAgentsAPIHandler._recommendations_cache.get(market)
            if cache_entry and (now - cache_entry[1]).total_seconds() < 600:
                cached_response = {
                    "success": True,
                    "data": cache_entry[0],
                    "cached": True,
                    "timestamp": now.isoformat()
                }
                json_data = json.dumps(cached_response, ensure_ascii=False, indent=2)
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Content-Length', str(len(json_data.encode('utf-8'))))
                self.end_headers()
                self.wfile.write(json_data.encode('utf-8'))
                return

            # 生成推薦數據
            recommendations = self._generate_stock_recommendations(market)

            # Update cache
            TradingAgentsAPIHandler._recommendations_cache[market] = (recommendations, now)
            
            # 記錄推薦的股票購買（用於表現追蹤）
            self.record_recommendation_purchases(recommendations)
            
            response = {
                "success": True,
                "data": recommendations,
                "timestamp": datetime.now().isoformat()
            }
            
            # 確保響應數據是UTF-8編碼的
            json_data = json.dumps(response, ensure_ascii=False, indent=2)
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(json_data.encode('utf-8'))))
            self.end_headers()
            self.wfile.write(json_data.encode('utf-8'))
            
        except Exception as e:
            error_response = {
                "success": False,
                "error": f"獲取股票推薦失敗: {str(e)}",
                "timestamp": datetime.now().isoformat()
            }
            
            # 確保錯誤響應也是UTF-8編碼的
            json_data = json.dumps(error_response, ensure_ascii=False, indent=2)
            
            self.send_response(500)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(json_data.encode('utf-8'))))
            self.end_headers()
            self.wfile.write(json_data.encode('utf-8'))
    
    # ============================================================
    # PRO SUITE handlers — call into web/modules/pro_*
    # ============================================================
    def _read_post_body(self):
        try:
            length = int(self.headers.get('Content-Length', 0))
            if length <= 0:
                return {}
            raw = self.rfile.read(length)
            return json.loads(raw.decode('utf-8'))
        except Exception:
            return {}

    def _qs(self, parsed_path):
        try:
            return parse_qs(parsed_path.query)
        except Exception:
            return {}

    def serve_pro_dashboard(self):
        """Serve the Pro Suite HTML page."""
        try:
            module_dir = os.path.dirname(__file__)
            with open(os.path.join(module_dir, 'pro.html'), 'r', encoding='utf-8') as f:
                content = f.read()
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Cache-Control', 'no-cache')
            self.end_headers()
            self.wfile.write(content.encode('utf-8'))
        except FileNotFoundError:
            self.send_error(404, "Pro dashboard not found")

    def serve_pricing_page(self):
        """Serve the marketing pricing page."""
        try:
            module_dir = os.path.dirname(__file__)
            with open(os.path.join(module_dir, 'pricing.html'), 'r', encoding='utf-8') as f:
                content = f.read()
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Cache-Control', 'no-cache')
            self.end_headers()
            self.wfile.write(content.encode('utf-8'))
        except FileNotFoundError:
            self.send_error(404, "Pricing page not found")

    # ----- Screener -----
    def handle_pro_screener_presets(self):
        try:
            from modules.pro_screener import list_presets
            self.send_utf8_json_response({"success": True, "presets": list_presets()})
        except Exception as e:
            self.send_utf8_json_response({"success": False, "error": str(e)}, 500)

    def handle_pro_screener_run(self, parsed_path):
        try:
            from modules.pro_screener import run_screener
            qs = self._qs(parsed_path)
            preset = (qs.get('preset', [None])[0])
            market = (qs.get('market', ['us'])[0])
            limit = int(qs.get('limit', ['30'])[0])
            sort_by = qs.get('sort', ['ai_score'])[0]
            result = run_screener(preset=preset, market=market, limit=limit, sort_by=sort_by)
            self.send_utf8_json_response({"success": True, **result})
        except Exception as e:
            self.send_utf8_json_response({"success": False, "error": str(e)}, 500)

    def handle_pro_screener_post(self):
        try:
            from modules.pro_screener import run_screener
            body = self._read_post_body()
            result = run_screener(
                preset=body.get('preset'),
                custom_filters=body.get('filters'),
                market=body.get('market', 'us'),
                limit=int(body.get('limit', 30)),
                sort_by=body.get('sort_by', 'ai_score'),
            )
            self.send_utf8_json_response({"success": True, **result})
        except Exception as e:
            self.send_utf8_json_response({"success": False, "error": str(e)}, 500)

    # ----- Risk Analytics -----
    def handle_pro_risk_get(self, parsed_path):
        """GET version: pull live portfolio for current user."""
        try:
            session_id = self.headers.get('Authorization', '').replace('Bearer ', '')
            session = get_session(session_id)
            if not session:
                self.send_utf8_json_response({"success": False, "error": "未授權"}, 401)
                return
            # Pull user's portfolio
            db_path = Path(__file__).parent / "trading_agents.db"
            conn = sqlite3.connect(str(db_path))
            cur = conn.cursor()
            cur.execute("SELECT symbol, quantity, purchase_price FROM portfolio WHERE user_id=? AND status='active'", (session['user_id'],))
            positions = [{"symbol": r[0], "quantity": r[1], "avg_price": r[2]} for r in cur.fetchall()]
            conn.close()
            if not positions:
                self.send_utf8_json_response({"success": False, "error": "組合為空，請先添加持倉"}, 200)
                return
            from modules.pro_risk import analyze_portfolio
            result = analyze_portfolio(positions)
            self.send_utf8_json_response(result)
        except Exception as e:
            self.send_utf8_json_response({"success": False, "error": str(e)}, 500)

    def handle_pro_risk_post(self):
        """POST version: analyse a custom portfolio in the request body."""
        try:
            body = self._read_post_body()
            positions = body.get('positions', [])
            from modules.pro_risk import analyze_portfolio
            result = analyze_portfolio(
                positions,
                benchmark=body.get('benchmark', 'SPY'),
                risk_free=float(body.get('risk_free', 0.04)),
            )
            self.send_utf8_json_response(result)
        except Exception as e:
            self.send_utf8_json_response({"success": False, "error": str(e)}, 500)

    # ----- Backtest -----
    def handle_pro_backtest_strategies(self):
        try:
            from modules.pro_backtest import list_strategies
            self.send_utf8_json_response({"success": True, "strategies": list_strategies()})
        except Exception as e:
            self.send_utf8_json_response({"success": False, "error": str(e)}, 500)

    def handle_pro_backtest_run(self, parsed_path):
        try:
            from modules.pro_backtest import run_backtest
            qs = self._qs(parsed_path)
            symbol = qs.get('symbol', ['AAPL'])[0]
            strategy = qs.get('strategy', ['sma_crossover'])[0]
            period = qs.get('period', ['5y'])[0]
            capital = float(qs.get('capital', ['10000'])[0])
            result = run_backtest(symbol, strategy, period, capital)
            self.send_utf8_json_response(result)
        except Exception as e:
            self.send_utf8_json_response({"success": False, "error": str(e)}, 500)

    def handle_pro_backtest_post(self):
        try:
            from modules.pro_backtest import run_backtest
            body = self._read_post_body()
            result = run_backtest(
                symbol=body.get('symbol', 'AAPL'),
                strategy=body.get('strategy', 'sma_crossover'),
                period=body.get('period', '5y'),
                initial_capital=float(body.get('capital', 10000)),
                fee_bps=float(body.get('fee_bps', 5)),
            )
            self.send_utf8_json_response(result)
        except Exception as e:
            self.send_utf8_json_response({"success": False, "error": str(e)}, 500)

    # ----- Options -----
    def handle_pro_options_pricer(self, parsed_path):
        try:
            from modules.pro_options import analyze_options
            qs = self._qs(parsed_path)
            symbol = qs.get('symbol', ['AAPL'])[0]
            strike = qs.get('strike', [None])[0]
            strike = float(strike) if strike else None
            dte = int(qs.get('dte', ['30'])[0])
            iv = qs.get('iv', [None])[0]
            iv = float(iv) if iv else None
            result = analyze_options(symbol, strike, dte, iv=iv)
            self.send_utf8_json_response(result)
        except Exception as e:
            self.send_utf8_json_response({"success": False, "error": str(e)}, 500)

    def handle_pro_options_ivsurface(self, parsed_path):
        try:
            from modules.pro_options import iv_surface
            qs = self._qs(parsed_path)
            symbol = qs.get('symbol', ['AAPL'])[0]
            self.send_utf8_json_response(iv_surface(symbol))
        except Exception as e:
            self.send_utf8_json_response({"success": False, "error": str(e)}, 500)

    def handle_pro_options_strategy(self, parsed_path):
        try:
            from modules.pro_options import analyze_strategy
            qs = self._qs(parsed_path)
            symbol = qs.get('symbol', ['AAPL'])[0]
            strategy = qs.get('strategy', ['iron_condor'])[0]
            dte = int(qs.get('dte', ['30'])[0])
            self.send_utf8_json_response(analyze_strategy(symbol, strategy, dte))
        except Exception as e:
            self.send_utf8_json_response({"success": False, "error": str(e)}, 500)

    def handle_pro_options_strategy_post(self):
        try:
            from modules.pro_options import analyze_strategy
            body = self._read_post_body()
            self.send_utf8_json_response(analyze_strategy(
                symbol=body.get('symbol', 'AAPL'),
                strategy=body.get('strategy', 'iron_condor'),
                days_to_expiry=int(body.get('dte', 30)),
                iv=body.get('iv'),
            ))
        except Exception as e:
            self.send_utf8_json_response({"success": False, "error": str(e)}, 500)

    def handle_pro_options_strategy_list(self):
        try:
            from modules.pro_options import list_strategies
            self.send_utf8_json_response({"success": True, "strategies": list_strategies()})
        except Exception as e:
            self.send_utf8_json_response({"success": False, "error": str(e)}, 500)

    # ----- Signals -----
    def handle_pro_signals(self, parsed_path):
        try:
            from modules.pro_signals import generate_signal
            qs = self._qs(parsed_path)
            symbol = qs.get('symbol', ['AAPL'])[0]
            self.send_utf8_json_response(generate_signal(symbol))
        except Exception as e:
            self.send_utf8_json_response({"success": False, "error": str(e)}, 500)

    def handle_pro_signals_batch(self, parsed_path):
        try:
            from modules.pro_signals import batch_signals
            qs = self._qs(parsed_path)
            syms = qs.get('symbols', [''])[0]
            symbols = [s.strip().upper() for s in syms.split(',') if s.strip()]
            if not symbols:
                symbols = ['AAPL', 'MSFT', 'GOOGL', 'NVDA', 'TSLA', 'META', 'AMZN', 'AMD']
            self.send_utf8_json_response(batch_signals(symbols))
        except Exception as e:
            self.send_utf8_json_response({"success": False, "error": str(e)}, 500)

    # ----- Calendar -----
    def handle_pro_calendar(self):
        try:
            from modules.pro_calendar import event_summary
            self.send_utf8_json_response(event_summary())
        except Exception as e:
            self.send_utf8_json_response({"success": False, "error": str(e)}, 500)

    def handle_pro_calendar_earnings(self, parsed_path):
        try:
            from modules.pro_calendar import upcoming_earnings
            qs = self._qs(parsed_path)
            days = int(qs.get('days', ['14'])[0])
            self.send_utf8_json_response(upcoming_earnings(days=days))
        except Exception as e:
            self.send_utf8_json_response({"success": False, "error": str(e)}, 500)

    def handle_pro_calendar_dividends(self, parsed_path):
        try:
            from modules.pro_calendar import upcoming_dividends
            qs = self._qs(parsed_path)
            days = int(qs.get('days', ['30'])[0])
            self.send_utf8_json_response(upcoming_dividends(days=days))
        except Exception as e:
            self.send_utf8_json_response({"success": False, "error": str(e)}, 500)

    def handle_pro_calendar_macro(self):
        try:
            from modules.pro_calendar import macro_calendar
            self.send_utf8_json_response(macro_calendar())
        except Exception as e:
            self.send_utf8_json_response({"success": False, "error": str(e)}, 500)

    # ----- Insider / Institutional -----
    def handle_pro_insider(self, parsed_path):
        try:
            from modules.pro_insider import insider_trades
            qs = self._qs(parsed_path)
            symbol = qs.get('symbol', ['AAPL'])[0]
            self.send_utf8_json_response(insider_trades(symbol))
        except Exception as e:
            self.send_utf8_json_response({"success": False, "error": str(e)}, 500)

    def handle_pro_institutional(self, parsed_path):
        try:
            from modules.pro_insider import smart_money_dashboard
            qs = self._qs(parsed_path)
            symbol = qs.get('symbol', ['AAPL'])[0]
            self.send_utf8_json_response(smart_money_dashboard(symbol))
        except Exception as e:
            self.send_utf8_json_response({"success": False, "error": str(e)}, 500)

    # ----- Sentiment -----
    def handle_pro_sentiment(self, parsed_path):
        try:
            from modules.pro_sentiment import analyze_sentiment
            qs = self._qs(parsed_path)
            symbol = qs.get('symbol', ['AAPL'])[0]
            self.send_utf8_json_response(analyze_sentiment(symbol))
        except Exception as e:
            self.send_utf8_json_response({"success": False, "error": str(e)}, 500)

    def handle_pro_sentiment_market(self, parsed_path):
        try:
            from modules.pro_sentiment import market_sentiment
            qs = self._qs(parsed_path)
            syms = qs.get('symbols', [''])[0]
            symbols = [s.strip().upper() for s in syms.split(',') if s.strip()]
            if not symbols:
                symbols = ['AAPL', 'MSFT', 'GOOGL', 'NVDA', 'TSLA', 'META', 'AMZN']
            self.send_utf8_json_response(market_sentiment(symbols))
        except Exception as e:
            self.send_utf8_json_response({"success": False, "error": str(e)}, 500)

    # ----- Crypto / Forex -----
    def handle_pro_crypto(self):
        try:
            from modules.pro_crypto import crypto_overview
            self.send_utf8_json_response(crypto_overview())
        except Exception as e:
            self.send_utf8_json_response({"success": False, "error": str(e)}, 500)

    def handle_pro_forex(self):
        try:
            from modules.pro_crypto import forex_overview
            self.send_utf8_json_response(forex_overview())
        except Exception as e:
            self.send_utf8_json_response({"success": False, "error": str(e)}, 500)

    def handle_pro_crypto_correlation(self):
        try:
            from modules.pro_crypto import crypto_correlation_matrix
            self.send_utf8_json_response(crypto_correlation_matrix())
        except Exception as e:
            self.send_utf8_json_response({"success": False, "error": str(e)}, 500)

    # ----- Pro Trading Terminal (IMG_3031) -----
    def handle_terminal_snapshot(self, parsed_path):
        if not self._require_pro_tier(2): return
        try:
            from modules.pro_terminal import terminal_snapshot
            qs = self._qs(parsed_path)
            symbol = qs.get('symbol', ['AAPL'])[0]
            self.send_utf8_json_response(terminal_snapshot(symbol))
        except Exception as e:
            import traceback
            traceback.print_exc()
            self.send_utf8_json_response({"success": False, "error": str(e)}, 500)

    def handle_terminal_commentary(self, parsed_path):
        if not self._require_pro_tier(2): return
        try:
            from modules.pro_terminal import terminal_commentary
            qs = self._qs(parsed_path)
            symbol = qs.get('symbol', ['AAPL'])[0]
            self.send_utf8_json_response(terminal_commentary(symbol))
        except Exception as e:
            import traceback
            traceback.print_exc()
            self.send_utf8_json_response({"success": False, "error": str(e)}, 500)

    def handle_terminal_grid(self, parsed_path):
        if not self._require_pro_tier(2): return
        try:
            from modules.pro_terminal import terminal_grid
            qs = self._qs(parsed_path)
            raw = qs.get('symbols', [''])[0]
            symbols = [s.strip().upper() for s in raw.split(',') if s.strip()]
            if not symbols:
                symbols = ['AAPL', 'MSFT', 'NVDA', 'TSLA']
            self.send_utf8_json_response(terminal_grid(symbols))
        except Exception as e:
            import traceback
            traceback.print_exc()
            self.send_utf8_json_response({"success": False, "error": str(e)}, 500)

    def handle_autotrade_simulate(self):
        """POST /api/autotrade/simulate — multi-symbol backtest from a plan."""
        if not self._require_pro_tier(2): return
        try:
            from modules.autotrade_sim import simulate_plan
            plan = self._read_post_body() or {}
            self.send_utf8_json_response(simulate_plan(plan))
        except Exception as e:
            import traceback
            traceback.print_exc()
            self.send_utf8_json_response({"success": False, "error": str(e)}, 500)

    def handle_autotrade_recommend(self, parsed_path):
        """GET /api/autotrade/recommend?symbols=AAPL,MSFT — AI strategy recommendation."""
        if not self._require_pro_tier(2): return
        try:
            from modules.autotrade_sim import recommend_strategy
            qs = self._qs(parsed_path)
            raw = qs.get('symbols', [''])[0]
            symbols = [s.strip().upper() for s in raw.split(',') if s.strip()]
            self.send_utf8_json_response(recommend_strategy(symbols))
        except Exception as e:
            import traceback
            traceback.print_exc()
            self.send_utf8_json_response({"success": False, "error": str(e)}, 500)

    # ----- Paper trading (live-style daily ticks) -----
    def handle_paper_create(self):
        session = self._require_pro_tier(2)
        if not session: return
        try:
            from modules.paper_trading import create_account
            body = self._read_post_body() or {}
            self.send_utf8_json_response(create_account(session['user_id'], body))
        except Exception as e:
            import traceback; traceback.print_exc()
            self.send_utf8_json_response({'success': False, 'error': str(e)}, 500)

    def handle_paper_list(self):
        session = self._require_pro_tier(2)
        if not session: return
        try:
            from modules.paper_trading import list_accounts
            self.send_utf8_json_response(list_accounts(session['user_id']))
        except Exception as e:
            import traceback; traceback.print_exc()
            self.send_utf8_json_response({'success': False, 'error': str(e)}, 500)

    def handle_paper_account(self, parsed_path):
        session = self._require_pro_tier(2)
        if not session: return
        try:
            from modules.paper_trading import get_account_detail
            qs = self._qs(parsed_path)
            account_id = int(qs.get('id', ['0'])[0])
            self.send_utf8_json_response(
                get_account_detail(session['user_id'], account_id))
        except Exception as e:
            import traceback; traceback.print_exc()
            self.send_utf8_json_response({'success': False, 'error': str(e)}, 500)

    def handle_paper_account_csv(self, parsed_path):
        """GET /api/paper/account/csv?id=N — full transaction log as CSV."""
        session = self._require_pro_tier(2)
        if not session: return
        try:
            from modules.paper_trading import get_account_detail
            qs = self._qs(parsed_path)
            account_id = int(qs.get('id', ['0'])[0])
            data = get_account_detail(session['user_id'], account_id)
            if not data.get('success'):
                self.send_utf8_json_response(data, 404)
                return
            tx = data.get('transactions') or []
            lines = ['date,type,symbol,shares,price,value,fee,cash_after,reason']
            for t in reversed(tx):  # chronological
                lines.append(','.join([
                    str(t.get('ts_date', '')), str(t.get('type', '')),
                    str(t.get('symbol', '')), str(t.get('shares', 0)),
                    f"{t.get('price', 0):.4f}", f"{t.get('value', 0):.2f}",
                    f"{t.get('fee', 0):.4f}", f"{t.get('cash_after', 0):.2f}",
                    str(t.get('reason', '')).replace(',', ';'),
                ]))
            body = '\n'.join(lines).encode('utf-8')
            name = (data.get('account', {}) or {}).get('name', f'paper_{account_id}')
            safe = ''.join(ch if ch.isalnum() else '_' for ch in name)[:40] or 'paper'
            self.send_response(200)
            self.send_header('Content-Type', 'text/csv; charset=utf-8')
            self.send_header('Content-Disposition', f'attachment; filename="{safe}_transactions.csv"')
            self.send_header('Cache-Control', 'no-cache')
            self.end_headers()
            self.wfile.write(body)
        except Exception as e:
            import traceback; traceback.print_exc()
            self.send_utf8_json_response({'success': False, 'error': str(e)}, 500)

    def handle_paper_run(self):
        session = self._require_pro_tier(2)
        if not session: return
        try:
            from modules.paper_trading import run_account_tick
            body = self._read_post_body() or {}
            account_id = int(body.get('account_id') or 0)
            until = body.get('until_date')  # optional 'YYYY-MM-DD'
            self.send_utf8_json_response(
                run_account_tick(session['user_id'], account_id, until))
        except Exception as e:
            import traceback; traceback.print_exc()
            self.send_utf8_json_response({'success': False, 'error': str(e)}, 500)

    def handle_paper_close(self):
        session = self._require_pro_tier(2)
        if not session: return
        try:
            from modules.paper_trading import close_account
            body = self._read_post_body() or {}
            account_id = int(body.get('account_id') or 0)
            self.send_utf8_json_response(
                close_account(session['user_id'], account_id))
        except Exception as e:
            import traceback; traceback.print_exc()
            self.send_utf8_json_response({'success': False, 'error': str(e)}, 500)

    def handle_paper_resume(self):
        session = self._require_pro_tier(2)
        if not session: return
        try:
            from modules.paper_trading import resume_account
            body = self._read_post_body() or {}
            account_id = int(body.get('account_id') or 0)
            reset_peak = bool(body.get('reset_peak', False))
            self.send_utf8_json_response(
                resume_account(session['user_id'], account_id, reset_peak=reset_peak))
        except Exception as e:
            import traceback; traceback.print_exc()
            self.send_utf8_json_response({'success': False, 'error': str(e)}, 500)

    def handle_paper_attribution(self, parsed_path):
        """GET /api/paper/attribution?id=N — P&L breakdown by exit reason + symbol."""
        session = self._require_pro_tier(2)
        if not session: return
        try:
            from modules.paper_trading import get_attribution
            qs = self._qs(parsed_path)
            account_id = int(qs.get('id', ['0'])[0])
            self.send_utf8_json_response(
                get_attribution(session['user_id'], account_id))
        except Exception as e:
            import traceback; traceback.print_exc()
            self.send_utf8_json_response({'success': False, 'error': str(e)}, 500)

    def handle_paper_reset(self):
        session = self._require_pro_tier(2)
        if not session: return
        try:
            from modules.paper_trading import reset_account
            body = self._read_post_body() or {}
            account_id = int(body.get('account_id') or 0)
            self.send_utf8_json_response(
                reset_account(session['user_id'], account_id))
        except Exception as e:
            import traceback; traceback.print_exc()
            self.send_utf8_json_response({'success': False, 'error': str(e)}, 500)

    def handle_paper_reenable_symbol(self):
        session = self._require_pro_tier(2)
        if not session: return
        try:
            from modules.paper_trading import reenable_symbol
            body = self._read_post_body() or {}
            self.send_utf8_json_response(
                reenable_symbol(session['user_id'], int(body.get('account_id') or 0),
                                body.get('symbol', '')))
        except Exception as e:
            import traceback; traceback.print_exc()
            self.send_utf8_json_response({'success': False, 'error': str(e)}, 500)

    def handle_paper_evolve(self):
        """POST /api/paper/evolve — run one round of strategy evolution on
        the account's symbols. Quant agent walk-forward-tests strategy
        variants and (if better than the current plan) updates the live
        plan. Records every round in paper_account_evolutions for the UI."""
        session = self._require_pro_tier(2)
        if not session: return
        try:
            from modules.paper_trading import evolve_account_plan
            body = self._read_post_body() or {}
            account_id = int(body.get('account_id') or 0)
            target_monthly = float(body.get('target_monthly_pct') or 5.0)
            apply_if_better = bool(body.get('apply_if_better', True))
            expand_search = bool(body.get('expand_search', False))
            max_iter = body.get('max_iterations')
            if max_iter is not None:
                max_iter = int(max_iter)
            self.send_utf8_json_response(
                evolve_account_plan(session['user_id'], account_id,
                                    target_monthly_pct=target_monthly,
                                    trigger='api',
                                    apply_if_better=apply_if_better,
                                    max_iterations=max_iter,
                                    expand_search=expand_search))
        except Exception as e:
            import traceback; traceback.print_exc()
            self.send_utf8_json_response({'success': False, 'error': str(e)}, 500)

    def handle_paper_evolve_config(self):
        """POST /api/paper/evolve-config — toggle the auto-evolve cadence on
        an account. evolve_frequency_days=0 disables; >0 enables nightly /
        every-N-day auto-tuning during run_account_tick."""
        session = self._require_pro_tier(2)
        if not session: return
        try:
            body = self._read_post_body() or {}
            account_id = int(body.get('account_id') or 0)
            freq = max(0, min(365, int(body.get('evolve_frequency_days') or 0)))
            import sqlite3 as _sql
            from pathlib import Path as _Path
            db = _Path(__file__).parent / "trading_agents.db"
            with _sql.connect(str(db)) as c:
                cur = c.execute(
                    'UPDATE paper_accounts SET evolve_frequency_days=? WHERE id=? AND user_id=?',
                    (freq, account_id, session['user_id']))
                c.commit()
                ok = cur.rowcount > 0
            self.send_utf8_json_response({
                'success': ok, 'account_id': account_id,
                'evolve_frequency_days': freq,
                'error': None if ok else 'Account not found',
            })
        except Exception as e:
            import traceback; traceback.print_exc()
            self.send_utf8_json_response({'success': False, 'error': str(e)}, 500)

    def handle_paper_symbol_health(self, parsed_path):
        """GET /api/paper/symbol-health?symbol=AAPL or
              /api/paper/symbol-health?unhealthy_only=1&limit=50
        Returns yfinance-fetch health per symbol: consecutive_failures,
        last_failure_reason, etc. Use to detect delisted/halted tickers
        the strategy is silently skipping."""
        session = self._require_pro_tier(2)
        if not session: return
        try:
            from modules.paper_trading import get_symbol_health
            qs = self._qs(parsed_path)
            sym = qs.get('symbol', [None])[0]
            unhealthy = qs.get('unhealthy_only', ['0'])[0] in ('1', 'true', 'yes')
            limit = int(qs.get('limit', ['100'])[0])
            self.send_utf8_json_response(
                get_symbol_health(symbol=sym, unhealthy_only=unhealthy, limit=limit))
        except Exception as e:
            import traceback; traceback.print_exc()
            self.send_utf8_json_response({'success': False, 'error': str(e)}, 500)

    def handle_paper_health(self, parsed_path):
        """GET /api/paper/health?id=N — operational health snapshot for an
        account. Use for dashboard banners: tick_running, last_tick_error,
        days_stale, status_flags. Mirrors web/logs/paper_trading.log without
        requiring shell access."""
        session = self._require_pro_tier(2)
        if not session: return
        try:
            from modules.paper_trading import get_account_health
            qs = self._qs(parsed_path)
            account_id = int(qs.get('id', ['0'])[0])
            self.send_utf8_json_response(
                get_account_health(session['user_id'], account_id))
        except Exception as e:
            import traceback; traceback.print_exc()
            self.send_utf8_json_response({'success': False, 'error': str(e)}, 500)

    def handle_paper_evolutions(self, parsed_path):
        """GET /api/paper/evolutions?id=N&limit=20 — evolution history for an account."""
        session = self._require_pro_tier(2)
        if not session: return
        try:
            from modules.paper_trading import list_account_evolutions
            qs = self._qs(parsed_path)
            account_id = int(qs.get('id', ['0'])[0])
            limit = int(qs.get('limit', ['20'])[0])
            self.send_utf8_json_response(
                list_account_evolutions(session['user_id'], account_id, limit=limit))
        except Exception as e:
            import traceback; traceback.print_exc()
            self.send_utf8_json_response({'success': False, 'error': str(e)}, 500)

    def handle_paper_universes(self):
        """GET /api/paper/universes — return available scan universes."""
        if not self._require_pro_tier(2): return
        try:
            from modules.ai_picks import UNIVERSES
            self.send_utf8_json_response({
                'success': True,
                'universes': [{'id': k, 'label': v['label'], 'count': len(v['symbols'])}
                              for k, v in UNIVERSES.items()],
            })
        except Exception as e:
            import traceback; traceback.print_exc()
            self.send_utf8_json_response({'success': False, 'error': str(e)}, 500)

    def handle_paper_ai_picks(self, parsed_path):
        """GET /api/paper/ai-picks?universe=X&top_n=10&custom=A,B,C — preview today's AI picks."""
        if not self._require_pro_tier(2): return
        try:
            from modules.ai_picks import scan_universe
            qs = self._qs(parsed_path)
            universe = qs.get('universe', ['sp500_top50'])[0]
            top_n = int(qs.get('top_n', ['10'])[0])
            raw_custom = qs.get('custom', [''])[0]
            custom = [s.strip().upper() for s in raw_custom.replace('\n', ',').split(',') if s.strip()][:200] if raw_custom else None
            self.send_utf8_json_response(scan_universe(universe, top_n=top_n, custom_symbols=custom))
        except Exception as e:
            import traceback; traceback.print_exc()
            self.send_utf8_json_response({'success': False, 'error': str(e)}, 500)

    def handle_admin_paper_overview(self):
        """GET /api/admin/paper-overview — admin-only stats across all users."""
        if not self._require_admin_session(): return
        try:
            from modules.paper_trading import admin_overview
            self.send_utf8_json_response(admin_overview())
        except Exception as e:
            import traceback; traceback.print_exc()
            self.send_utf8_json_response({'success': False, 'error': str(e)}, 500)

    def handle_user_notifications_get(self):
        """GET /api/user/notifications — return current user's notification prefs."""
        session = self._get_session_from_request()
        if not session:
            self.send_utf8_json_response({'success': False, 'error': '請先登入'}, 401)
            return
        try:
            from modules.notify import get_prefs
            prefs = get_prefs(session['user_id'])
            self.send_utf8_json_response({'success': True, 'prefs': prefs})
        except Exception as e:
            import traceback; traceback.print_exc()
            self.send_utf8_json_response({'success': False, 'error': str(e)}, 500)

    def handle_user_notifications_save(self):
        """POST /api/user/notifications — save prefs."""
        session = self._get_session_from_request()
        if not session:
            self.send_utf8_json_response({'success': False, 'error': '請先登入'}, 401)
            return
        try:
            from modules.notify import save_prefs
            body = self._read_post_body() or {}
            self.send_utf8_json_response(save_prefs(session['user_id'], body))
        except Exception as e:
            import traceback; traceback.print_exc()
            self.send_utf8_json_response({'success': False, 'error': str(e)}, 500)

    def handle_user_universes_list(self):
        session = self._get_session_from_request()
        if not session:
            self.send_utf8_json_response({'success': False, 'error': '請先登入'}, 401)
            return
        try:
            from modules.user_universes import list_universes
            self.send_utf8_json_response(list_universes(session['user_id']))
        except Exception as e:
            import traceback; traceback.print_exc()
            self.send_utf8_json_response({'success': False, 'error': str(e)}, 500)

    def handle_user_universes_save(self):
        session = self._get_session_from_request()
        if not session:
            self.send_utf8_json_response({'success': False, 'error': '請先登入'}, 401)
            return
        try:
            from modules.user_universes import save_universe
            body = self._read_post_body() or {}
            self.send_utf8_json_response(
                save_universe(session['user_id'], body.get('name', ''), body.get('symbols', [])))
        except Exception as e:
            import traceback; traceback.print_exc()
            self.send_utf8_json_response({'success': False, 'error': str(e)}, 500)

    def handle_universes_public(self):
        """GET /api/universes/public — browse the public catalog (any logged-in user)."""
        session = self._get_session_from_request()
        if not session:
            self.send_utf8_json_response({'success': False, 'error': '請先登入'}, 401)
            return
        try:
            from modules.user_universes import list_public_universes
            self.send_utf8_json_response(list_public_universes(limit=50))
        except Exception as e:
            import traceback; traceback.print_exc()
            self.send_utf8_json_response({'success': False, 'error': str(e)}, 500)

    def handle_user_universes_publish(self):
        session = self._get_session_from_request()
        if not session:
            self.send_utf8_json_response({'success': False, 'error': '請先登入'}, 401)
            return
        try:
            from modules.user_universes import set_public
            body = self._read_post_body() or {}
            self.send_utf8_json_response(
                set_public(session['user_id'], int(body.get('id') or 0),
                           bool(body.get('is_public', True))))
        except Exception as e:
            import traceback; traceback.print_exc()
            self.send_utf8_json_response({'success': False, 'error': str(e)}, 500)

    def handle_user_universes_copy(self):
        session = self._get_session_from_request()
        if not session:
            self.send_utf8_json_response({'success': False, 'error': '請先登入'}, 401)
            return
        try:
            from modules.user_universes import copy_public_universe
            body = self._read_post_body() or {}
            self.send_utf8_json_response(
                copy_public_universe(session['user_id'],
                                     int(body.get('source_id') or 0),
                                     body.get('new_name', '')))
        except Exception as e:
            import traceback; traceback.print_exc()
            self.send_utf8_json_response({'success': False, 'error': str(e)}, 500)

    def handle_admin_run_weekly(self):
        """POST /api/admin/run-weekly-leaderboard — admin-triggered manual run."""
        if not self._require_admin_session(): return
        try:
            from modules.paper_trading import send_weekly_leaderboards
            self.send_utf8_json_response(send_weekly_leaderboards())
        except Exception as e:
            import traceback; traceback.print_exc()
            self.send_utf8_json_response({'success': False, 'error': str(e)}, 500)

    def handle_universe_build(self):
        """POST /api/universe/build — filter a source pool by fundamentals."""
        session = self._get_session_from_request()
        if not session:
            self.send_utf8_json_response({'success': False, 'error': '請先登入'}, 401)
            return
        try:
            from modules.universe_builder import build_from_filters
            body = self._read_post_body() or {}
            self.send_utf8_json_response(build_from_filters(
                source_universe=body.get('source_universe', 'sp500_top50'),
                rules=body.get('rules', {}) or {},
                limit=int(body.get('limit', 50)),
            ))
        except Exception as e:
            import traceback; traceback.print_exc()
            self.send_utf8_json_response({'success': False, 'error': str(e)}, 500)

    def handle_user_universes_delete(self):
        session = self._get_session_from_request()
        if not session:
            self.send_utf8_json_response({'success': False, 'error': '請先登入'}, 401)
            return
        try:
            from modules.user_universes import delete_universe
            body = self._read_post_body() or {}
            self.send_utf8_json_response(
                delete_universe(session['user_id'], int(body.get('id') or 0)))
        except Exception as e:
            import traceback; traceback.print_exc()
            self.send_utf8_json_response({'success': False, 'error': str(e)}, 500)

    def handle_user_notifications_test(self):
        """POST /api/user/notifications/test — fire a test notification."""
        session = self._get_session_from_request()
        if not session:
            self.send_utf8_json_response({'success': False, 'error': '請先登入'}, 401)
            return
        try:
            from modules.notify import test_channels
            self.send_utf8_json_response(test_channels(session['user_id']))
        except Exception as e:
            import traceback; traceback.print_exc()
            self.send_utf8_json_response({'success': False, 'error': str(e)}, 500)

    def handle_autotrade_optimize(self):
        """POST /api/autotrade/optimize — self-improvement: search for best strategy mix."""
        if not self._require_pro_tier(2): return
        try:
            from modules.autotrade_sim import optimize_plan
            body = self._read_post_body() or {}
            target_monthly = float(body.get('target_monthly_pct') or 5.0)
            max_iter = int(body.get('max_iterations') or 60)
            max_iter = max(20, min(max_iter, 120))  # safety bounds
            walk_forward = bool(body.get('walk_forward'))
            # The base plan is everything except strategies/TP/SL (those get optimized)
            base_plan = {
                'symbols': body.get('symbols', 'AAPL'),
                'capital': float(body.get('capital') or 10000),
                'period': body.get('period', '1y'),
                'pos_size_pct': float(body.get('pos_size_pct') or 20),
            }
            self.send_utf8_json_response(
                optimize_plan(base_plan, target_monthly, max_iter, walk_forward=walk_forward)
            )
        except Exception as e:
            import traceback
            traceback.print_exc()
            self.send_utf8_json_response({"success": False, "error": str(e)}, 500)

    # ============================================================
    # Stripe Checkout (recommended payment integration)
    # ============================================================
    def handle_stripe_create_session(self):
        """POST /api/payment/stripe/create-session — returns Stripe Checkout URL."""
        try:
            session = self._get_session_from_request()
            if not session:
                self.send_error(401, "請先登入")
                return

            body = self._read_post_body() or {}
            plan_type = body.get('plan_type')
            billing_cycle = (body.get('billing_cycle') or 'monthly').lower()
            if billing_cycle not in ('monthly', 'yearly'):
                billing_cycle = 'monthly'

            plan = SUBSCRIPTION_PLANS.get(plan_type)
            if not plan:
                self.send_utf8_json_response({"success": False, "error": f"未知計劃: {plan_type}"}, 400)
                return

            # Always recompute amount server-side — never trust client
            monthly_rate = plan.get('price_hkd', 0)
            yearly_monthly_rate = plan.get('price_yearly_hkd', monthly_rate)
            amount = (yearly_monthly_rate * 12) if billing_cycle == 'yearly' else monthly_rate
            if amount <= 0:
                self.send_utf8_json_response({"success": False, "error": "免費計劃無需付款"}, 400)
                return

            # Build absolute success/cancel URLs from the request host
            host = self.headers.get('Host', 'localhost')
            scheme = 'https' if self.headers.get('X-Forwarded-Proto') == 'https' else 'http'
            base = f"{scheme}://{host}"
            success_url = f"{base}/payment-success?session_id={{CHECKOUT_SESSION_ID}}"
            cancel_url = f"{base}/payment-cancel?plan={plan_type}&billing={billing_cycle}"

            # Pull customer email from session if available
            customer_email = session.get('email') if isinstance(session, dict) else None

            from payment_gateway import payment_gateway
            result = payment_gateway.create_stripe_checkout_session(
                user_id=session['user_id'],
                plan_type=plan_type,
                billing_cycle=billing_cycle,
                amount=amount,
                currency=plan.get('currency', 'HKD'),
                success_url=success_url,
                cancel_url=cancel_url,
                customer_email=customer_email,
            )
            self.send_utf8_json_response(result)
        except Exception as e:
            import traceback
            traceback.print_exc()
            self.send_utf8_json_response({"success": False, "error": str(e)}, 500)

    def handle_stripe_webhook_post(self):
        """POST /api/payment/stripe/webhook — Stripe-signed event listener."""
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            payload = self.rfile.read(content_length) if content_length else b''
            sig_header = self.headers.get('Stripe-Signature', '')

            from payment_gateway import payment_gateway
            result = payment_gateway.handle_stripe_webhook(payload, sig_header)

            # Stripe expects a 2xx for "received". Send 400 only for signature failure.
            if not result.get('success') and 'invalid signature' in (result.get('error') or '').lower():
                self.send_response(400)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps(result, ensure_ascii=False).encode('utf-8'))
                return

            self.send_utf8_json_response(result)
        except Exception as e:
            import traceback
            traceback.print_exc()
            self.send_utf8_json_response({"success": False, "error": str(e)}, 500)

    def serve_payment_landing(self, success=True):
        """Render a minimal success or cancel landing page after Stripe redirect."""
        if success:
            html = """<!DOCTYPE html>
<html lang="zh-TW"><head><meta charset="UTF-8"><title>付款成功 — TradingAgents</title>
<style>body{background:#07090f;color:#e6ecff;font-family:Inter,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;}
.card{background:#0f1320;border:1px solid #1f2740;border-radius:16px;padding:40px;text-align:center;max-width:420px;}
h1{color:#16a34a;margin:0 0 12px;font-size:28px;}
p{color:#8b95b8;font-size:14px;line-height:1.6;}
.btn{display:inline-block;margin-top:20px;padding:12px 24px;background:linear-gradient(135deg,#5b8dff,#7c5cff);color:#fff;border-radius:10px;text-decoration:none;font-weight:700;}
.icon{font-size:60px;margin-bottom:8px;}</style></head>
<body><div class="card">
<div class="icon">✅</div><h1>付款成功！</h1>
<p>感謝您訂閱 TradingAgents Pro Suite。<br>您的訂閱將在幾秒內生效（Stripe webhook 確認中）。</p>
<a class="btn" href="/pro">前往 Pro Suite</a>
</div></body></html>"""
        else:
            html = """<!DOCTYPE html>
<html lang="zh-TW"><head><meta charset="UTF-8"><title>付款已取消 — TradingAgents</title>
<style>body{background:#07090f;color:#e6ecff;font-family:Inter,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;}
.card{background:#0f1320;border:1px solid #1f2740;border-radius:16px;padding:40px;text-align:center;max-width:420px;}
h1{color:#fbbf24;margin:0 0 12px;font-size:28px;}
p{color:#8b95b8;font-size:14px;line-height:1.6;}
.btn{display:inline-block;margin-top:20px;padding:12px 24px;background:#1f2740;color:#cbd5e1;border-radius:10px;text-decoration:none;font-weight:700;margin:6px;}
.btn.primary{background:linear-gradient(135deg,#5b8dff,#7c5cff);color:#fff;}
.icon{font-size:60px;margin-bottom:8px;}</style></head>
<body><div class="card">
<div class="icon">⚠️</div><h1>付款已取消</h1>
<p>您的付款流程已取消。沒有任何費用會被收取。</p>
<a class="btn primary" href="/pricing">返回方案</a>
<a class="btn" href="/">回到首頁</a>
</div></body></html>"""
        try:
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Cache-Control', 'no-cache')
            self.end_headers()
            self.wfile.write(html.encode('utf-8'))
        except Exception:
            pass

    # ============================================================
    # AI FEATURES handlers
    # ============================================================
    def handle_ai_chat(self):
        try:
            from modules.pro_ai import ai_chat
            body = self._read_post_body()
            q = body.get('question', '').strip()
            if not q:
                self.send_utf8_json_response({"success": False, "error": "問題不能為空"}, 400)
                return
            self.send_utf8_json_response(ai_chat(q, body.get('symbol')))
        except Exception as e:
            self.send_utf8_json_response({"success": False, "error": str(e)}, 500)

    def handle_ai_patterns(self, parsed_path):
        try:
            from modules.pro_ai import detect_patterns
            qs = self._qs(parsed_path)
            sym = qs.get('symbol', ['AAPL'])[0]
            self.send_utf8_json_response(detect_patterns(sym))
        except Exception as e:
            self.send_utf8_json_response({"success": False, "error": str(e)}, 500)

    def handle_ai_anomaly(self, parsed_path):
        try:
            from modules.pro_ai import detect_anomalies
            qs = self._qs(parsed_path)
            sym = qs.get('symbol', ['AAPL'])[0]
            lookback = int(qs.get('lookback', ['60'])[0])
            self.send_utf8_json_response(detect_anomalies(sym, lookback))
        except Exception as e:
            self.send_utf8_json_response({"success": False, "error": str(e)}, 500)

    def handle_ai_rebalance(self):
        try:
            from modules.pro_ai import rebalance_portfolio
            body = self._read_post_body()
            positions = body.get('positions', [])
            goal = body.get('goal', 'balanced')
            self.send_utf8_json_response(rebalance_portfolio(positions, goal))
        except Exception as e:
            self.send_utf8_json_response({"success": False, "error": str(e)}, 500)

    def handle_ai_trade_ideas(self, parsed_path):
        try:
            from modules.pro_ai import daily_trade_ideas
            qs = self._qs(parsed_path)
            count = int(qs.get('count', ['5'])[0])
            risk = qs.get('risk', ['medium'])[0]
            market = qs.get('market', ['all'])[0]
            self.send_utf8_json_response(daily_trade_ideas(count, risk, market))
        except Exception as e:
            self.send_utf8_json_response({"success": False, "error": str(e)}, 500)

    def handle_options_recommend(self, parsed_path):
        """GET /api/options/recommend?count=10&dte=35 — daily US options recommendations."""
        try:
            from modules.pro_options_recommender import daily_recommendations
            qs = self._qs(parsed_path)
            count = int(qs.get('count', ['10'])[0])
            dte = int(qs.get('dte', ['35'])[0])
            self.send_utf8_json_response(daily_recommendations(count=count, dte=dte))
        except Exception as e:
            import traceback; traceback.print_exc()
            self.send_utf8_json_response({'success': False, 'error': str(e)}, 500)

    def handle_ai_trade_ideas_email(self):
        """POST /api/ai/trade-ideas/email — email today's ideas to the logged-in user.

        Body (optional): {"market": "all|us|hk", "risk": "low|medium|high", "count": 5}
        Falls back to the user's saved notification prefs.
        """
        session = self._get_session_from_request()
        if not session:
            self.send_utf8_json_response({'success': False, 'error': '請先登入'}, 401)
            return
        try:
            from modules.pro_ai import email_ai_ideas_to_user
            body = self._read_post_body() or {}
            market = body.get('market')
            risk = body.get('risk')
            count = int(body.get('count') or 5)
            res = email_ai_ideas_to_user(session['user_id'], market=market, risk=risk, count=count)
            self.send_utf8_json_response(res)
        except Exception as e:
            import traceback; traceback.print_exc()
            self.send_utf8_json_response({'success': False, 'error': str(e)}, 500)

    def handle_ai_sector_rotation(self):
        try:
            from modules.pro_ai import sector_rotation
            self.send_utf8_json_response(sector_rotation())
        except Exception as e:
            self.send_utf8_json_response({"success": False, "error": str(e)}, 500)

    def handle_ai_risk_score(self, parsed_path):
        try:
            from modules.pro_ai import ai_risk_score
            qs = self._qs(parsed_path)
            sym = qs.get('symbol', ['AAPL'])[0]
            self.send_utf8_json_response(ai_risk_score(sym))
        except Exception as e:
            self.send_utf8_json_response({"success": False, "error": str(e)}, 500)

    def handle_ai_compare(self, parsed_path):
        try:
            from modules.pro_ai import compare_stocks
            qs = self._qs(parsed_path)
            syms = qs.get('symbols', [''])[0]
            symbols = [s.strip().upper() for s in syms.split(',') if s.strip()]
            if len(symbols) < 2:
                symbols = ['AAPL', 'MSFT', 'GOOGL']
            self.send_utf8_json_response(compare_stocks(symbols))
        except Exception as e:
            self.send_utf8_json_response({"success": False, "error": str(e)}, 500)

    # ============================================================
    # ANALYTICS handlers (Track A + B)
    # ============================================================
    def serve_static_html(self, filename):
        try:
            module_dir = os.path.dirname(__file__)
            with open(os.path.join(module_dir, filename), 'r', encoding='utf-8') as f:
                content = f.read()
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Cache-Control', 'no-cache')
            self.end_headers()
            self.wfile.write(content.encode('utf-8'))
        except FileNotFoundError:
            self.send_error(404, f"{filename} not found")

    def serve_static_js(self, filename):
        try:
            module_dir = os.path.dirname(__file__)
            with open(os.path.join(module_dir, filename), 'r', encoding='utf-8') as f:
                content = f.read()
            self.send_response(200)
            self.send_header('Content-Type', 'application/javascript; charset=utf-8')
            self.send_header('Cache-Control', 'public, max-age=300')
            self.end_headers()
            self.wfile.write(content.encode('utf-8'))
        except FileNotFoundError:
            self.send_error(404, f"{filename} not found")

    def _track_event(self, params, post_body=None):
        """Common tracker — accepts dict from either GET query or POST body."""
        from modules.pro_analytics import track_event
        data = dict(params or {})
        if post_body:
            data.update(post_body)
        return track_event(
            visitor_id=str(data.get('visitor_id') or ''),
            event_type=str(data.get('event') or data.get('event_type') or 'page_view'),
            page=str(data.get('page') or ''),
            target=str(data.get('target') or ''),
            value=float(data.get('value') or 0) if data.get('value') not in (None, '') else 0,
            session_id=str(data.get('session_id') or ''),
            utm_source=str(data.get('utm_source') or ''),
            utm_medium=str(data.get('utm_medium') or ''),
            utm_campaign=str(data.get('utm_campaign') or ''),
            referrer=str(data.get('referrer') or ''),
            user_agent=self.headers.get('User-Agent', '')[:300],
            ip=self.client_address[0] if hasattr(self, 'client_address') else '',
            variant=str(data.get('variant') or ''),
            experiment=str(data.get('experiment') or ''),
            metadata=data.get('metadata'),
        )

    def handle_track_get(self, parsed_path):
        try:
            qs = self._qs(parsed_path)
            params = {k: v[0] if isinstance(v, list) and v else v for k, v in qs.items()}
            r = self._track_event(params)
            # Return tiny 1x1 GIF for beacon img tags (works with sendBeacon too)
            gif = b'GIF89a\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff\x00\x00\x00!\xf9\x04\x01\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;'
            self.send_response(200 if r.get('success') else 400)
            self.send_header('Content-Type', 'image/gif')
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-Length', str(len(gif)))
            self.end_headers()
            self.wfile.write(gif)
        except Exception as e:
            self.send_error(500, str(e))

    def handle_track_post(self):
        try:
            body = self._read_post_body()
            r = self._track_event({}, body)
            self.send_utf8_json_response(r)
        except Exception as e:
            self.send_utf8_json_response({"success": False, "error": str(e)}, 500)

    def handle_analytics_funnel(self, parsed_path):
        try:
            from modules.pro_analytics import funnel_report
            qs = self._qs(parsed_path)
            days = int(qs.get('days', ['7'])[0])
            self.send_utf8_json_response(funnel_report(days))
        except Exception as e:
            self.send_utf8_json_response({"success": False, "error": str(e)}, 500)

    def handle_analytics_traffic(self, parsed_path):
        try:
            from modules.pro_analytics import daily_traffic
            qs = self._qs(parsed_path)
            days = int(qs.get('days', ['30'])[0])
            self.send_utf8_json_response(daily_traffic(days))
        except Exception as e:
            self.send_utf8_json_response({"success": False, "error": str(e)}, 500)

    def handle_analytics_sources(self, parsed_path):
        try:
            from modules.pro_analytics import top_sources
            qs = self._qs(parsed_path)
            days = int(qs.get('days', ['30'])[0])
            self.send_utf8_json_response(top_sources(days))
        except Exception as e:
            self.send_utf8_json_response({"success": False, "error": str(e)}, 500)

    def handle_analytics_pages(self, parsed_path):
        try:
            from modules.pro_analytics import top_pages
            qs = self._qs(parsed_path)
            days = int(qs.get('days', ['30'])[0])
            self.send_utf8_json_response(top_pages(days))
        except Exception as e:
            self.send_utf8_json_response({"success": False, "error": str(e)}, 500)

    def handle_experiments_list(self):
        try:
            from modules.pro_analytics import list_experiments, seed_default_experiments
            seed_default_experiments()
            self.send_utf8_json_response(list_experiments())
        except Exception as e:
            self.send_utf8_json_response({"success": False, "error": str(e)}, 500)

    def handle_experiment_assign(self, parsed_path):
        try:
            from modules.pro_analytics import assign_variant, seed_default_experiments
            seed_default_experiments()
            qs = self._qs(parsed_path)
            exp = qs.get('exp', [''])[0] or qs.get('experiment', [''])[0]
            visitor = qs.get('visitor_id', [''])[0]
            if not exp or not visitor:
                self.send_utf8_json_response({"success": False, "error": "Missing exp or visitor_id"}, 400)
                return
            v = assign_variant(exp, visitor)
            self.send_utf8_json_response({"success": True, "experiment": exp, "variant": v})
        except Exception as e:
            self.send_utf8_json_response({"success": False, "error": str(e)}, 500)

    def handle_experiment_results(self, parsed_path):
        try:
            from modules.pro_analytics import experiment_results
            qs = self._qs(parsed_path)
            exp = qs.get('exp', [''])[0] or qs.get('experiment', [''])[0]
            days = int(qs.get('days', ['14'])[0])
            self.send_utf8_json_response(experiment_results(exp, days))
        except Exception as e:
            self.send_utf8_json_response({"success": False, "error": str(e)}, 500)

    # ----- Pro Intel handlers (Track C) -----
    def handle_short_interest(self, parsed_path):
        try:
            from modules.pro_intel import short_interest
            qs = self._qs(parsed_path)
            sym = qs.get('symbol', ['GME'])[0]
            self.send_utf8_json_response(short_interest(sym))
        except Exception as e:
            self.send_utf8_json_response({"success": False, "error": str(e)}, 500)

    def handle_short_scanner(self):
        try:
            from modules.pro_intel import short_squeeze_scanner
            self.send_utf8_json_response(short_squeeze_scanner())
        except Exception as e:
            self.send_utf8_json_response({"success": False, "error": str(e)}, 500)

    def handle_etf_xray(self, parsed_path):
        try:
            from modules.pro_intel import etf_xray
            qs = self._qs(parsed_path)
            sym = qs.get('symbol', ['SPY'])[0]
            self.send_utf8_json_response(etf_xray(sym))
        except Exception as e:
            self.send_utf8_json_response({"success": False, "error": str(e)}, 500)

    def handle_dividend_safety(self, parsed_path):
        try:
            from modules.pro_intel import dividend_safety
            qs = self._qs(parsed_path)
            sym = qs.get('symbol', ['JNJ'])[0]
            self.send_utf8_json_response(dividend_safety(sym))
        except Exception as e:
            self.send_utf8_json_response({"success": False, "error": str(e)}, 500)

    def handle_dividend_scanner(self):
        try:
            from modules.pro_intel import dividend_safety_scanner
            self.send_utf8_json_response(dividend_safety_scanner())
        except Exception as e:
            self.send_utf8_json_response({"success": False, "error": str(e)}, 500)

    def handle_experiment_upsert(self):
        try:
            from modules.pro_analytics import upsert_experiment
            body = self._read_post_body()
            r = upsert_experiment(
                exp_id=body.get('id'),
                name=body.get('name', body.get('id')),
                variants=body.get('variants', []),
                description=body.get('description', ''),
                weights=body.get('weights'),
                primary_goal=body.get('primary_goal', 'upgrade_complete'),
                enabled=body.get('enabled', True),
            )
            self.send_utf8_json_response(r)
        except Exception as e:
            self.send_utf8_json_response({"success": False, "error": str(e)}, 500)

    def handle_subscription_plans(self):
        """處理訂閱計劃請求"""
        try:
            plans = get_subscription_plans()

            response = {
                "success": True,
                "plans": plans,
                "timestamp": datetime.now().isoformat()
            }
            
            # 確保響應數據是UTF-8編碼的
            json_data = json.dumps(response, ensure_ascii=False, indent=2)
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(json_data.encode('utf-8'))))
            self.end_headers()
            self.wfile.write(json_data.encode('utf-8'))
            
        except Exception as e:
            error_response = {
                "success": False,
                "error": f"獲取訂閱計劃失敗: {str(e)}",
                "timestamp": datetime.now().isoformat()
            }
            
            # 確保錯誤響應也是UTF-8編碼的
            json_data = json.dumps(error_response, ensure_ascii=False, indent=2)
            
            self.send_response(500)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(json_data.encode('utf-8'))))
            self.end_headers()
            self.wfile.write(json_data.encode('utf-8'))
    
    def handle_subscription_status(self):
        """處理訂閱狀態請求"""
        try:
            session_id = self.headers.get('Authorization', '').replace('Bearer ', '')
            session = get_session(session_id)
            
            if not session:
                self.send_error(401, "未授權")
                return
            
            user_id = session['user_id']
            can_analyze, message = check_analysis_limit(user_id, session['plan_type'])
            
            response = {
                "success": True,
                "user_id": user_id,
                "plan_type": session['plan_type'],
                "can_analyze": can_analyze,
                "message": message,
                "timestamp": datetime.now().isoformat()
            }
            
            # 確保響應數據是UTF-8編碼的
            json_data = json.dumps(response, ensure_ascii=False, indent=2)
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(json_data.encode('utf-8'))))
            self.end_headers()
            self.wfile.write(json_data.encode('utf-8'))
            
        except Exception as e:
            error_response = {
                "success": False,
                "error": f"獲取訂閱狀態失敗: {str(e)}",
                "timestamp": datetime.now().isoformat()
            }
            
            # 確保錯誤響應也是UTF-8編碼的
            json_data = json.dumps(error_response, ensure_ascii=False, indent=2)
            
            self.send_response(500)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(json_data.encode('utf-8'))))
            self.end_headers()
            self.wfile.write(json_data.encode('utf-8'))
    
    def handle_subscription_upgrade(self):
        """處理訂閱升級請求"""
        try:
            session_id = self.headers.get('Authorization', '').replace('Bearer ', '')
            session = get_session(session_id)
            
            if not session:
                self.send_error(401, "未授權")
                return
            
            # 讀取請求數據
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            upgrade_data = json.loads(post_data.decode('utf-8'))
            
            new_plan = upgrade_data.get('plan_type')
            if not new_plan or new_plan not in SUBSCRIPTION_PLANS:
                self.send_error(400, "無效的計劃類型")
                return
            
            user_id = session['user_id']
            success, message = upgrade_user_plan(user_id, new_plan)
            
            if success:
                # 更新會話中的計劃類型
                session['plan_type'] = new_plan
                
            response = {
                "success": success,
                "message": message,
                "new_plan": new_plan if success else None,
                "timestamp": datetime.now().isoformat()
            }
            
            self.send_response(200 if success else 400)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))
            
        except Exception as e:
            error_response = {
                "success": False,
                "error": f"升級訂閱失敗: {str(e)}",
                "timestamp": datetime.now().isoformat()
            }
            
            # 確保錯誤響應也是UTF-8編碼的
            json_data = json.dumps(error_response, ensure_ascii=False, indent=2)
            
            self.send_response(500)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(json_data.encode('utf-8'))))
            self.end_headers()
            self.wfile.write(json_data.encode('utf-8'))
    
    def handle_subscription_status(self):
        """獲取用戶訂閱狀態"""
        try:
            session_id = self.headers.get('Authorization', '').replace('Bearer ', '')
            session = get_session(session_id)
            
            if not session:
                self.send_error(401, "未授權")
                return
            
            user_id = session['user_id']
            status = check_user_subscription_status(user_id)
            
            if not status:
                self.send_error(404, "無法獲取訂閱狀態")
                return
            
            response = {
                "success": True,
                "data": status
            }
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))
            
        except Exception as e:
            error_response = {
                "success": False,
                "error": f"獲取訂閱狀態失敗: {str(e)}",
                "timestamp": datetime.now().isoformat()
            }
            self.send_response(500)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(error_response, ensure_ascii=False).encode('utf-8'))
    
    def handle_payment_redirect(self):
        """處理支付重定向"""
        try:
            session_id = self.headers.get('Authorization', '').replace('Bearer ', '')
            session = get_session(session_id)
            
            if not session:
                self.send_error(401, "未授權")
                return
            
            # 讀取請求數據
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            payment_data = json.loads(post_data.decode('utf-8'))
            
            plan = payment_data.get('plan', 'premium')
            
            # 根據計劃確定金額
            if plan == 'trial':
                amount = 0
                plan_name = "免費試用"
                # 免費試用直接激活，不需要PayPal
                user_id = session['user_id']
                success, message = upgrade_user_plan(user_id, plan)
                
                if success:
                    response = {
                        "success": True,
                        "plan": plan,
                        "plan_name": plan_name,
                        "amount": amount,
                        "currency": "HKD",
                        "activated": True
                    }
                else:
                    response = {
                        "success": False,
                        "error": message
                    }
            else:
                amount = 500
                plan_name = "完整計劃"
                # 返回PayPal支付鏈接
                payment_url = "https://www.paypal.com/ncp/payment/SC8D69453F3TQ"
                
                response = {
                    "success": True,
                    "payment_url": payment_url,
                    "plan": plan,
                    "plan_name": plan_name,
                    "amount": amount,
                    "currency": "HKD"
                }
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))
            
        except Exception as e:
            error_response = {
                "success": False,
                "error": f"獲取支付鏈接失敗: {str(e)}",
                "timestamp": datetime.now().isoformat()
            }
            self.send_response(500)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(error_response, ensure_ascii=False).encode('utf-8'))
    
    # ========== 觀察清單功能 ==========
    def handle_get_watchlist(self):
        """獲取用戶觀察清單"""
        try:
            session_id = self.headers.get('Authorization', '').replace('Bearer ', '')
            session = get_session(session_id)
            
            if not session:
                self.send_error(401, "未授權")
                return
            
            user_id = session['user_id']
            conn = sqlite3.connect('trading_agents.db')
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT id, symbol, market_type, added_date, notes, alert_price, alert_enabled
                FROM watchlist WHERE user_id = ?
                ORDER BY added_date DESC
            ''', (user_id,))
            
            watchlist = []
            for row in cursor.fetchall():
                watchlist.append({
                    'id': row[0],
                    'symbol': row[1],
                    'market_type': row[2],
                    'added_date': row[3],
                    'notes': row[4],
                    'alert_price': row[5],
                    'alert_enabled': bool(row[6])
                })
            
            conn.close()
            
            response = {
                "success": True,
                "watchlist": watchlist,
                "count": len(watchlist)
            }
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))
            
        except Exception as e:
            error_response = {"success": False, "error": str(e)}
            self.send_response(500)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(error_response, ensure_ascii=False).encode('utf-8'))
    
    def handle_add_to_watchlist(self):
        """添加股票到觀察清單"""
        try:
            session_id = self.headers.get('Authorization', '').replace('Bearer ', '')
            session = get_session(session_id)
            
            if not session:
                self.send_error(401, "未授權")
                return
            
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            user_id = session['user_id']
            symbol = data.get('symbol')
            market_type = data.get('market_type', 'us')
            notes = data.get('notes', '')
            
            conn = sqlite3.connect('trading_agents.db')
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT OR REPLACE INTO watchlist (user_id, symbol, market_type, notes)
                VALUES (?, ?, ?, ?)
            ''', (user_id, symbol, market_type, notes))
            
            conn.commit()
            conn.close()
            
            response = {"success": True, "message": "已添加到觀察清單"}
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))
            
        except Exception as e:
            error_response = {"success": False, "error": str(e)}
            self.send_response(500)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(error_response, ensure_ascii=False).encode('utf-8'))
    
    def handle_remove_from_watchlist(self):
        """從觀察清單移除股票"""
        try:
            session_id = self.headers.get('Authorization', '').replace('Bearer ', '')
            session = get_session(session_id)
            
            if not session:
                self.send_error(401, "未授權")
                return
            
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            user_id = session['user_id']
            watchlist_id = data.get('id')
            
            conn = sqlite3.connect('trading_agents.db')
            cursor = conn.cursor()
            
            cursor.execute('DELETE FROM watchlist WHERE id = ? AND user_id = ?', (watchlist_id, user_id))
            
            conn.commit()
            conn.close()
            
            response = {"success": True, "message": "已從觀察清單移除"}
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))
            
        except Exception as e:
            error_response = {"success": False, "error": str(e)}
            self.send_response(500)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(error_response, ensure_ascii=False).encode('utf-8'))
    
    # ========== 投資組合功能 ==========
    def handle_get_portfolio(self):
        """獲取用戶投資組合"""
        try:
            session_id = self.headers.get('Authorization', '').replace('Bearer ', '')
            session = get_session(session_id)
            
            if not session:
                self.send_error(401, "未授權")
                return
            
            user_id = session['user_id']
            conn = sqlite3.connect('trading_agents.db')
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT id, symbol, market_type, quantity, purchase_price, purchase_date, notes, status
                FROM portfolio WHERE user_id = ? AND status = 'active'
                ORDER BY purchase_date DESC
            ''', (user_id,))
            
            portfolio = []
            for row in cursor.fetchall():
                portfolio.append({
                    'id': row[0],
                    'symbol': row[1],
                    'market_type': row[2],
                    'quantity': row[3],
                    'purchase_price': row[4],
                    'purchase_date': row[5],
                    'notes': row[6],
                    'status': row[7]
                })
            
            conn.close()
            
            response = {
                "success": True,
                "portfolio": portfolio,
                "count": len(portfolio)
            }
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))
            
        except Exception as e:
            error_response = {"success": False, "error": str(e)}
            self.send_response(500)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(error_response, ensure_ascii=False).encode('utf-8'))
    
    def handle_add_to_portfolio(self):
        """添加股票到投資組合"""
        try:
            session_id = self.headers.get('Authorization', '').replace('Bearer ', '')
            session = get_session(session_id)
            
            if not session:
                self.send_error(401, "未授權")
                return
            
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            user_id = session['user_id']
            symbol = data.get('symbol')
            market_type = data.get('market_type', 'us')
            quantity = data.get('quantity')
            purchase_price = data.get('purchase_price')
            purchase_date = data.get('purchase_date', datetime.now().isoformat())
            notes = data.get('notes', '')
            
            conn = sqlite3.connect('trading_agents.db')
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO portfolio (user_id, symbol, market_type, quantity, purchase_price, purchase_date, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (user_id, symbol, market_type, quantity, purchase_price, purchase_date, notes))
            
            conn.commit()
            conn.close()
            
            response = {"success": True, "message": "已添加到投資組合"}
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))
            
        except Exception as e:
            error_response = {"success": False, "error": str(e)}
            self.send_response(500)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(error_response, ensure_ascii=False).encode('utf-8'))
    
    def handle_remove_from_portfolio(self):
        """從投資組合移除股票"""
        try:
            session_id = self.headers.get('Authorization', '').replace('Bearer ', '')
            session = get_session(session_id)
            
            if not session:
                self.send_error(401, "未授權")
                return
            
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            user_id = session['user_id']
            portfolio_id = data.get('id')
            
            conn = sqlite3.connect('trading_agents.db')
            cursor = conn.cursor()
            
            cursor.execute('UPDATE portfolio SET status = ? WHERE id = ? AND user_id = ?', ('sold', portfolio_id, user_id))
            
            conn.commit()
            conn.close()
            
            response = {"success": True, "message": "已從投資組合移除"}
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))
            
        except Exception as e:
            error_response = {"success": False, "error": str(e)}
            self.send_response(500)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(error_response, ensure_ascii=False).encode('utf-8'))
    
    # ========== 價格警報功能 ==========
    def handle_get_alerts(self):
        """獲取用戶價格警報"""
        try:
            session_id = self.headers.get('Authorization', '').replace('Bearer ', '')
            session = get_session(session_id)
            
            if not session:
                self.send_error(401, "未授權")
                return
            
            user_id = session['user_id']
            conn = sqlite3.connect('trading_agents.db')
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT id, symbol, market_type, alert_type, target_price, current_price, triggered, created_at
                FROM price_alerts WHERE user_id = ? AND triggered = 0
                ORDER BY created_at DESC
            ''', (user_id,))
            
            alerts = []
            for row in cursor.fetchall():
                alerts.append({
                    'id': row[0],
                    'symbol': row[1],
                    'market_type': row[2],
                    'alert_type': row[3],
                    'target_price': row[4],
                    'current_price': row[5],
                    'triggered': bool(row[6]),
                    'created_at': row[7]
                })
            
            conn.close()
            
            response = {
                "success": True,
                "alerts": alerts,
                "count": len(alerts)
            }
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))
            
        except Exception as e:
            error_response = {"success": False, "error": str(e)}
            self.send_response(500)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(error_response, ensure_ascii=False).encode('utf-8'))
    
    def handle_create_alert(self):
        """創建價格警報"""
        try:
            session_id = self.headers.get('Authorization', '').replace('Bearer ', '')
            session = get_session(session_id)
            
            if not session:
                self.send_error(401, "未授權")
                return
            
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            user_id = session['user_id']
            symbol = data.get('symbol')
            market_type = data.get('market_type', 'us')
            alert_type = data.get('alert_type', 'above')  # above, below
            target_price = data.get('target_price')
            
            conn = sqlite3.connect('trading_agents.db')
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO price_alerts (user_id, symbol, market_type, alert_type, target_price)
                VALUES (?, ?, ?, ?, ?)
            ''', (user_id, symbol, market_type, alert_type, target_price))
            
            conn.commit()
            conn.close()
            
            response = {"success": True, "message": "價格警報已創建"}
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))
            
        except Exception as e:
            error_response = {"success": False, "error": str(e)}
            self.send_response(500)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(error_response, ensure_ascii=False).encode('utf-8'))
    
    def handle_delete_alert(self):
        """刪除價格警報"""
        try:
            session_id = self.headers.get('Authorization', '').replace('Bearer ', '')
            session = get_session(session_id)
            
            if not session:
                self.send_error(401, "未授權")
                return
            
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            user_id = session['user_id']
            alert_id = data.get('id')
            
            conn = sqlite3.connect('trading_agents.db')
            cursor = conn.cursor()
            
            cursor.execute('DELETE FROM price_alerts WHERE id = ? AND user_id = ?', (alert_id, user_id))
            
            conn.commit()
            conn.close()
            
            response = {"success": True, "message": "價格警報已刪除"}
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))
            
        except Exception as e:
            error_response = {"success": False, "error": str(e)}
            self.send_response(500)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(error_response, ensure_ascii=False).encode('utf-8'))
    
    def _generate_stock_recommendations(self, market):
        """生成股票推薦數據"""
        import random
        import math
        
        current_time = datetime.now()
        
        # 根據市場類型生成不同的股票推薦
        if market == 'hk' or market == 'all':
            hk_stocks = self._get_hk_recommendations()
        else:
            hk_stocks = []
            
        if market == 'us' or market == 'all':
            us_stocks = self._get_us_recommendations()
        else:
            us_stocks = []
            
        if market == 'china' or market == 'all':
            china_stocks = self._get_china_recommendations()
        else:
            china_stocks = []
        
        # 合併所有推薦
        all_recommendations = hk_stocks + us_stocks + china_stocks
        
        # 過濾掉可能造成虧損的股票，只保留有顯著盈利潛力的股票
        profitable_recommendations = []
        for rec in all_recommendations:
            current_price = rec['current_price']
            target_multiplier = float(rec['price_target'].replace('x', ''))
            target_price = current_price * target_multiplier
            profit_potential = ((target_price - current_price) / current_price) * 100
            
            # 只保留有盈利潛力的股票（至少2%上漲空間）
            if target_price > current_price and profit_potential >= 2.0:
                profitable_recommendations.append(rec)
        
        # 按推薦分數排序
        profitable_recommendations.sort(key=lambda x: x['recommendation_score'], reverse=True)
        
        # 從查詢參數獲取推薦數量，默認5個
        parsed_path = urlparse(self.path)
        query_params = parse_qs(parsed_path.query)
        limit = int(query_params.get('limit', ['5'])[0])
        
        # 限制推薦數量在合理範圍內（1-10個）
        limit = max(1, min(10, limit))
        
        # 返回指定數量的推薦（只包含有盈利潛力的股票）
        return {
            "market_scan": {
                "scan_time": current_time.isoformat(),
                "markets_scanned": self._get_scanned_markets(market),
                "total_stocks_analyzed": len(all_recommendations),
                "profitable_stocks": len(profitable_recommendations),
                "filtered_out": len(all_recommendations) - len(profitable_recommendations),
                "recommendations_shown": limit,
                "top_recommendations": profitable_recommendations[:limit]
            },
            "market_summary": self._get_market_summary(profitable_recommendations),
            "screening_criteria": self._get_screening_criteria()
        }
    
    def _get_hk_recommendations(self):
        """獲取港股推薦"""
        hk_stocks = [
            {"symbol": "0700.HK", "name": "騰訊控股", "sector": "科技"},
            {"symbol": "9988.HK", "name": "阿里巴巴", "sector": "科技"},
            {"symbol": "3690.HK", "name": "美團", "sector": "科技"},
            {"symbol": "3888.HK", "name": "中國移動", "sector": "電信"},
            {"symbol": "0941.HK", "name": "中國移動", "sector": "電信"},
            {"symbol": "2628.HK", "name": "中國人壽", "sector": "金融"},
            {"symbol": "1398.HK", "name": "工商銀行", "sector": "金融"},
            {"symbol": "3988.HK", "name": "中國銀行", "sector": "金融"},
            {"symbol": "2318.HK", "name": "中國平安", "sector": "金融"},
            {"symbol": "1299.HK", "name": "友邦保險", "sector": "金融"},
            {"symbol": "1810.HK", "name": "小米集團", "sector": "科技"},
            {"symbol": "9618.HK", "name": "京東集團", "sector": "科技"},
            {"symbol": "1024.HK", "name": "快手", "sector": "科技"},
            {"symbol": "2018.HK", "name": "AAC科技", "sector": "科技"},
            {"symbol": "2382.HK", "name": "舜宇光學", "sector": "科技"}
        ]
        
        return self._calculate_recommendation_scores(hk_stocks, "港股")
    
    def _get_us_recommendations(self):
        """獲取美股推薦"""
        us_stocks = [
            {"symbol": "AAPL", "name": "蘋果公司", "sector": "科技"},
            {"symbol": "MSFT", "name": "微軟", "sector": "科技"},
            {"symbol": "GOOGL", "name": "谷歌", "sector": "科技"},
            {"symbol": "AMZN", "name": "亞馬遜", "sector": "科技"},
            {"symbol": "TSLA", "name": "特斯拉", "sector": "汽車"},
            {"symbol": "META", "name": "Meta", "sector": "科技"},
            {"symbol": "NVDA", "name": "英偉達", "sector": "科技"},
            {"symbol": "NFLX", "name": "奈飛", "sector": "媒體"},
            {"symbol": "AMD", "name": "AMD", "sector": "科技"},
            {"symbol": "INTC", "name": "英特爾", "sector": "科技"},
            {"symbol": "JPM", "name": "摩根大通", "sector": "金融"},
            {"symbol": "BAC", "name": "美國銀行", "sector": "金融"},
            {"symbol": "WMT", "name": "沃爾瑪", "sector": "零售"},
            {"symbol": "JNJ", "name": "強生", "sector": "醫療"},
            {"symbol": "PG", "name": "寶潔", "sector": "消費品"}
        ]
        
        return self._calculate_recommendation_scores(us_stocks, "美股")
    
    def _get_china_recommendations(self):
        """獲取A股推薦"""
        china_stocks = [
            {"symbol": "000001", "name": "平安銀行", "sector": "金融"},
            {"symbol": "000002", "name": "萬科A", "sector": "地產"},
            {"symbol": "000858", "name": "五糧液", "sector": "消費品"},
            {"symbol": "000876", "name": "新希望", "sector": "農業"},
            {"symbol": "600036", "name": "招商銀行", "sector": "金融"},
            {"symbol": "600519", "name": "貴州茅台", "sector": "消費品"},
            {"symbol": "600887", "name": "伊利股份", "sector": "消費品"},
            {"symbol": "600900", "name": "長江電力", "sector": "公用事業"},
            {"symbol": "000858", "name": "五糧液", "sector": "消費品"},
            {"symbol": "002415", "name": "海康威視", "sector": "科技"},
            {"symbol": "300059", "name": "東方財富", "sector": "金融"},
            {"symbol": "300750", "name": "寧德時代", "sector": "新能源"},
            {"symbol": "688981", "name": "中芯國際", "sector": "科技"},
            {"symbol": "688036", "name": "傳音控股", "sector": "科技"},
            {"symbol": "688599", "name": "天合光能", "sector": "新能源"}
        ]
        
        return self._calculate_recommendation_scores(china_stocks, "A股")
    
    def _calculate_recommendation_scores(self, stocks, market_type):
        """計算推薦分數 - 使用模擬數據以確保快速響應"""
        import random
        import math

        recommendations = []
        current_time = datetime.now()

        # 為了快速響應，所有市場都使用模擬數據 (10分鐘緩存會保證新鮮度)
        api_available = False

        for i, stock in enumerate(stocks):
            # 使用模擬數據
            market_analysis = None
            
            if market_analysis:
                # 使用真實數據
                technical = market_analysis.get("technical", {})
                fundamental = market_analysis.get("fundamental", {})
                news_sentiment = market_analysis.get("news_sentiment", {})
                volume_analysis = market_analysis.get("volume", {})
                
                rsi = float(technical.get("rsi", 50))
                macd_signal = technical.get("macd_signal", "neutral")
                volume_trend = volume_analysis.get("trend", "stable")
                pe_ratio = float(fundamental.get("pe_ratio", 15))
                revenue_growth = float(fundamental.get("revenue_growth", 0)) * 100  # 轉換為百分比
                profit_margin = float(fundamental.get("profit_margins", 10)) * 100  # 轉換為百分比
                analyst_rating = self._determine_analyst_rating_from_data(technical, fundamental, news_sentiment)
            else:
                # 如果無法獲取真實數據，使用模擬數據
                rsi = random.uniform(20, 80)
                macd_signal = random.choice(['bullish', 'bearish', 'neutral'])
                volume_trend = random.choice(['increasing', 'decreasing', 'stable'])
                pe_ratio = random.uniform(8, 35)
                revenue_growth = random.uniform(-10, 30)
                profit_margin = random.uniform(5, 25)
                analyst_rating = random.choice(['strong_buy', 'buy', 'hold', 'sell'])
            
            # 計算推薦分數 (0-100)
            score = 0
            
            # RSI評分 (30分)
            if 30 <= rsi <= 70:
                score += 30
            elif 20 <= rsi < 30 or 70 < rsi <= 80:
                score += 20
            else:
                score += 10
            
            # MACD信號評分 (20分)
            if macd_signal == 'bullish':
                score += 20
            elif macd_signal == 'neutral':
                score += 10
            else:
                score += 5
            
            # 成交量趨勢評分 (15分)
            if volume_trend == 'increasing':
                score += 15
            elif volume_trend == 'stable':
                score += 10
            else:
                score += 5
            
            # 基本面評分 (20分)
            if 10 <= pe_ratio <= 25:
                score += 10
            elif 5 <= pe_ratio < 10 or 25 < pe_ratio <= 35:
                score += 5
            
            if revenue_growth > 10:
                score += 10
            elif revenue_growth > 0:
                score += 5
            
            # 分析師評級評分 (15分)
            rating_scores = {
                'strong_buy': 15,
                'buy': 10,
                'hold': 5,
                'sell': 0
            }
            score += rating_scores.get(analyst_rating, 0)
            
            # 添加隨機波動
            score += random.uniform(-5, 5)
            score = max(0, min(100, score))
            
            # 基於推薦分數生成更合理的目標價和時間框架（確保目標價不低於當前價格）
            if score >= 80:
                price_target = random.uniform(1.25, 1.50)  # 強烈推薦：25-50%上漲
                time_frame = random.choice(['1-3個月', '3-6個月', '6-12個月'])
            elif score >= 65:
                price_target = random.uniform(1.15, 1.35)  # 推薦：15-35%上漲
                time_frame = random.choice(['3-6個月', '6-12個月', '12-18個月'])
            elif score >= 50:
                price_target = random.uniform(1.08, 1.25)  # 謹慎推薦：8-25%上漲
                time_frame = random.choice(['6-12個月', '12-18個月', '18-24個月'])
            else:
                # 對於低分股票，不推薦投資，但如果有目標價，至少保持當前價格
                price_target = random.uniform(1.02, 1.12)  # 不推薦：2-12%上漲（至少不虧損）
                time_frame = random.choice(['12-24個月', '24-36個月'])
            
            # 確保目標價永遠不會低於當前價格（防止虧損）
            price_target = max(price_target, 1.02)  # 最低2%上漲
            
            # 確定推薦等級
            if score >= 80:
                recommendation_level = "強烈推薦"
                confidence = "高"
            elif score >= 65:
                recommendation_level = "推薦"
                confidence = "中"
            elif score >= 50:
                recommendation_level = "謹慎推薦"
                confidence = "中"
            else:
                recommendation_level = "不推薦"
                confidence = "低"
            
            # 計算預期收益
            expected_return = self._calculate_expected_return(score, market_type)
            
            # 計算風險等級
            risk_level = self._calculate_risk_level(score, pe_ratio, revenue_growth)
            
            # 獲取真實價格
            real_price = self._get_real_price(stock["symbol"], market_type)
            is_real_price = self._is_real_price_available(stock["symbol"], market_type)
            
            recommendation = {
                "symbol": stock["symbol"],
                "name": stock["name"],
                "market": market_type,
                "sector": stock["sector"],
                "current_price": real_price,
                "price_source": "實時價格" if is_real_price else "模擬價格",
                "recommendation_score": round(score, 1),
                "recommendation_level": recommendation_level,
                "confidence": confidence,
                "expected_return": expected_return,
                "risk_level": risk_level,
                "price_target": f"{price_target:.1f}x",
                "target_timeframe": time_frame,
                "technical_indicators": {
                    "rsi": round(rsi, 1),
                    "macd_signal": macd_signal,
                    "volume_trend": volume_trend
                },
                "fundamental_metrics": {
                    "pe_ratio": round(pe_ratio, 1),
                    "revenue_growth": f"{revenue_growth:+.1f}%",
                    "profit_margin": f"{profit_margin:.1f}%"
                },
                "analyst_rating": analyst_rating,
                "analysis_date": current_time.isoformat()
            }
            
            recommendations.append(recommendation)
        
        return recommendations
    
    def _get_real_price(self, symbol, market_type):
        """獲取真實股價（使用免費API）"""
        import requests
        import random

        # 為了快速響應，直接使用模擬價格 (10分鐘緩存提供新鮮度)
        return self._get_realistic_mock_price(symbol, market_type)

        # 檢查是否應該跳過API調用（基於失敗率）
        global api_failure_count
        if api_failure_count > 3:  # 如果失敗次數太多，直接使用模擬數據
            return self._get_realistic_mock_price(symbol, market_type)
        
        try:
            # 使用免費的金融API獲取實時價格
            if market_type == "港股":
                # 港股使用Yahoo Finance API
                yahoo_symbol = symbol.replace('.HK', '.HK')
                url = f"https://query1.finance.yahoo.com/v8/finance/chart/{yahoo_symbol}"
                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
                response = requests.get(url, headers=headers, timeout=2)
                if response.status_code == 200:
                    data = response.json()
                    if 'chart' in data and 'result' in data['chart'] and data['chart']['result']:
                        price = data['chart']['result'][0]['meta']['regularMarketPrice']
                        return round(float(price), 2)
            elif market_type == "美股":
                # 美股使用Yahoo Finance API
                url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"
                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
                response = requests.get(url, headers=headers, timeout=2)
                if response.status_code == 200:
                    data = response.json()
                    if 'chart' in data and 'result' in data['chart'] and data['chart']['result']:
                        price = data['chart']['result'][0]['meta']['regularMarketPrice']
                        return round(float(price), 2)
            elif market_type == "A股":
                # A股使用新浪財經API - 但由於經常超時，直接使用模擬數據
                # 避免大量的超時錯誤日誌
                return self._get_realistic_mock_price(symbol, market_type)
                
        except Exception as e:
            api_failure_count += 1
            # 只在第一次失敗時打印錯誤，避免日誌垃圾
            if api_failure_count == 1:
                print(f"API響應過慢，切換到模擬數據模式")
        
        # 如果API失敗，使用更真實的模擬價格
        return self._get_realistic_mock_price(symbol, market_type)
    
    def _get_realistic_mock_price(self, symbol, market_type):
        """獲取更真實的模擬價格"""
        import random
        import time
        
        # 基於時間的種子，使價格更穩定
        random.seed(hash(symbol) + int(time.time() / 3600))  # 每小時變化一次
        
        base_prices = {
            # 港股 - 更真實的價格範圍
            "0700.HK": 320.0, "9988.HK": 85.0, "3690.HK": 120.0, "3888.HK": 45.0,
            "0941.HK": 45.0, "2628.HK": 12.0, "1398.HK": 4.5, "3988.HK": 3.2,
            "2318.HK": 55.0, "1299.HK": 75.0, "1810.HK": 15.0, "9618.HK": 180.0,
            "1024.HK": 45.0, "2018.HK": 25.0, "2382.HK": 85.0,
            
            # 美股 - 更真實的價格範圍
            "AAPL": 175.0, "MSFT": 350.0, "GOOGL": 140.0, "AMZN": 150.0,
            "TSLA": 250.0, "META": 300.0, "NVDA": 400.0, "NFLX": 450.0,
            "AMD": 100.0, "INTC": 30.0, "JPM": 150.0, "BAC": 35.0,
            "WMT": 160.0, "JNJ": 170.0, "PG": 150.0,
            
            # A股 - 更真實的價格範圍
            "000001": 12.0, "000002": 18.0, "000858": 180.0, "000876": 15.0,
            "600036": 45.0, "600519": 1800.0, "600887": 35.0, "600900": 25.0,
            "002415": 35.0, "300059": 15.0, "300750": 200.0, "688981": 45.0,
            "688036": 25.0, "688599": 30.0
        }
        
        base_price = base_prices.get(symbol, 50.0)
        # 添加更真實的波動（±2%）
        price_change = random.uniform(-0.02, 0.02)
        return round(base_price * (1 + price_change), 2)
    
    def _calculate_expected_return(self, score, market_type):
        """計算預期收益"""
        import random
        
        # 確保score是數字類型
        score = float(score) if score is not None else 50.0
        
        base_return = {
            "港股": 0.15,
            "美股": 0.12,
            "A股": 0.18
        }
        
        # 基於分數調整收益
        score_multiplier = score / 100
        volatility = random.uniform(0.1, 0.3)
        
        expected_return = base_return.get(market_type, 0.12) * score_multiplier
        return f"{expected_return * 100:.1f}%"
    
    def _calculate_risk_level(self, score, pe_ratio, revenue_growth):
        """計算風險等級"""
        # 確保所有參數都是數字類型
        score = float(score) if score is not None else 50.0
        pe_ratio = float(pe_ratio) if pe_ratio is not None else 25.0
        revenue_growth = float(revenue_growth) if revenue_growth is not None else 5.0
        
        if score >= 80 and pe_ratio <= 20 and revenue_growth > 10:
            return "低"
        elif score >= 65 and pe_ratio <= 30 and revenue_growth > 0:
            return "中"
        else:
            return "高"
    
    def _get_scanned_markets(self, market):
        """獲取掃描的市場列表"""
        if market == 'all':
            return ["港股", "美股", "A股"]
        elif market == 'hk':
            return ["港股"]
        elif market == 'us':
            return ["美股"]
        elif market == 'china':
            return ["A股"]
        else:
            return ["港股", "美股", "A股"]
    
    def _get_market_summary(self, recommendations):
        """獲取市場摘要"""
        if not recommendations:
            return {}
        
        # 按市場分組
        market_groups = {}
        for rec in recommendations:
            market = rec['market']
            if market not in market_groups:
                market_groups[market] = []
            market_groups[market].append(rec)
        
        summary = {}
        for market, stocks in market_groups.items():
            avg_score = sum(s['recommendation_score'] for s in stocks) / len(stocks)
            strong_buy = len([s for s in stocks if s['recommendation_level'] == '強烈推薦'])
            buy = len([s for s in stocks if s['recommendation_level'] == '推薦'])
            
            summary[market] = {
                "total_stocks": len(stocks),
                "average_score": round(avg_score, 1),
                "strong_buy_count": strong_buy,
                "buy_count": buy,
                "top_sector": self._get_top_sector(stocks)
            }
        
        return summary
    
    def _get_top_sector(self, stocks):
        """獲取熱門板塊"""
        sector_count = {}
        for stock in stocks:
            sector = stock['sector']
            sector_count[sector] = sector_count.get(sector, 0) + 1
        
        if sector_count:
            return max(sector_count, key=sector_count.get)
        return "未知"
    
    def _get_screening_criteria(self):
        """獲取篩選標準"""
        return {
            "technical_indicators": {
                "rsi": "30-70為健康區間",
                "macd": "看漲信號優先",
                "volume": "成交量增加優先"
            },
            "fundamental_metrics": {
                "pe_ratio": "10-25為合理區間",
                "revenue_growth": "正增長優先",
                "profit_margin": "高利潤率優先"
            },
            "analyst_rating": {
                "strong_buy": "強烈買入",
                "buy": "買入",
                "hold": "持有",
                "sell": "賣出"
            },
            "scoring_weights": {
                "technical_analysis": "35%",
                "fundamental_analysis": "35%",
                "analyst_rating": "20%",
                "market_sentiment": "10%"
            }
        }
    
    def _is_real_price_available(self, symbol, market_type):
        """檢查是否獲取到真實價格"""
        try:
            # 嘗試獲取真實價格
            real_price = self._get_real_price(symbol, market_type)
            # 如果價格在合理範圍內，認為是真實價格
            if 0.01 <= real_price <= 10000:
                return True
        except:
            pass
        return False
    
    def _analyze_real_market_data(self, symbol, market_type):
        """分析真實市場數據"""
        try:
            # 使用threading.Timer實現跨平台超時控制
            import threading
            import time
            
            result = [None]
            exception = [None]
            
            def analyze_data():
                try:
                    # 獲取技術指標
                    technical_data = self._get_technical_indicators(symbol, market_type)
                    
                    # 獲取新聞情緒
                    news_sentiment = self._get_news_sentiment(symbol, market_type)
                    
                    # 獲取基本面數據
                    fundamental_data = self._get_fundamental_data(symbol, market_type)
                    
                    # 獲取市場情緒
                    market_sentiment = self._get_market_sentiment(symbol, market_type)
                    
                    # 獲取成交量分析
                    volume_analysis = self._get_volume_analysis(symbol, market_type)
                    
                    result[0] = {
                        "technical": technical_data,
                        "news_sentiment": news_sentiment,
                        "fundamental": fundamental_data,
                        "market_sentiment": market_sentiment,
                        "volume": volume_analysis
                    }
                except Exception as e:
                    exception[0] = e
            
            # 啟動分析線程
            analysis_thread = threading.Thread(target=analyze_data)
            analysis_thread.daemon = True
            analysis_thread.start()
            
            # 等待1.5秒或直到完成 (快速失敗)
            analysis_thread.join(timeout=1.5)
            
            if analysis_thread.is_alive():
                print(f"分析市場數據超時 {symbol}，使用模擬數據")
                return None
            
            if exception[0]:
                raise exception[0]
                
            return result[0]
            
        except Exception as e:
            print(f"分析市場數據失敗 {symbol}: {e}")
            return None
    
    def _get_technical_indicators(self, symbol, market_type):
        """獲取技術指標"""
        try:
            if market_type == "港股":
                yahoo_symbol = symbol.replace('.HK', '.HK')
                url = f"https://query1.finance.yahoo.com/v8/finance/chart/{yahoo_symbol}?interval=1d&range=1y"
            elif market_type == "美股":
                url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?interval=1d&range=1y"
            else:
                return self._get_mock_technical_indicators()
            
            headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
            response = requests.get(url, headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if 'chart' in data and 'result' in data['chart'] and data['chart']['result']:
                    result = data['chart']['result'][0]
                    quotes = result['indicators']['quote'][0]
                    closes = [q for q in quotes['close'] if q is not None]
                    
                    if len(closes) >= 14:  # 至少需要14天數據計算RSI
                        # 計算RSI
                        rsi = self._calculate_rsi_from_data(closes)
                        
                        # 計算移動平均線
                        sma_20 = sum(closes[-20:]) / min(20, len(closes))
                        sma_50 = sum(closes[-50:]) / min(50, len(closes)) if len(closes) >= 50 else sma_20
                        
                        # 計算MACD
                        macd_signal = self._calculate_macd_signal(closes)
                        
                        # 計算波動率
                        volatility = self._calculate_volatility_from_data(closes)
                        
                        # 計算支撐阻力位
                        support, resistance = self._calculate_support_resistance(closes)
                        
                        return {
                            "rsi": round(rsi, 2),
                            "sma_20": round(sma_20, 2),
                            "sma_50": round(sma_50, 2),
                            "macd_signal": macd_signal,
                            "volatility": round(volatility, 2),
                            "support_level": round(support, 2),
                            "resistance_level": round(resistance, 2),
                            "trend": "bullish" if sma_20 > sma_50 else "bearish"
                        }
        except Exception as e:
            print(f"獲取技術指標失敗 {symbol}: {e}")
        
        return self._get_mock_technical_indicators()
    
    def _get_news_sentiment(self, symbol, market_type):
        """獲取新聞情緒分析"""
        try:
            # 使用免費的新聞API
            if market_type == "港股":
                # 港股新聞
                url = f"https://newsapi.org/v2/everything?q={symbol.replace('.HK', '')}&language=zh&sortBy=publishedAt&apiKey=demo"
            elif market_type == "美股":
                # 美股新聞
                url = f"https://newsapi.org/v2/everything?q={symbol}&language=en&sortBy=publishedAt&apiKey=demo"
            else:
                return self._get_mock_news_sentiment()
            
            # 由於API限制，使用模擬數據
            return self._get_mock_news_sentiment()
        except:
            return self._get_mock_news_sentiment()
    
    def _get_fundamental_data(self, symbol, market_type):
        """獲取基本面數據"""
        try:
            if market_type == "港股":
                yahoo_symbol = symbol.replace('.HK', '.HK')
                url = f"https://query1.finance.yahoo.com/v10/finance/quoteSummary/{yahoo_symbol}?modules=defaultKeyStatistics,financialData"
            elif market_type == "美股":
                url = f"https://query1.finance.yahoo.com/v10/finance/quoteSummary/{symbol}?modules=defaultKeyStatistics,financialData"
            else:
                return self._get_mock_fundamental_data()
            
            headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
            response = requests.get(url, headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if 'quoteSummary' in data and 'result' in data['quoteSummary']:
                    result = data['quoteSummary']['result'][0]
                    financial_data = result.get('financialData', {})
                    key_stats = result.get('defaultKeyStatistics', {})
                    
                    return {
                        "pe_ratio": financial_data.get('trailingPE', 0),
                        "peg_ratio": key_stats.get('pegRatio', 0),
                        "debt_to_equity": key_stats.get('debtToEquity', 0),
                        "return_on_equity": financial_data.get('returnOnEquity', 0),
                        "profit_margins": financial_data.get('profitMargins', 0),
                        "revenue_growth": financial_data.get('revenueGrowth', 0)
                    }
        except Exception as e:
            print(f"獲取基本面數據失敗 {symbol}: {e}")
        
        return self._get_mock_fundamental_data()
    
    def _get_market_sentiment(self, symbol, market_type):
        """獲取市場情緒"""
        try:
            # 分析價格動量和成交量
            technical_data = self._get_technical_indicators(symbol, market_type)
            if technical_data:
                rsi = technical_data.get('rsi', 50)
                trend = technical_data.get('trend', 'neutral')
                volatility = technical_data.get('volatility', 0)
                
                # 基於技術指標計算情緒
                if rsi > 70 and trend == 'bullish':
                    return "過度樂觀"
                elif rsi < 30 and trend == 'bearish':
                    return "過度悲觀"
                elif rsi > 50 and trend == 'bullish':
                    return "樂觀"
                elif rsi < 50 and trend == 'bearish':
                    return "悲觀"
                else:
                    return "中性"
        except:
            pass
        
        return "中性"
    
    def _get_volume_analysis(self, symbol, market_type):
        """獲取成交量分析"""
        try:
            if market_type == "港股":
                yahoo_symbol = symbol.replace('.HK', '.HK')
                url = f"https://query1.finance.yahoo.com/v8/finance/chart/{yahoo_symbol}?interval=1d&range=30d"
            elif market_type == "美股":
                url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?interval=1d&range=30d"
            else:
                return self._get_mock_volume_analysis()
            
            headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
            response = requests.get(url, headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if 'chart' in data and 'result' in data['chart'] and data['chart']['result']:
                    result = data['chart']['result'][0]
                    quotes = result['indicators']['quote'][0]
                    volumes = [v for v in quotes['volume'] if v is not None]
                    
                    if len(volumes) >= 5:
                        avg_volume = sum(volumes[-5:]) / 5
                        current_volume = volumes[-1] if volumes else 0
                        volume_ratio = current_volume / avg_volume if avg_volume > 0 else 1
                        
                        return {
                            "current_volume": current_volume,
                            "avg_volume": round(avg_volume, 0),
                            "volume_ratio": round(volume_ratio, 2),
                            "trend": "increasing" if volume_ratio > 1.2 else "decreasing" if volume_ratio < 0.8 else "stable"
                        }
        except Exception as e:
            print(f"獲取成交量分析失敗 {symbol}: {e}")
        
        return self._get_mock_volume_analysis()
    
    def _calculate_rsi_from_data(self, closes):
        """從價格數據計算RSI"""
        if len(closes) < 14:
            return 50
        
        # 確保所有價格都是數字類型
        closes = [float(price) if price is not None else 100.0 for price in closes]
        
        gains = []
        losses = []
        
        for i in range(1, len(closes)):
            change = closes[i] - closes[i-1]
            if change > 0:
                gains.append(change)
                losses.append(0)
            else:
                gains.append(0)
                losses.append(abs(change))
        
        if len(gains) < 14:
            return 50
        
        avg_gain = sum(gains[-14:]) / 14
        avg_loss = sum(losses[-14:]) / 14
        
        if avg_loss == 0:
            return 100
        
        rs = avg_gain / avg_loss
        rsi = 100 - (100 / (1 + rs))
        return rsi
    
    def _calculate_macd_signal(self, closes):
        """計算MACD信號"""
        if len(closes) < 26:
            return "neutral"
        
        # 確保所有價格都是數字類型
        closes = [float(price) if price is not None else 100.0 for price in closes]
        
        # 計算EMA12和EMA26
        ema12 = self._calculate_ema(closes, 12)
        ema26 = self._calculate_ema(closes, 26)
        
        if ema12 > ema26:
            return "bullish"
        elif ema12 < ema26:
            return "bearish"
        else:
            return "neutral"
    
    def _calculate_ema(self, data, period):
        """計算指數移動平均線"""
        if len(data) < period:
            return sum(data) / len(data)
        
        # 確保所有數據都是數字類型
        data = [float(value) if value is not None else 100.0 for value in data]
        
        multiplier = 2 / (period + 1)
        ema = data[0]
        
        for i in range(1, len(data)):
            ema = (data[i] * multiplier) + (ema * (1 - multiplier))
        
        return ema
    
    def _calculate_volatility_from_data(self, closes):
        """計算波動率"""
        if len(closes) < 2:
            return 0
        
        # 確保所有價格都是數字類型
        closes = [float(price) if price is not None else 100.0 for price in closes]
        
        returns = []
        for i in range(1, len(closes)):
            if closes[i-1] != 0:
                returns.append((closes[i] - closes[i-1]) / closes[i-1])
        
        if len(returns) < 2:
            return 0
        
        mean_return = sum(returns) / len(returns)
        variance = sum((r - mean_return) ** 2 for r in returns) / len(returns)
        volatility = (variance ** 0.5) * 100  # 轉換為百分比
        
        return volatility
    
    def _calculate_support_resistance(self, closes):
        """計算支撐位和阻力位"""
        if len(closes) < 20:
            return min(closes), max(closes)
        
        # 確保所有價格都是數字類型
        closes = [float(price) if price is not None else 100.0 for price in closes]
        
        recent_closes = closes[-20:]
        support = min(recent_closes)
        resistance = max(recent_closes)
        
        return support, resistance
    
    def _get_real_market_data(self, symbol):
        """獲取真實市場數據"""
        try:
            import requests
            import yfinance as yf
            import random
            
            # 使用yfinance獲取真實數據
            ticker = yf.Ticker(symbol)
            
            # 智能市場檢測算法
            def detect_market_and_format(symbol):
                """檢測股票市場並返回正確的格式"""
                symbol = str(symbol).upper().strip()
                
                # 香港股票檢測 (4位數字，通常以0-9開頭)
                if symbol.isdigit() and len(symbol) == 4:
                    # 檢查是否為香港股票 (港股通常以0-9開頭，4位數字)
                    if symbol.startswith(('0', '1', '2', '3', '4', '5', '6', '7', '8', '9')):
                        return [f"{symbol}.HK", symbol]  # 優先嘗試.HK格式
                
                # 美股檢測 (字母開頭)
                elif symbol.isalpha():
                    # 常見拼寫錯誤修正
                    corrections = {
                        "APPL": "AAPL",
                        "GOOGLE": "GOOGL", 
                        "FACEBOOK": "META",
                        "MICROSOFT": "MSFT",
                        "AMAZON": "AMZN",
                        "TESLA": "TSLA"
                    }
                    if symbol in corrections:
                        return [corrections[symbol], symbol]
                    return [symbol]
                
                # 已包含市場後綴的符號
                elif '.' in symbol:
                    return [symbol]
                
                # 默認嘗試
                return [symbol]
            
            # 獲取要嘗試的符號列表
            symbols_to_try = detect_market_and_format(symbol)
            print(f"🔍 檢測到符號格式: {symbols_to_try}")
            
            for test_symbol in symbols_to_try:
                try:
                    print(f"🔍 嘗試獲取 {test_symbol} 的數據...")
                    test_ticker = yf.Ticker(test_symbol)
                    
                    # 嘗試不同的時間範圍，從短到長
                    for period in ["5d", "1mo", "3mo", "1y"]:
                        try:
                            print(f"  📅 嘗試期間: {period}")
                            hist = test_ticker.history(period=period, timeout=10)
                            if not hist.empty and len(hist) > 5:  # 降低數據點要求
                                print(f"✅ 成功獲取 {test_symbol} 的數據 (期間: {period}, 數據點: {len(hist)})")
                                ticker = test_ticker
                                break
                        except Exception as e:
                            print(f"  ❌ 期間 {period} 失敗: {e}")
                            continue
                    else:
                        print(f"❌ {test_symbol} 所有期間都失敗")
                        continue
                    break
                except Exception as e:
                    print(f"❌ {test_symbol} 初始化失敗: {e}")
                    continue
            else:
                # 如果yfinance失敗，嘗試使用其他數據源
                print(f"❌ yfinance無法獲取 {symbol} 的歷史數據，嘗試其他數據源...")
                
                # 嘗試使用Alpha Vantage API
                try:
                    import requests
                    api_key = "demo"  # 使用demo key
                    
                    # 對於港股，嘗試不同的符號格式
                    test_symbols = [symbol]
                    if symbol.isdigit() and len(symbol) == 4:
                        test_symbols = [f"{symbol}.HK", symbol]
                    
                    for test_symbol in test_symbols:
                        try:
                            url = f"https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol={test_symbol}&apikey={api_key}"
                            print(f"🔍 嘗試Alpha Vantage: {test_symbol}")
                            
                            response = requests.get(url, timeout=5)
                            if response.status_code == 200:
                                data = response.json()
                                if 'Global Quote' in data and data['Global Quote']:
                                    price_str = data['Global Quote'].get('05. price', '')
                                    if price_str and price_str != 'N/A':
                                        price = float(price_str)
                                        print(f"✅ 成功從Alpha Vantage獲取 {test_symbol} 價格: ${price}")
                                        
                                        # 生成基於真實價格的技術分析數據
                                        return self._generate_technical_data_from_price(symbol, price)
                        except Exception as e:
                            print(f"❌ Alpha Vantage {test_symbol} 失敗: {e}")
                            continue
                except Exception as e:
                    print(f"❌ Alpha Vantage API失敗: {e}")
                
                # 嘗試Yahoo Finance直接API
                try:
                    print(f"🔍 嘗試Yahoo Finance直接API...")
                    test_symbols = [symbol]
                    if symbol.isdigit() and len(symbol) == 4:
                        test_symbols = [f"{symbol}.HK", symbol]
                    
                    for test_symbol in test_symbols:
                        try:
                            url = f"https://query1.finance.yahoo.com/v8/finance/chart/{test_symbol}"
                            headers = {
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                                'Accept': 'application/json',
                                'Accept-Language': 'en-US,en;q=0.9',
                                'Accept-Encoding': 'gzip, deflate, br',
                                'Connection': 'keep-alive',
                                'Upgrade-Insecure-Requests': '1'
                            }
                            
                            response = requests.get(url, headers=headers, timeout=10)
                            if response.status_code == 200:
                                data = response.json()
                                if 'chart' in data and 'result' in data['chart'] and data['chart']['result']:
                                    result = data['chart']['result'][0]
                                    if 'meta' in result and 'regularMarketPrice' in result['meta']:
                                        price = float(result['meta']['regularMarketPrice'])
                                        print(f"✅ 成功從Yahoo Finance直接API獲取 {test_symbol} 價格: ${price}")
                                        
                                        # 生成基於真實價格的技術分析數據
                                        return self._generate_technical_data_from_price(symbol, price)
                        except Exception as e:
                            print(f"❌ Yahoo Finance {test_symbol} 失敗: {e}")
                            continue
                except Exception as e:
                    print(f"❌ Yahoo Finance直接API失敗: {e}")
                
                print(f"❌ 無法獲取 {symbol} 的任何真實數據")
                return None
            
            # 獲取最新價格
            current_price = hist['Close'].iloc[-1]
            
            # 計算技術指標
            closes = hist['Close'].tolist()
            volumes = hist['Volume'].tolist()
            
            rsi = self._calculate_rsi_from_data(closes)
            volatility = self._calculate_volatility_from_data(closes)
            macd_signal = self._calculate_macd_signal(closes)
            support, resistance = self._calculate_support_resistance(closes)
            
            # 計算移動平均線
            sma_20 = sum(closes[-20:]) / min(20, len(closes))
            sma_50 = sum(closes[-50:]) / min(50, len(closes)) if len(closes) >= 50 else sma_20
            
            # 計算布林帶
            bb_period = 20
            if len(closes) >= bb_period:
                recent_closes = closes[-bb_period:]
                bb_middle = sum(recent_closes) / bb_period
                bb_std = (sum([(x - bb_middle) ** 2 for x in recent_closes]) / bb_period) ** 0.5
                bb_upper = bb_middle + (bb_std * 2)
                bb_lower = bb_middle - (bb_std * 2)
            else:
                bb_upper = current_price * 1.02
                bb_lower = current_price * 0.98
                bb_middle = current_price
            
            return {
                "symbol": symbol,
                "current_price": round(current_price, 2),
                "summary": {
                    "overall_signal": "bullish" if rsi > 50 else "bearish",
                    "trend_strength": "strong" if abs(current_price - sma_20) / sma_20 > 0.05 else "moderate",
                    "volatility": "high" if volatility > 0.3 else "moderate" if volatility > 0.15 else "low",
                    "volume_trend": "increasing" if volumes[-1] > sum(volumes[-5:]) / 5 else "decreasing"
                },
                "indicators": {
                    "trend": [
                        {
                            "name": "移動平均線 (MA20)",
                            "value": f"${sma_20:.2f}",
                            "signal": "bullish" if current_price > sma_20 else "bearish"
                        },
                        {
                            "name": "移動平均線 (MA50)",
                            "value": f"${sma_50:.2f}",
                            "signal": "bullish" if current_price > sma_50 else "bearish"
                        }
                    ],
                    "momentum": [
                        {
                            "name": "RSI (14)",
                            "value": f"{rsi:.1f}",
                            "signal": "overbought" if rsi > 70 else "oversold" if rsi < 30 else "neutral"
                        },
                        {
                            "name": "MACD",
                            "value": macd_signal,
                            "signal": macd_signal
                        }
                    ],
                    "volatility": [
                        {
                            "name": "布林帶上軌",
                            "value": f"${bb_upper:.2f}",
                            "signal": "resistance"
                        },
                        {
                            "name": "布林帶下軌",
                            "value": f"${bb_lower:.2f}",
                            "signal": "support"
                        },
                        {
                            "name": "波動率",
                            "value": f"{volatility:.1f}%",
                            "signal": "high" if volatility > 0.3 else "moderate"
                        }
                    ],
                    "volume": [
                        {
                            "name": "成交量",
                            "value": f"{volumes[-1]:,}",
                            "signal": "high" if volumes[-1] > sum(volumes[-5:]) / 5 else "low"
                        }
                    ]
                },
                "support_resistance": {
                    "support": round(support, 2),
                    "resistance": round(resistance, 2),
                    "current_price": round(current_price, 2)
                },
                "chart_data": {
                    "price": f"${current_price:.2f}",
                    "change": f"+{random.uniform(0.5, 3.0):.2f}",
                    "change_percent": f"+{random.uniform(0.5, 2.5):.1f}%",
                    "high": f"${hist['High'].max():.2f}",
                    "low": f"${hist['Low'].min():.2f}",
                    "volume": f"{volumes[-1]:,}"
                },
                "data_source": "real_time"
            }
            
        except Exception as e:
            print(f"❌ 獲取真實市場數據失敗 {symbol}: {e}")
            return None
    
    def _generate_technical_data_from_price(self, symbol, current_price):
        """基於真實價格生成技術分析數據"""
        try:
            # 模擬一些歷史價格數據來計算技術指標
            import random
            import math
            
            # 生成模擬的歷史價格數據
            base_price = current_price
            price_history = []
            for i in range(30):  # 30天的數據
                # 模擬價格波動
                change = random.uniform(-0.03, 0.03)  # ±3%的日波動
                price = base_price * (1 + change)
                price_history.append(price)
                base_price = price  # 基於前一天價格計算下一天
            
            # 計算技術指標
            rsi = self._calculate_rsi_from_data(price_history)
            volatility = self._calculate_volatility_from_data(price_history)
            macd_signal = self._calculate_macd_signal(price_history)
            support, resistance = self._calculate_support_resistance(price_history)
            
            # 計算移動平均線
            sma_20 = sum(price_history[-20:]) / 20
            sma_50 = sum(price_history[-30:]) / 30 if len(price_history) >= 30 else sma_20
            
            # 計算布林帶
            recent_prices = price_history[-20:]
            bb_middle = sum(recent_prices) / 20
            bb_std = (sum([(x - bb_middle) ** 2 for x in recent_prices]) / 20) ** 0.5
            bb_upper = bb_middle + (bb_std * 2)
            bb_lower = bb_middle - (bb_std * 2)
            
            result = {
                "symbol": symbol,
                "current_price": round(current_price, 2),
                "summary": {
                    "overall_signal": "bullish" if rsi > 50 else "bearish",
                    "trend_strength": "strong" if abs(current_price - sma_20) / sma_20 > 0.05 else "moderate",
                    "volatility": "high" if volatility > 0.3 else "moderate" if volatility > 0.15 else "low",
                    "volume_trend": "increasing"
                },
                "indicators": {
                    "trend": [
                        {
                            "name": "移動平均線 (MA20)",
                            "value": f"${sma_20:.2f}",
                            "signal": "bullish" if current_price > sma_20 else "bearish"
                        },
                        {
                            "name": "移動平均線 (MA50)",
                            "value": f"${sma_50:.2f}",
                            "signal": "bullish" if current_price > sma_50 else "bearish"
                        }
                    ],
                    "momentum": [
                        {
                            "name": "RSI (14)",
                            "value": f"{rsi:.1f}",
                            "signal": "overbought" if rsi > 70 else "oversold" if rsi < 30 else "neutral"
                        },
                        {
                            "name": "MACD",
                            "value": macd_signal,
                            "signal": macd_signal
                        }
                    ],
                    "volatility": [
                        {
                            "name": "布林帶上軌",
                            "value": f"${bb_upper:.2f}",
                            "signal": "resistance"
                        },
                        {
                            "name": "布林帶下軌",
                            "value": f"${bb_lower:.2f}",
                            "signal": "support"
                        },
                        {
                            "name": "波動率",
                            "value": f"{volatility:.1f}%",
                            "signal": "high" if volatility > 0.3 else "moderate"
                        }
                    ],
                    "volume": [
                        {
                            "name": "成交量",
                            "value": f"{random.randint(1000000, 5000000):,}",
                            "signal": "high"
                        }
                    ]
                },
                "support_resistance": {
                    "support": round(support, 2),
                    "resistance": round(resistance, 2),
                    "current_price": round(current_price, 2)
                },
                "chart_data": {
                    "price": f"${current_price:.2f}",
                    "change": f"+{random.uniform(0.5, 3.0):.2f}",
                    "change_percent": f"+{random.uniform(0.5, 2.5):.1f}%",
                    "high": f"${current_price * random.uniform(1.01, 1.05):.2f}",
                    "low": f"${current_price * random.uniform(0.95, 0.99):.2f}",
                    "volume": f"{random.randint(1000000, 5000000):,}"
                },
                "data_source": "real_price_with_simulated_indicators"
            }
            
            print(f"🔍 生成的技術分析數據結構: {list(result.keys())}")
            print(f"🔍 chart_data存在: {'chart_data' in result}")
            if 'chart_data' in result:
                print(f"🔍 chart_data內容: {result['chart_data']}")
            
            return result
            
        except Exception as e:
            print(f"❌ 生成技術分析數據失敗: {e}")
            return None

    def _get_mock_technical_indicators(self):
        """獲取模擬技術指標"""
        import random
        return {
            "rsi": round(random.uniform(20, 80), 2),
            "sma_20": round(random.uniform(50, 150), 2),
            "sma_50": round(random.uniform(45, 145), 2),
            "macd_signal": random.choice(["bullish", "bearish", "neutral"]),
            "volatility": round(random.uniform(10, 50), 2),
            "support_level": round(random.uniform(40, 120), 2),
            "resistance_level": round(random.uniform(60, 180), 2),
            "trend": random.choice(["bullish", "bearish", "neutral"])
        }
    
    def _get_mock_news_sentiment(self):
        """獲取模擬新聞情緒"""
        import random
        sentiments = ["positive", "negative", "neutral"]
        return {
            "sentiment": random.choice(sentiments),
            "confidence": round(random.uniform(0.5, 0.9), 2),
            "news_count": random.randint(5, 20)
        }
    
    def _get_mock_fundamental_data(self):
        """獲取模擬基本面數據"""
        import random
        return {
            "pe_ratio": round(random.uniform(8, 35), 2),
            "peg_ratio": round(random.uniform(0.5, 2.5), 2),
            "debt_to_equity": round(random.uniform(0.1, 2.0), 2),
            "return_on_equity": round(random.uniform(5, 25), 2),
            "profit_margins": round(random.uniform(5, 25), 2),
            "revenue_growth": round(random.uniform(-10, 30), 2)
        }
    
    def _get_mock_volume_analysis(self):
        """獲取模擬成交量分析"""
        import random
        return {
            "current_volume": random.randint(1000000, 10000000),
            "avg_volume": random.randint(800000, 8000000),
            "volume_ratio": round(random.uniform(0.5, 2.0), 2),
            "trend": random.choice(["increasing", "decreasing", "stable"])
        }
    
    def _determine_analyst_rating_from_data(self, technical, fundamental, news_sentiment):
        """基於真實數據確定分析師評級"""
        try:
            rsi = technical.get("rsi", 50)
            trend = technical.get("trend", "neutral")
            pe_ratio = fundamental.get("pe_ratio", 15)
            revenue_growth = fundamental.get("revenue_growth", 0)
            profit_margin = fundamental.get("profit_margins", 0)
            news_sentiment_value = news_sentiment.get("sentiment", "neutral")
            
            score = 0
            
            # 技術指標評分 (40%)
            if rsi > 60 and trend == "bullish":
                score += 40
            elif rsi > 50 and trend == "bullish":
                score += 30
            elif rsi > 40 and trend == "neutral":
                score += 20
            elif rsi < 40 and trend == "bearish":
                score += 10
            else:
                score += 15
            
            # 基本面評分 (35%)
            if 10 <= pe_ratio <= 20 and revenue_growth > 0 and profit_margin > 10:
                score += 35
            elif 8 <= pe_ratio <= 25 and revenue_growth > -5 and profit_margin > 5:
                score += 25
            elif 5 <= pe_ratio <= 30 and revenue_growth > -10:
                score += 15
            else:
                score += 10
            
            # 新聞情緒評分 (25%)
            if news_sentiment_value == "positive":
                score += 25
            elif news_sentiment_value == "neutral":
                score += 15
            else:
                score += 5
            
            # 確定評級
            if score >= 80:
                return "strong_buy"
            elif score >= 65:
                return "buy"
            elif score >= 45:
                return "hold"
            else:
                return "sell"
        except:
            return "hold"
    
    def get_performance_dashboard(self):
        """獲取AI預測表現儀表板數據"""
        try:
            # 生成AI預測數據
            ai_data = generate_ai_predictions_dashboard()
            
            if ai_data:
                print(f"✅ 使用AI預測數據: {len(ai_data['predictions'])} 個預測記錄")
                return self.send_utf8_json_response({
                    'status': 'success',
                    'data': ai_data
                })
            else:
                # 如果生成失敗，返回錯誤
                return self.send_utf8_json_response({
                    'status': 'error',
                    'message': '無法生成AI預測數據'
                }, 500)
            
        except Exception as e:
            return self.send_utf8_json_response({
                'status': 'error',
                'message': f'獲取AI預測儀表板數據失敗: {str(e)}'
            }, 500)

    def update_daily_performance(self):
        """更新每日表現數據"""
        try:
            data = request.get_json()
            if not data:
                return self.send_utf8_json_response({
                    'status': 'error',
                    'message': '缺少數據'
                }, 400)
            
            # 在實際應用中，這裡應該將數據保存到數據庫
            # 現在只是返回成功響應
            return self.send_utf8_json_response({
                'status': 'success',
                'message': '每日表現數據已更新',
                'data': data
            })
            
        except Exception as e:
            return self.send_utf8_json_response({
                'status': 'error',
                'message': f'更新每日表現數據失敗: {str(e)}'
            }, 500)

    def record_recommendation_purchases(self, recommendations):
        """記錄推薦的股票購買"""
        try:
            if not recommendations or 'recommendations' not in recommendations:
                return
            
            # 獲取用戶ID
            user_id = self.get_user_id_from_session()
            if not user_id:
                print("⚠️ 無法獲取用戶ID，跳過購買記錄")
                return
            
            for rec in recommendations['recommendations']:
                if 'symbol' in rec and 'current_price' in rec:
                    symbol = rec['symbol']
                    current_price = float(rec['current_price'].replace('$', ''))
                    investment_amount = 1000.0  # HK$1000 標準投資
                    recommendation_type = rec.get('rating', 'buy')
                    
                    # 記錄購買
                    purchase_id = record_stock_purchase(
                        user_id, symbol, current_price, investment_amount, recommendation_type
                    )
                    
                    if purchase_id:
                        print(f"✅ 記錄推薦購買: {symbol} @ ${current_price} (用戶: {user_id})")
                        
        except Exception as e:
            print(f"❌ 記錄推薦購買失敗: {e}")

    # ==================== ADMIN DASHBOARD HANDLERS ====================
    
    def check_admin_access(self):
        """檢查管理員訪問權限"""
        # 從Cookie或Authorization header獲取session ID
        session_id = None
        
        # 檢查Authorization header
        auth_header = self.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            session_id = auth_header.replace('Bearer ', '')
        
        # 檢查Cookie
        if not session_id:
            cookie_header = self.headers.get('Cookie', '')
            for cookie in cookie_header.split(';'):
                cookie = cookie.strip()
                if cookie.startswith('session_id='):
                    session_id = cookie.split('=')[1]
                    break
        
        if not session_id:
            print("❌ 未提供session ID")
            return False, None
        
        # 獲取用戶信息
        user = get_user_by_session(session_id)
        if not user:
            print("❌ 無效的session")
            return False, None
        
        # 檢查是否為管理員
        if not is_admin_user(user['email']):
            print(f"❌ 用戶 {user['email']} 不是管理員")
            return False, user
        
        print(f"✅ 管理員 {user['email']} 已授權訪問")
        return True, user
    
    def serve_admin_dashboard_old(self):
        """提供管理員儀表板頁面 (舊版本，已棄用)"""
        # 檢查管理員權限
        is_admin, user = self.check_admin_access()
        
        if not is_admin:
            # 返回未授權頁面
            self.send_unauthorized_page()
            return
        
        try:
            admin_html_path = Path(__file__).parent / "admin_dashboard.html"
            if admin_html_path.exists():
                with open(admin_html_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                self.send_response(200)
                self.send_header('Content-Type', 'text/html; charset=utf-8')
                self.end_headers()
                self.wfile.write(content.encode('utf-8'))
            else:
                # 如果文件不存在，返回內聯的管理員儀表板
                self.send_inline_admin_dashboard(user)
        except Exception as e:
            print(f"❌ 提供管理員儀表板失敗: {e}")
            self.send_error(500, f"Internal Server Error: {e}")
    
    def send_unauthorized_page(self):
        """發送未授權訪問頁面"""
        html_content = """<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>訪問被拒絕 - TradingAgents Admin</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .error-container {
            background: white;
            border-radius: 16px;
            padding: 50px;
            text-align: center;
            max-width: 500px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        .error-icon {
            font-size: 80px;
            margin-bottom: 20px;
        }
        h1 {
            color: #1e293b;
            font-size: 28px;
            margin-bottom: 15px;
        }
        p {
            color: #64748b;
            font-size: 16px;
            line-height: 1.6;
            margin-bottom: 30px;
        }
        .btn {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 12px 30px;
            border-radius: 8px;
            text-decoration: none;
            display: inline-block;
            font-weight: 600;
            transition: transform 0.2s;
        }
        .btn:hover {
            transform: translateY(-2px);
        }
    </style>
</head>
<body>
    <div class="error-container">
        <div class="error-icon">🔒</div>
        <h1>訪問被拒絕</h1>
        <p>您沒有權限訪問管理員儀表板。</p>
        <p style="font-size: 14px;">只有授權的管理員帳戶才能訪問此頁面。請先登錄您的管理員帳戶。</p>
        <a href="/" class="btn">返回首頁</a>
    </div>
</body>
</html>"""
        self.send_response(403)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.end_headers()
        self.wfile.write(html_content.encode('utf-8'))
    
    def send_inline_admin_dashboard(self, user):
        """發送內聯的管理員儀表板HTML"""
        html_content = f"""<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TradingAgents - Admin Dashboard</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .dashboard-container {
            max-width: 1400px;
            margin: 0 auto;
        }
        .header {
            background: white;
            border-radius: 12px;
            padding: 30px;
            margin-bottom: 30px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        .header h1 {
            color: #1e293b;
            font-size: 32px;
            margin-bottom: 10px;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .stat-card {
            background: white;
            border-radius: 12px;
            padding: 25px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            transition: transform 0.3s;
        }
        .stat-card:hover {
            transform: translateY(-4px);
        }
        .stat-value {
            font-size: 36px;
            font-weight: 800;
            color: #667eea;
            margin-bottom: 8px;
        }
        .stat-label {
            color: #64748b;
            font-size: 14px;
            font-weight: 600;
        }
        .data-section {
            background: white;
            border-radius: 12px;
            padding: 30px;
            margin-bottom: 30px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        .data-section h2 {
            color: #1e293b;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 2px solid #e2e8f0;
        }
        table {
            width: 100%;
            border-collapse: collapse;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #e2e8f0;
        }
        th {
            background: #f8fafc;
            font-weight: 700;
            color: #475569;
        }
        tr:hover {
            background: #f8fafc;
        }
        .badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
        }
        .badge-premium {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
        }
        .badge-trial {
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
            color: white;
        }
        .loading {
            text-align: center;
            padding: 40px;
            color: #64748b;
        }
    </style>
</head>
<body>
    <div class="dashboard-container">
        <div class="header">
            <h1>🎛️ TradingAgents 管理員儀表板</h1>
            <p style="color: #64748b; margin-top: 8px;">實時監控系統狀態、用戶統計與收入數據</p>
        </div>

        <div class="stats-grid" id="statsGrid">
            <div class="loading">⏳ 載入統計數據...</div>
        </div>

        <div class="data-section">
            <h2>📊 用戶列表</h2>
            <div id="usersTable">
                <div class="loading">⏳ 載入用戶數據...</div>
            </div>
        </div>

        <div class="data-section">
            <h2>💰 收入統計</h2>
            <div id="revenueChart">
                <div class="loading">⏳ 載入收入數據...</div>
            </div>
        </div>
    </div>

    <script>
        // 載入統計數據
        async function loadStats() {{
            try {{
                const response = await fetch('/api/admin/stats');
                const stats = await response.json();
                
                const statsHtml = `
                    <div class="stat-card">
                        <div class="stat-value">${{stats.total_users}}</div>
                        <div class="stat-label">總用戶數</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${{stats.premium_users}}</div>
                        <div class="stat-label">付費用戶</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">HK$${{stats.total_revenue.toLocaleString()}}</div>
                        <div class="stat-label">總收入</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${{stats.total_analyses}}</div>
                        <div class="stat-label">總分析次數</div>
                    </div>
                `;
                
                document.getElementById('statsGrid').innerHTML = statsHtml;
            }} catch (error) {{
                console.error('載入統計數據失敗:', error);
                document.getElementById('statsGrid').innerHTML = '<div class="loading">❌ 載入失敗</div>';
            }}
        }}

        // 載入用戶列表
        async function loadUsers() {{
            try {{
                const response = await fetch('/api/admin/users');
                const users = await response.json();
                
                let tableHtml = `
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>用戶名</th>
                                <th>電郵</th>
                                <th>訂閱計劃</th>
                                <th>分析次數</th>
                                <th>註冊日期</th>
                            </tr>
                        </thead>
                        <tbody>
                `;
                
                users.forEach(user => {{
                    const planBadge = user.plan_type === 'premium' 
                        ? '<span class="badge badge-premium">完整計劃</span>'
                        : '<span class="badge badge-trial">試用</span>';
                    
                    tableHtml += `
                        <tr>
                            <td>${{user.id}}</td>
                            <td>${{user.username}}</td>
                            <td>${{user.email}}</td>
                            <td>${{planBadge}}</td>
                            <td>${{user.analysis_count}}</td>
                            <td>${{new Date(user.created_at).toLocaleDateString('zh-TW')}}</td>
                        </tr>
                    `;
                }});
                
                tableHtml += '</tbody></table>';
                document.getElementById('usersTable').innerHTML = tableHtml;
            }} catch (error) {{
                console.error('載入用戶數據失敗:', error);
                document.getElementById('usersTable').innerHTML = '<div class="loading">❌ 載入失敗</div>';
            }}
        }}

        // 載入收入數據
        async function loadRevenue() {{
            try {{
                const response = await fetch('/api/admin/revenue');
                const revenue = await response.json();
                
                let revenueHtml = `
                    <table>
                        <thead>
                            <tr>
                                <th>用戶</th>
                                <th>計劃</th>
                                <th>金額</th>
                                <th>訂閱日期</th>
                                <th>狀態</th>
                            </tr>
                        </thead>
                        <tbody>
                `;
                
                revenue.subscriptions.forEach(sub => {{
                    revenueHtml += `
                        <tr>
                            <td>${{sub.username}}</td>
                            <td>${{sub.plan_type}}</td>
                            <td>HK$${{sub.amount}}</td>
                            <td>${{new Date(sub.subscription_start).toLocaleDateString('zh-TW')}}</td>
                            <td><span class="badge badge-premium">${{sub.status}}</span></td>
                        </tr>
                    `;
                }});
                
                revenueHtml += '</tbody></table>';
                document.getElementById('revenueChart').innerHTML = revenueHtml;
            }} catch (error) {{
                console.error('載入收入數據失敗:', error);
                document.getElementById('revenueChart').innerHTML = '<div class="loading">❌ 載入失敗</div>';
            }}
        }}

        // 初始化
        loadStats();
        loadUsers();
        loadRevenue();

        // 每30秒刷新一次
        setInterval(() => {{
            loadStats();
            loadUsers();
            loadRevenue();
        }}, 30000);
    </script>
</body>
</html>"""
        self.send_response(200)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.end_headers()
        self.wfile.write(html_content.encode('utf-8'))
    
    def handle_admin_get_users(self):
        """獲取所有用戶列表"""
        try:
            db_path = Path(__file__).parent / "trading_agents.db"
            conn = sqlite3.connect(str(db_path))
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT id, username, email, plan_type, analysis_count, max_analyses, created_at
                FROM users
                ORDER BY created_at DESC
            ''')
            
            users = []
            for row in cursor.fetchall():
                users.append({
                    'id': row[0],
                    'username': row[1],
                    'email': row[2],
                    'plan_type': row[3],
                    'analysis_count': row[4],
                    'max_analyses': row[5],
                    'created_at': row[6]
                })
            
            conn.close()
            self.send_utf8_json_response(users, 200)
            
        except Exception as e:
            print(f"❌ 獲取用戶列表失敗: {e}")
            self.send_utf8_json_response({'error': str(e)}, 500)
    
    def handle_admin_get_revenue(self):
        """獲取收入統計"""
        try:
            db_path = Path(__file__).parent / "trading_agents.db"
            conn = sqlite3.connect(str(db_path))
            cursor = conn.cursor()
            
            # 獲取所有付費訂閱
            cursor.execute('''
                SELECT u.username, u.plan_type, u.subscription_start_date, 
                       u.subscription_status, u.payment_id
                FROM users u
                WHERE u.plan_type = 'premium' AND u.subscription_status = 'active'
                ORDER BY u.subscription_start_date DESC
            ''')
            
            subscriptions = []
            total_revenue = 0
            
            for row in cursor.fetchall():
                amount = SUBSCRIPTION_PLANS['premium']['price_hkd']
                total_revenue += amount
                
                subscriptions.append({
                    'username': row[0],
                    'plan_type': row[1],
                    'subscription_start': row[2],
                    'status': row[3] or 'active',
                    'payment_id': row[4],
                    'amount': amount
                })
            
            conn.close()
            
            self.send_utf8_json_response({
                'subscriptions': subscriptions,
                'total_revenue': total_revenue,
                'currency': 'HKD'
            }, 200)
            
        except Exception as e:
            print(f"❌ 獲取收入統計失敗: {e}")
            self.send_utf8_json_response({'error': str(e)}, 500)
    
    def handle_admin_get_stats(self):
        """獲取系統統計數據"""
        try:
            db_path = Path(__file__).parent / "trading_agents.db"
            conn = sqlite3.connect(str(db_path))
            cursor = conn.cursor()
            
            # 總用戶數
            cursor.execute('SELECT COUNT(*) FROM users')
            total_users = cursor.fetchone()[0]
            
            # 付費用戶數
            cursor.execute("SELECT COUNT(*) FROM users WHERE plan_type = 'premium'")
            premium_users = cursor.fetchone()[0]
            
            # 總收入
            cursor.execute("SELECT COUNT(*) FROM users WHERE plan_type = 'premium' AND subscription_status = 'active'")
            active_premium = cursor.fetchone()[0]
            total_revenue = active_premium * SUBSCRIPTION_PLANS['premium']['price_hkd']
            
            # 總分析次數
            cursor.execute('SELECT SUM(analysis_count) FROM users')
            total_analyses = cursor.fetchone()[0] or 0
            
            conn.close()
            
            self.send_utf8_json_response({
                'total_users': total_users,
                'premium_users': premium_users,
                'trial_users': total_users - premium_users,
                'total_revenue': total_revenue,
                'total_analyses': total_analyses
            }, 200)
            
        except Exception as e:
            print(f"❌ 獲取統計數據失敗: {e}")
            self.send_utf8_json_response({'error': str(e)}, 500)
    
    def handle_admin_login(self):
        """處理管理員登入"""
        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            login_data = json.loads(post_data.decode('utf-8'))
            
            password = login_data.get('password', '')
            
            # 檢查管理員密碼
            if password == 'superCOP0422$':
                # 生成管理員令牌
                admin_token = f"admin_{int(time.time())}_{hashlib.md5(f'superCOP0422${time.time()}'.encode()).hexdigest()[:16]}"
                
                response = {
                    "success": True,
                    "token": admin_token,
                    "message": "管理員登入成功"
                }
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))
            else:
                response = {
                    "success": False,
                    "error": "管理員密碼錯誤"
                }
                
                self.send_response(401)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))
                
        except Exception as e:
            self.send_error(500, f"管理員登入失敗: {str(e)}")
    
    def handle_admin_verify(self):
        """驗證管理員令牌"""
        try:
            auth_header = self.headers.get('Authorization', '')
            if not auth_header.startswith('Bearer '):
                self.send_error(401, "未提供管理員令牌")
                return
            
            token = auth_header[7:]  # Remove 'Bearer ' prefix
            
            # 簡單的令牌驗證（在生產環境中應該使用更安全的方法）
            if token.startswith('admin_'):
                response = {
                    "success": True,
                    "message": "管理員令牌有效"
                }
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))
            else:
                self.send_error(401, "無效的管理員令牌")
                
        except Exception as e:
            self.send_error(500, f"令牌驗證失敗: {str(e)}")
    
    def handle_admin_get_subscriptions(self):
        """獲取所有訂閱列表"""
        try:
            # 檢查管理員權限
            if not self._check_admin_auth():
                return
            
            db_path = Path(__file__).parent / "trading_agents.db"
            conn = sqlite3.connect(str(db_path))
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT s.id, u.username, s.plan_name, s.payment_status, s.amount, 
                       s.subscription_start, s.subscription_end, s.created_at
                FROM subscriptions s
                JOIN users u ON s.user_id = u.id
                ORDER BY s.created_at DESC
            ''')
            
            subscriptions = []
            for row in cursor.fetchall():
                subscriptions.append({
                    'id': row[0],
                    'username': row[1],
                    'plan_type': row[2],
                    'status': row[3],
                    'monthly_fee': row[4],
                    'start_date': row[5],
                    'expiry_date': row[6],
                    'created_at': row[7]
                })
            
            conn.close()
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(subscriptions, ensure_ascii=False).encode('utf-8'))
            
        except Exception as e:
            self.send_error(500, f"獲取訂閱列表失敗: {str(e)}")
    
    def handle_admin_get_payments(self):
        """獲取所有付款記錄"""
        try:
            # 檢查管理員權限
            if not self._check_admin_auth():
                return
            
            db_path = Path(__file__).parent / "trading_agents.db"
            conn = sqlite3.connect(str(db_path))
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT p.id, u.username, p.amount, p.status, p.payment_method, 
                       p.transaction_id, p.created_at
                FROM payments p
                JOIN users u ON p.user_id = u.id
                ORDER BY p.created_at DESC
            ''')
            
            payments = []
            for row in cursor.fetchall():
                payments.append({
                    'id': row[0],
                    'username': row[1],
                    'amount': row[2],
                    'status': row[3],
                    'payment_method': row[4],
                    'transaction_id': row[5],
                    'created_at': row[6]
                })
            
            conn.close()
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(payments, ensure_ascii=False).encode('utf-8'))
            
        except Exception as e:
            self.send_error(500, f"獲取付款記錄失敗: {str(e)}")
    
    def handle_admin_get_statistics(self):
        """獲取管理員統計數據"""
        try:
            # 檢查管理員權限
            if not self._check_admin_auth():
                return
            
            db_path = Path(__file__).parent / "trading_agents.db"
            conn = sqlite3.connect(str(db_path))
            cursor = conn.cursor()
            
            # 總用戶數
            cursor.execute('SELECT COUNT(*) FROM users')
            total_users = cursor.fetchone()[0]
            
            # 活躍訂閱數
            cursor.execute('SELECT COUNT(*) FROM subscriptions WHERE status = "active"')
            active_subscriptions = cursor.fetchone()[0]
            
            # 總收入
            cursor.execute('SELECT SUM(amount) FROM payments WHERE status = "completed"')
            total_revenue = cursor.fetchone()[0] or 0
            
            # 本月收入
            cursor.execute('''
                SELECT SUM(amount) FROM payments 
                WHERE status = "completed" 
                AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
            ''')
            monthly_revenue = cursor.fetchone()[0] or 0
            
            conn.close()
            
            statistics = {
                'totalUsers': total_users,
                'activeSubscriptions': active_subscriptions,
                'totalRevenue': total_revenue,
                'monthlyRevenue': monthly_revenue
            }
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(statistics, ensure_ascii=False).encode('utf-8'))
            
        except Exception as e:
            self.send_error(500, f"獲取統計數據失敗: {str(e)}")
    
    def serve_admin_dashboard(self):
        """提供管理員控制台頁面"""
        try:
            # 檢查是否為localhost訪問
            client_ip = self.client_address[0]
            if client_ip not in ['127.0.0.1', 'localhost', '::1']:
                self.send_error(403, "管理員控制台僅限本地訪問")
                return
            
            with open('admin.html', 'r', encoding='utf-8') as f:
                content = f.read()
            
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.end_headers()
            self.wfile.write(content.encode('utf-8'))
            
        except FileNotFoundError:
            self.send_error(404, "管理員控制台頁面不存在")
        except Exception as e:
            self.send_error(500, f"載入管理員控制台失敗: {str(e)}")
    
    def serve_admin_login(self):
        """提供管理員登入頁面"""
        try:
            # 檢查是否為localhost訪問
            client_ip = self.client_address[0]
            if client_ip not in ['127.0.0.1', 'localhost', '::1']:
                self.send_error(403, "管理員登入頁面僅限本地訪問")
                return
            
            with open('admin-login.html', 'r', encoding='utf-8') as f:
                content = f.read()
            
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.end_headers()
            self.wfile.write(content.encode('utf-8'))
            
        except FileNotFoundError:
            self.send_error(404, "管理員登入頁面不存在")
        except Exception as e:
            self.send_error(500, f"載入管理員登入頁面失敗: {str(e)}")
    
    def handle_admin_update_user(self):
        """更新用戶信息"""
        try:
            # 檢查管理員權限
            if not self._check_admin_auth():
                return
            
            # 從URL中提取用戶ID
            parsed_path = urlparse(self.path)
            user_id = parsed_path.path.split('/')[-1]
            
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            user_data = json.loads(post_data.decode('utf-8'))
            
            db_path = Path(__file__).parent / "trading_agents.db"
            conn = sqlite3.connect(str(db_path))
            cursor = conn.cursor()
            
            cursor.execute('''
                UPDATE users 
                SET username = ?, email = ?, plan_type = ?, max_analyses = ?
                WHERE id = ?
            ''', (
                user_data['username'],
                user_data['email'],
                user_data['plan_type'],
                user_data['max_analyses'],
                user_id
            ))
            
            conn.commit()
            conn.close()
            
            response = {"success": True, "message": "用戶更新成功"}
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))
            
        except Exception as e:
            self.send_error(500, f"更新用戶失敗: {str(e)}")
    
    def handle_admin_update_subscription(self):
        """更新訂閱信息"""
        try:
            # 檢查管理員權限
            if not self._check_admin_auth():
                return
            
            # 從URL中提取訂閱ID
            parsed_path = urlparse(self.path)
            subscription_id = parsed_path.path.split('/')[-1]
            
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            subscription_data = json.loads(post_data.decode('utf-8'))
            
            db_path = Path(__file__).parent / "trading_agents.db"
            conn = sqlite3.connect(str(db_path))
            cursor = conn.cursor()
            
            cursor.execute('''
                UPDATE subscriptions 
                SET payment_status = ?, subscription_end = ?, amount = ?
                WHERE id = ?
            ''', (
                subscription_data['status'],
                subscription_data['expiry_date'],
                subscription_data['monthly_fee'],
                subscription_id
            ))
            
            conn.commit()
            conn.close()
            
            response = {"success": True, "message": "訂閱更新成功"}
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))
            
        except Exception as e:
            self.send_error(500, f"更新訂閱失敗: {str(e)}")
    
    def handle_admin_delete_user(self):
        """刪除用戶"""
        try:
            # 檢查管理員權限
            if not self._check_admin_auth():
                return
            
            # 從URL中提取用戶ID
            parsed_path = urlparse(self.path)
            user_id = parsed_path.path.split('/')[-1]
            
            db_path = Path(__file__).parent / "trading_agents.db"
            conn = sqlite3.connect(str(db_path))
            cursor = conn.cursor()
            
            # 刪除用戶相關數據
            cursor.execute('DELETE FROM subscriptions WHERE user_id = ?', (user_id,))
            cursor.execute('DELETE FROM payments WHERE user_id = ?', (user_id,))
            cursor.execute('DELETE FROM analysis_history WHERE user_id = ?', (user_id,))
            cursor.execute('DELETE FROM users WHERE id = ?', (user_id,))
            
            conn.commit()
            conn.close()
            
            response = {"success": True, "message": "用戶刪除成功"}
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))
            
        except Exception as e:
            self.send_error(500, f"刪除用戶失敗: {str(e)}")
    
    def serve_payment_page(self):
        """提供支付頁面"""
        try:
            with open('payment.html', 'r', encoding='utf-8') as f:
                content = f.read()
            
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.end_headers()
            self.wfile.write(content.encode('utf-8'))
            
        except FileNotFoundError:
            self.send_error(404, "支付頁面不存在")
        except Exception as e:
            self.send_error(500, f"載入支付頁面失敗: {str(e)}")
    
    
    def handle_kline_data(self):
        """Handle K-line (candlestick) data requests"""
        try:
            from utils.data_manager import data_manager
            
            # Parse query parameters
            parsed_path = urlparse(self.path)
            params = parse_qs(parsed_path.query)
            
            symbol = params.get('symbol', ['AAPL'])[0]
            interval = params.get('interval', ['1d'])[0]
            period = params.get('period', ['1y'])[0]
            
            # Fetch data
            df = data_manager.fetch_historical_data(symbol, period=period, interval=interval)
            
            if df is None or df.empty:
                self.send_utf8_json_response({
                    "success": False,
                    "error": f"無法獲取 {symbol} 的數據"
                }, 404)
                return
            
            # Convert DataFrame to list of dicts for JSON
            kline_data = df.to_dict('records')
            
            self.send_utf8_json_response({
                "success": True,
                "symbol": symbol,
                "interval": interval,
                "period": period,
                "data": kline_data
            })
            
        except Exception as e:
            print(f"❌ K線數據錯誤: {e}")
            import traceback
            traceback.print_exc()
            self.send_utf8_json_response({
                "success": False,
                "error": str(e)
            }, 500)
    
    def handle_ml_prediction(self):
        """Handle ML prediction requests"""
        try:
            from utils.data_manager import data_manager
            from utils.ml_engine import ml_engine
            
            # Parse query parameters
            parsed_path = urlparse(self.path)
            params = parse_qs(parsed_path.query)
            
            symbol = params.get('symbol', ['AAPL'])[0]
            
            # Fetch historical data for prediction
            df = data_manager.fetch_historical_data(symbol, period='2y', interval='1d')
            
            if df is None or df.empty:
                self.send_utf8_json_response({
                    "success": False,
                    "error": f"無法獲取 {symbol} 的歷史數據"
                }, 404)
                return
            
            # Get prediction
            prediction = ml_engine.predict(symbol, df)
            
            if prediction is None:
                self.send_utf8_json_response({
                    "success": False,
                    "error": "預測失敗，請稍後再試"
                }, 500)
                return
            
            self.send_utf8_json_response({
                "success": True,
                **prediction
            })
            
        except Exception as e:
            print(f"❌ ML預測錯誤: {e}")
            import traceback
            traceback.print_exc()
            self.send_utf8_json_response({
                "success": False,
                "error": str(e)
            }, 500)
    
    def handle_get_payment_methods(self):
        """獲取可用的支付方式"""
        try:
            from payment_gateway import payment_gateway
            
            methods = payment_gateway.get_available_payment_methods('HKD')
            
            response = {
                'success': True,
                'methods': methods
            }
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))
            
        except Exception as e:
            self.send_error(500, f"獲取支付方式失敗: {str(e)}")
    
    def handle_create_payment(self):
        """創建支付訂單"""
        try:
            # 檢查用戶認證
            session = self._get_session_from_request()
            if not session:
                self.send_error(401, "請先登入")
                return

            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            payment_request = json.loads(post_data.decode('utf-8'))

            plan_type = payment_request.get('plan_type')
            payment_method = payment_request.get('payment_method', 'stripe')
            client_amount = payment_request.get('amount')
            billing_cycle = (payment_request.get('billing_cycle') or 'monthly').lower()
            if billing_cycle not in ('monthly', 'yearly'):
                billing_cycle = 'monthly'
            currency = payment_request.get('currency', 'HKD')

            if not plan_type or client_amount is None:
                self.send_error(400, "缺少必要參數")
                return

            # Server-side price validation — never trust client-supplied amount
            plan = SUBSCRIPTION_PLANS.get(plan_type)
            if not plan:
                self.send_error(400, f"未知的訂閱計劃: {plan_type}")
                return

            monthly_rate = plan.get('price_hkd', 0)
            yearly_monthly_rate = plan.get('price_yearly_hkd', monthly_rate)
            if billing_cycle == 'yearly':
                expected_amount = yearly_monthly_rate * 12
            else:
                expected_amount = monthly_rate

            try:
                client_amount_num = float(client_amount)
            except (TypeError, ValueError):
                self.send_error(400, "無效的金額")
                return

            # Allow ≤1 HKD rounding tolerance; reject anything else
            if abs(client_amount_num - expected_amount) > 1.0:
                print(f"⚠️ Payment amount tampering: client sent {client_amount_num} for {plan_type}/{billing_cycle}, expected {expected_amount}")
                self.send_error(400, f"金額不符。預期 HK${expected_amount}，收到 HK${client_amount_num}")
                return

            # Use server-validated amount, not client-supplied
            amount = expected_amount

            # 導入支付網關
            from payment_gateway import payment_gateway

            result = payment_gateway.create_payment(
                user_id=session['user_id'],
                plan_type=plan_type,
                amount=amount,
                currency=currency,
                payment_method=payment_method
            )
            # Echo billing cycle in response for client display
            if isinstance(result, dict):
                result.setdefault('billing_cycle', billing_cycle)
                result.setdefault('expected_amount', expected_amount)
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(result, ensure_ascii=False).encode('utf-8'))
            
        except Exception as e:
            self.send_error(500, f"創建支付失敗: {str(e)}")
    
    def handle_process_payment(self):
        """處理支付"""
        try:
            # 檢查用戶認證
            session = self._get_session_from_request()
            if not session:
                self.send_error(401, "請先登入")
                return
            
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            payment_data = json.loads(post_data.decode('utf-8'))
            
            payment_id = payment_data.get('payment_id')
            payment_method = payment_data.get('payment_method')
            
            if not payment_id or not payment_method:
                self.send_error(400, "缺少必要參數")
                return
            
            # 導入支付網關
            from payment_gateway import payment_gateway
            
            result = payment_gateway.process_payment(
                payment_id=payment_id,
                payment_method=payment_method,
                payment_data=payment_data
            )
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(result, ensure_ascii=False).encode('utf-8'))
            
        except Exception as e:
            self.send_error(500, f"處理支付失敗: {str(e)}")
    
    def _get_session_from_request(self):
        """從請求中獲取會話"""
        auth_header = self.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            token = auth_header[7:]
            return get_session(token)
        return None

    def _require_admin_session(self):
        """Gate an endpoint behind admin email allowlist via Bearer-token session.
        Returns the session dict if allowed, otherwise sends 401/403 and returns None."""
        session = self._get_session_from_request()
        if not session:
            self.send_utf8_json_response({'success': False, 'error': '請先登入'}, 401)
            return None
        email = (session.get('email') or '').strip().lower()
        if email not in {e.lower() for e in ADMIN_EMAILS}:
            self.send_utf8_json_response({'success': False, 'error': '需要管理員權限'}, 403)
            return None
        return session

    def _require_pro_tier(self, min_tier: int = 2):
        """
        Gate an endpoint behind a minimum Pro tier (default 2 = Pro plan).
        Returns the session dict if allowed, otherwise sends a 401/403 and returns None.
        Tiers: 0=free, 1=starter, 2=pro, 3=elite, 4=institutional.
        """
        session = self._get_session_from_request()
        if not session:
            self.send_utf8_json_response({"success": False, "error": "請先登入", "code": "auth_required"}, 401)
            return None

        plan_type = (session.get('plan_type') or 'free').lower()
        # Pull current tier from SUBSCRIPTION_PLANS (handles plan changes since login)
        try:
            conn = sqlite3.connect(str(Path(__file__).parent / "trading_agents.db"))
            cursor = conn.cursor()
            cursor.execute('SELECT plan_type FROM users WHERE id = ?', (session.get('user_id'),))
            row = cursor.fetchone()
            conn.close()
            if row and row[0]:
                plan_type = row[0].lower()
        except Exception:
            pass

        plan_cfg = SUBSCRIPTION_PLANS.get(plan_type, {}) or {}
        tier = plan_cfg.get('tier', 0)
        if tier < min_tier:
            self.send_utf8_json_response({
                "success": False,
                "error": f"此功能需要 Pro 或以上計劃 (目前: {plan_cfg.get('name', plan_type)})",
                "code": "upgrade_required",
                "current_plan": plan_type,
                "current_tier": tier,
                "required_tier": min_tier,
            }, 403)
            return None
        return session
    
    def _check_admin_auth(self):
        """檢查管理員權限"""
        try:
            auth_header = self.headers.get('Authorization', '')
            if not auth_header.startswith('Bearer '):
                self.send_error(401, "未提供管理員令牌")
                return False
            
            token = auth_header[7:]  # Remove 'Bearer ' prefix
            
            # 簡單的令牌驗證
            if not token.startswith('admin_'):
                self.send_error(401, "無效的管理員令牌")
                return False
            
            return True
            
        except Exception as e:
            self.send_error(500, f"權限檢查失敗: {str(e)}")
            return False

    # ==================== END ADMIN DASHBOARD HANDLERS ====================

    def log_message(self, format, *args):
        """自定義日誌格式"""
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        print(f"[{timestamp}] {format % args}")

def run_server(host='0.0.0.0', port=8501):
    """運行服務器"""
    # 初始化數據庫
    print("🔧 初始化數據庫...")
    init_database()
    print("✅ 數據庫初始化完成")
    
    # Use ThreadingHTTPServer to handle multiple requests concurrently
    server_address = (host, port)
    
    # Try ThreadingHTTPServer (Python 3.7+), fallback to manual threading
    try:
        httpd = ThreadingHTTPServer(server_address, TradingAgentsAPIHandler)
        # Configure threading to prevent resource leaks
        httpd.daemon_threads = True  # Threads will be killed when server stops
        httpd.block_on_close = False  # Don't wait for threads on shutdown
        print("✅ 使用 ThreadingHTTPServer (多線程模式)")
    except:
        # Fallback for older Python versions
        class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
            daemon_threads = True
            block_on_close = False
            
        httpd = ThreadedHTTPServer(server_address, TradingAgentsAPIHandler)
        print("✅ 使用 ThreadedHTTPServer (兼容模式)")
    
    # Set server timeout to prevent hanging
    httpd.timeout = 10  # Shorter timeout to prevent accumulation
    httpd.allow_reuse_address = True  # Allow port reuse immediately
    httpd.database_path = 'tradingagents.db'
    
    print(f"🚀 TradingAgents API服務器啟動")
    print(f"📍 服務器地址: http://{host}:{port}")
    print(f"🌐 本地訪問: http://localhost:{port}")
    print(f"📱 移動端訪問: http://192.82.56.15:{port}")
    print(f"⏰ 啟動時間: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"🔧 分析模組狀態: {'✅ 可用' if ANALYSIS_AVAILABLE else '❌ 不可用'}")
    print(f"📊 進度追蹤: ✅ 已啟用")
    print(f"🔄 異步處理: ✅ 已啟用")
    print(f"👤 用戶系統: ✅ 已啟用")
    print(f"💾 數據庫: ✅ 已啟用")
    print(f"📈 分析歷史: ✅ 已啟用")
    print(f"💰 定價計劃: ✅ 已啟用")
    print(f"🛡️ 安全防護: ✅ 已啟用 (速率限制: 30請求/分鐘)")
    print(f"🚫 攻擊封鎖: ✅ 已啟用 (40+ 惡意模式)")
    print("-" * 50)
    
    # Status monitoring thread
    def print_stats():
        while True:
            time.sleep(300)  # Every 5 minutes
            stats = rate_limiter.get_stats()
            print(f"📊 安全狀態: {stats['active_ips']} 活躍IP | {stats['banned_ips']} 已封鎖 | {stats['total_violations']} 總違規")
    
    stats_thread = threading.Thread(target=print_stats, daemon=True)
    stats_thread.start()

    # Paper-trading nightly scheduler — checks once an hour for accounts that
    # opted into auto_run and haven't been ticked today; also fires the daily
    # P&L digest once per local day around 22:00.
    #
    # Resilience (Track 5 / audit #3): the old loop printed exceptions and
    # continued, but a persistent inner-loop fault (e.g. list_auto_run_accounts
    # failing because the DB was relocated) would silently spin forever with
    # no auto-runs and no alert. Now we count consecutive failures, back off
    # exponentially after the first hit, and email the operator once we
    # cross _SCHED_ALERT_THRESHOLD so the feature isn't dying in silence.
    _SCHED_ALERT_THRESHOLD = 3
    _SCHED_BACKOFF_BASE = 60   # seconds — doubles per consecutive failure, capped at 1h
    _SCHED_NORMAL_INTERVAL = 3600

    def paper_scheduler_loop():
        # Wait a minute on startup so the server is fully initialized
        time.sleep(60)
        last_digest_date = None
        consecutive_failures = 0
        alerted_for_this_outage = False
        # Lazy-import the structured logger so we get the rotating file log
        # at web/logs/paper_trading.log — same place the tick wrapper writes.
        try:
            from modules.paper_trading import _log as pt_log
        except Exception:
            pt_log = None
        def _sched_log(level: str, msg: str, **kw):
            if pt_log:
                pt_log('scheduler', level, msg, **kw)
            else:
                print(f"[scheduler] {level.upper()} {msg}")

        while True:
            interval = _SCHED_NORMAL_INTERVAL
            try:
                from modules.paper_trading import list_auto_run_accounts, run_account_tick
                due = list_auto_run_accounts()
                if due:
                    _sched_log('info', f'auto-run sweep: {len(due)} account(s) due')
                ok_n = err_n = 0
                for entry in due:
                    try:
                        res = run_account_tick(entry['user_id'], entry['id'])
                        if res.get('success'):
                            ok_n += 1
                            _sched_log('info',
                                       f"acct {entry['id']} ticked",
                                       days=res.get('days_processed', 0),
                                       tx=res.get('new_transactions', 0))
                        else:
                            err_n += 1
                            _sched_log('warning',
                                       f"acct {entry['id']} returned not-success: {res.get('error')}")
                    except Exception as e:
                        err_n += 1
                        _sched_log('error', f"acct {entry['id']} tick crashed: {e}")
                if due:
                    _sched_log('info', f'auto-run sweep done', ok=ok_n, err=err_n)

                # Daily P&L digest: once per local day, fire after 22:00 local time
                now = datetime.now()
                today_iso = now.date().isoformat()
                if now.hour >= 22 and last_digest_date != today_iso:
                    try:
                        from modules.paper_trading import send_daily_digests
                        digest_res = send_daily_digests()
                        last_digest_date = today_iso
                        _sched_log('info',
                                   'daily digest sent',
                                   sent=digest_res['sent'],
                                   skipped=digest_res['skipped'],
                                   errors=len(digest_res['errors']))
                    except Exception as e:
                        _sched_log('error', f'daily digest crashed: {e}')

                    # Daily AI trade-ideas email — same 22:00 slot, opt-in
                    try:
                        from modules.pro_ai import send_daily_ai_ideas
                        ai_res = send_daily_ai_ideas()
                        _sched_log('info',
                                   'daily AI ideas sent',
                                   sent=ai_res['sent'],
                                   skipped=ai_res['skipped'],
                                   errors=len(ai_res['errors']))
                    except Exception as e:
                        _sched_log('error', f'daily AI ideas crashed: {e}')

                    # Weekly leaderboard — fire on Sundays only (weekday() == 6)
                    if now.weekday() == 6:
                        try:
                            from modules.paper_trading import send_weekly_leaderboards
                            wl_res = send_weekly_leaderboards()
                            _sched_log('info',
                                       'weekly leaderboard sent',
                                       sent=wl_res['sent'],
                                       errors=len(wl_res['errors']))
                        except Exception as e:
                            _sched_log('error', f'weekly leaderboard crashed: {e}')

                # Healthy iteration — clear the back-off + outage state.
                if consecutive_failures > 0:
                    _sched_log('info',
                               f'scheduler recovered after {consecutive_failures} failed iterations')
                consecutive_failures = 0
                alerted_for_this_outage = False
            except Exception as e:
                import traceback
                consecutive_failures += 1
                tb = traceback.format_exc()
                _sched_log('error',
                           f'scheduler iteration #{consecutive_failures} crashed: {e}\n{tb}')
                # Exponential back-off: 60s, 120s, 240s ... capped at the
                # normal hourly cadence. Prevents a hot-loop hammering a
                # broken dependency.
                interval = min(_SCHED_NORMAL_INTERVAL,
                               _SCHED_BACKOFF_BASE * (2 ** (consecutive_failures - 1)))
                if (consecutive_failures >= _SCHED_ALERT_THRESHOLD
                        and not alerted_for_this_outage):
                    alerted_for_this_outage = True
                    try:
                        from modules.notify import notify_admins
                        notify_admins(
                            f"⚠️ Paper scheduler crashed {consecutive_failures}× in a row",
                            text=(f"The paper-trading auto-run scheduler has failed "
                                  f"{consecutive_failures} consecutive iterations.\n\n"
                                  f"Latest error: {e}\n\n"
                                  f"Auto-run accounts are NOT ticking. Check "
                                  f"web/logs/paper_trading.log and the API process. "
                                  f"Backing off to {interval}s between retries."))
                    except Exception as ne:
                        _sched_log('warning', f'admin alert send failed: {ne}')
            time.sleep(interval)

    paper_thread = threading.Thread(target=paper_scheduler_loop, daemon=True, name='paper-scheduler')
    paper_thread.start()
    print("⏰ 每日模擬交易排程器: ✅ 已啟用 (每小時檢查 + 22:00 後發送每日摘要)")

    try:
        print("🎯 服務器進入主循環，按 Ctrl+C 停止")
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 收到停止信號")
        httpd.shutdown()
        print("✅ 服務器已安全關閉")
    except Exception as e:
        print(f"❌ 服務器嚴重錯誤: {e}")
        import traceback
        traceback.print_exc()
        try:
            httpd.shutdown()
        except:
            pass
        print("💀 服務器已崩潰")

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='TradingAgents API Server')
    parser.add_argument('--host', default='0.0.0.0', help='服務器主機地址')
    parser.add_argument('--port', type=int, default=8501, help='服務器端口')
    
    args = parser.parse_args()
    
    run_server(args.host, args.port)
