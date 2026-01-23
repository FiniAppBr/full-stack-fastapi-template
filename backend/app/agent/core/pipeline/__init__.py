"""
Pipeline nodes for the agent LangGraph.

Each node has a single responsibility:
- preprocess: Date/time normalization
- assemble: RAG context assembly + prompt building
- agent: ReAct tool loop
- tools: Tool execution
- extract: Data extraction from conversation
- generate: Response generation
- validate: Post-generation validation
- post_process: Timing + data sync
- routing: Graph routing decisions
"""

from app.agent.core.pipeline.preprocess import preprocess_node
from app.agent.core.pipeline.assemble import assemble, assemble_node, get_tool_context
from app.agent.core.pipeline.agent import agent_node, MAX_REACT_ITERATIONS
from app.agent.core.pipeline.tools import tools_node
from app.agent.core.pipeline.extract import extract_data_node
from app.agent.core.pipeline.generate import generate_node
from app.agent.core.pipeline.validate import validate_node
from app.agent.core.pipeline.post_process import post_process_node
from app.agent.core.pipeline.routing import (
    should_continue_after_agent,
    should_continue_after_tools,
    should_retry_generation,
    MAX_VALIDATION_RETRIES,
)

__all__ = [
    # Nodes
    "preprocess_node",
    "assemble",
    "assemble_node",
    "agent_node",
    "tools_node",
    "extract_data_node",
    "generate_node",
    "validate_node",
    "post_process_node",
    # Routing
    "should_continue_after_agent",
    "should_continue_after_tools",
    "should_retry_generation",
    # Helpers
    "get_tool_context",
    # Constants
    "MAX_REACT_ITERATIONS",
    "MAX_VALIDATION_RETRIES",
]
