"""
External Integrations - Third-party service connections (STUBBED).

For internal tools (calendar, kanban), use agent/tools/ which
access models directly.

This folder is for EXTERNAL services only:
- google_calendar: Sync with Google Calendar
- calendly: Calendly integration
- slack: Send Slack notifications

STUB: Not implemented. Will be built when user demand requires it.
"""

# Placeholder for future integrations
AVAILABLE_INTEGRATIONS = {
    "google_calendar": {
        "name": "Google Calendar",
        "description": "Sync appointments with Google Calendar",
        "status": "stub",
    },
    "calendly": {
        "name": "Calendly",
        "description": "Calendly booking integration",
        "status": "stub",
    },
    "slack": {
        "name": "Slack",
        "description": "Send notifications to Slack",
        "status": "stub",
    },
}


def get_integration(name: str):
    """Get an integration by name. Returns None if not implemented."""
    if name not in AVAILABLE_INTEGRATIONS:
        return None

    integration = AVAILABLE_INTEGRATIONS[name]
    if integration["status"] == "stub":
        raise NotImplementedError(f"Integration '{name}' is not yet implemented")

    return None  # Will return actual integration class when implemented
