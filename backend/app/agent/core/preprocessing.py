"""
Preprocessing module for agent input normalization.

Handles:
- Date parsing (relative dates like "sábado", "amanhã" → YYYY-MM-DD)
- Time extraction ("às 10h", "10:00" → HH:MM format)

All other data extraction (names, entities, etc.) is handled by the LLM.
"""
from datetime import datetime, timedelta
import re
from typing import Optional


# =============================================================================
# DATE PARSING
# =============================================================================

WEEKDAY_MAP = {
    "segunda": 0, "segunda-feira": 0,
    "terça": 1, "terca": 1, "terça-feira": 1,
    "quarta": 2, "quarta-feira": 2,
    "quinta": 3, "quinta-feira": 3,
    "sexta": 4, "sexta-feira": 4,
    "sábado": 5, "sabado": 5,
    "domingo": 6,
}

MONTH_MAP = {
    "janeiro": 1, "fevereiro": 2, "março": 3, "marco": 3,
    "abril": 4, "maio": 5, "junho": 6,
    "julho": 7, "agosto": 8, "setembro": 9,
    "outubro": 10, "novembro": 11, "dezembro": 12,
}


def parse_relative_date(text: str) -> Optional[str]:
    """
    Convert relative dates to YYYY-MM-DD format.

    Examples:
        "sábado" → "2025-12-06"
        "amanhã" → "2025-11-30"
        "próxima segunda" → "2025-12-01"
        "dia 15" → "2025-12-15"
    """
    text_lower = text.lower()
    today = datetime.now()

    # "hoje"
    if "hoje" in text_lower:
        return today.strftime("%Y-%m-%d")

    # "amanhã"
    if "amanhã" in text_lower or "amanha" in text_lower:
        target = today + timedelta(days=1)
        return target.strftime("%Y-%m-%d")

    # "depois de amanhã"
    if "depois de amanhã" in text_lower or "depois de amanha" in text_lower:
        target = today + timedelta(days=2)
        return target.strftime("%Y-%m-%d")

    # Weekday names: "segunda", "sábado", etc.
    for day_name, weekday in WEEKDAY_MAP.items():
        if day_name in text_lower:
            days_ahead = weekday - today.weekday()
            if days_ahead <= 0:  # Target day already passed this week
                days_ahead += 7
            target = today + timedelta(days=days_ahead)
            return target.strftime("%Y-%m-%d")

    # "dia X" pattern (e.g., "dia 15", "dia 5 de dezembro")
    day_match = re.search(r'dia\s+(\d{1,2})', text_lower)
    if day_match:
        day = int(day_match.group(1))
        # Check for month name
        target_month = today.month
        target_year = today.year
        for month_name, month_num in MONTH_MAP.items():
            if month_name in text_lower:
                target_month = month_num
                if month_num < today.month:
                    target_year += 1
                break
        else:
            # No month specified, use current or next month
            if day < today.day:
                target_month = today.month + 1
                if target_month > 12:
                    target_month = 1
                    target_year += 1
        try:
            target = datetime(target_year, target_month, day)
            return target.strftime("%Y-%m-%d")
        except ValueError:
            pass  # Invalid date

    # DD/MM pattern (e.g., "05/12", "5/12")
    ddmm_match = re.search(r'(\d{1,2})/(\d{1,2})', text)
    if ddmm_match:
        day = int(ddmm_match.group(1))
        month = int(ddmm_match.group(2))
        year = today.year
        if month < today.month or (month == today.month and day < today.day):
            year += 1
        try:
            target = datetime(year, month, day)
            return target.strftime("%Y-%m-%d")
        except ValueError:
            pass

    # Already in YYYY-MM-DD format
    iso_match = re.search(r'\d{4}-\d{2}-\d{2}', text)
    if iso_match:
        return iso_match.group()

    return None


def parse_time(text: str) -> Optional[str]:
    """
    Extract time from text in HH:MM format.

    Examples:
        "às 10h" → "10:00"
        "10:30" → "10:30"
        "14 horas" → "14:00"
        "meio-dia" → "12:00"
    """
    text_lower = text.lower()

    # "meio-dia" / "meia-noite"
    if "meio-dia" in text_lower or "meio dia" in text_lower:
        return "12:00"
    if "meia-noite" in text_lower or "meia noite" in text_lower:
        return "00:00"

    # HH:MM format
    time_match = re.search(r'(\d{1,2}):(\d{2})', text)
    if time_match:
        hour = int(time_match.group(1))
        minute = int(time_match.group(2))
        if 0 <= hour <= 23 and 0 <= minute <= 59:
            return f"{hour:02d}:{minute:02d}"

    # "Xh" or "X horas" format
    hour_match = re.search(r'(\d{1,2})\s*h(?:oras?)?', text_lower)
    if hour_match:
        hour = int(hour_match.group(1))
        if 0 <= hour <= 23:
            return f"{hour:02d}:00"

    # Just a number in context of time (e.g., "às 10", "as 14")
    time_context = re.search(r'[àa]s?\s+(\d{1,2})(?!\d)', text_lower)
    if time_context:
        hour = int(time_context.group(1))
        if 0 <= hour <= 23:
            return f"{hour:02d}:00"

    return None


# =============================================================================
# COMBINED PREPROCESSING
# =============================================================================

def preprocess_message(text: str) -> dict:
    """
    Preprocessing pipeline for user message.
    Only handles date/time normalization.

    Returns dict with:
        - normalized_date: YYYY-MM-DD if date found
        - normalized_time: HH:MM if time found
    """
    result = {}

    # Date
    date = parse_relative_date(text)
    if date:
        result["normalized_date"] = date

    # Time
    time = parse_time(text)
    if time:
        result["normalized_time"] = time

    return result
