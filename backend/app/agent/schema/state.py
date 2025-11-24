"""
State Schema - The 2x2 extraction model.

                    | State (what IS)  | Event (what HAPPENED)
--------------------|------------------|----------------------
Permanent           | TRAIT            | GATE
Fluid               | MODE             | SIGNAL

- TRAIT = permanent state -> who the user IS (skill_level, use_case)
- GATE  = permanent event -> what HAS happened (interest_confirmed, link_sent)
- MODE  = fluid state -> where we ARE now (discovery, objection_handling)
- SIGNAL = fluid event -> what JUST happened (intent: objection)
"""

from __future__ import annotations
from typing import Optional, Literal, Union, TYPE_CHECKING
from pydantic import BaseModel, Field

if TYPE_CHECKING:
    from .rules import Condition


class Gate(BaseModel):
    """
    Cumulative checkpoint - once set, stays set.
    Controls what content is allowed.
    Condition defines when this gate becomes True.
    """
    id: str
    name: str
    required_for: list[str] = Field(default_factory=list, description="Labels this gate unlocks")
    enforcement: Literal["hard", "soft"] = "soft"
    condition: Optional["Condition"] = Field(None, description="Condition that sets this gate")


class Trait(BaseModel):
    """
    Persistent user characteristic - detected early, branches content.
    """
    id: str
    name: str
    type: Literal["enum", "string", "boolean"] = "string"
    options: list[str] = Field(default_factory=list, description="Valid values if type=enum")
    detection_hint: str = Field("", description="Helps LLM extract this trait")


class Objective(BaseModel):
    """
    A goal to pursue in a mode - guides ending questions.
    """
    target: str = Field(..., description="What to fill: 'trait.skill_level' or 'gate.interest_confirmed'")
    hint: str = Field(..., description="Question guidance: 'Pergunte sobre experiência musical'")


class Mode(BaseModel):
    """
    Current conversational focus - shifts fluidly per-message.

    Modes define HOW to respond:
    - What content to inject (default_labels)
    - How to behave (instructions)
    - What to avoid (avoid)

    Objectives (WHAT to discover) are global, not per-mode.
    Rules decide WHEN to shift modes, Mode defines HOW to behave once there.
    """
    id: str
    name: str
    default_labels: list[str] = Field(default_factory=list, description="Labels to inject when in this mode")
    instructions: str = Field("", description="How to behave in this mode - injected into system prompt")
    avoid: list[str] = Field(default_factory=list, description="What NOT to do in this mode")


class Signal(BaseModel):
    """
    Per-message detection - ephemeral, triggers reactions.
    """
    id: str
    name: str
    type: Literal["enum", "string", "boolean"] = "enum"
    options: list[str] = Field(default_factory=list, description="Valid values if type=enum")
    detection_hint: str = Field("", description="Helps LLM detect this signal")


SignalValue = Union[str, list[str], None]


class RuntimeState(BaseModel):
    """
    Runtime state object - current state of the conversation.

    2x2 model:
    - Gates: permanent events (cumulative checkpoints)
    - Traits: permanent state (user characteristics)
    - Mode: fluid state (current conversational focus)
    - Signals: fluid events (string=ephemeral, list=accumulated)
    """
    gates: dict[str, bool] = Field(default_factory=dict)
    traits: dict[str, Optional[str]] = Field(default_factory=dict)
    mode: str = "conexao"
    signals: dict[str, SignalValue] = Field(default_factory=dict)
    last_message: str = ""
    turn_count: int = 0


class ExtractionResult(BaseModel):
    """
    Result of the extraction pipeline stage.
    Contains all detected/updated state.
    """
    # What was detected this turn
    signals: dict[str, Optional[str]] = Field(default_factory=dict)

    # Updates to apply (only changed values)
    trait_updates: dict[str, str] = Field(default_factory=dict)
    gate_updates: dict[str, bool] = Field(default_factory=dict)
    mode_shift: Optional[str] = None

    # For debugging/logging
    reasoning: str = ""
