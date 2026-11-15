import json
import os
import logging
from app.config import settings

logger = logging.getLogger(__name__)

_automations_cache = None


def load_automations() -> list[dict]:
    global _automations_cache
    if _automations_cache is not None:
        return _automations_cache
    
    filepath = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), settings.automations_file)
    try:
        with open(filepath, "r") as f:
            data = json.load(f)
        _automations_cache = data.get("automations", [])
        logger.info(f"Loaded {len(_automations_cache)} automation rules from {filepath}")
        return _automations_cache
    except FileNotFoundError:
        logger.warning(f"Automations file not found: {filepath}")
        return []
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON in automations file: {e}")
        return []


def reload_automations():
    global _automations_cache
    _automations_cache = None
    return load_automations()


def match_automation(ticket_payload: dict) -> dict | None:
    """Match a ticket against automation rules based on conditions."""
    automations = load_automations()
    category = ticket_payload.get("category", "")
    
    for auto in automations:
        conditions = auto.get("conditions", {})
        match = True
        for key, value in conditions.items():
            ticket_value = ticket_payload.get(key, "")
            if str(ticket_value).lower() != str(value).lower():
                match = False
                break
        if match:
            logger.info(f"Matched automation: {auto['name']} for category={category}")
            return auto
    
    logger.info(f"No automation matched for payload keys: {list(ticket_payload.keys())}")
    return None
