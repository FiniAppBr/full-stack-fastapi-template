"""
v3 Pipeline - Processing stages for agent conversations.

Stages:
1. extract - Extract traits, intent, objection from user message
2. assemble - Build context from RAG + select examples
3. generate - Generate response using LLM
4. post_process - Detect events, calculate timing
"""

from app.agent.v3.pipeline.extract import extract
from app.agent.v3.pipeline.assemble import assemble
from app.agent.v3.pipeline.generate import generate
from app.agent.v3.pipeline.post_process import post_process

__all__ = ["extract", "assemble", "generate", "post_process"]
