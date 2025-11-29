#!/usr/bin/env python3
"""
Comprehensive Agent Tool Testing Script

Tests: calendar, kanban, multi-turn conversations, edge cases
Output: Detailed JSONL logs + JSON summary report

Usage:
    python test_agent_tools.py [agent_id] [--scenario SCENARIO]

Examples:
    python test_agent_tools.py 5                    # Run all scenarios for agent 5
    python test_agent_tools.py 5 --scenario booking # Run only booking scenario
    python test_agent_tools.py 5 --list            # List available scenarios
"""

import asyncio
import json
import sys
import argparse
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

import httpx

BASE_URL = "http://localhost:5460/api/v1"
LOG_DIR = Path("/opt/connectai/logs/tests")
LOG_DIR.mkdir(parents=True, exist_ok=True)


class AgentTester:
    """Test runner for agent conversations with full logging."""

    def __init__(self, agent_id: int, test_name: str):
        self.agent_id = agent_id
        self.test_name = test_name
        self.thread_id = f"test_{test_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        self.log_file = LOG_DIR / f"{self.thread_id}.jsonl"
        self.results = {
            "test_name": test_name,
            "agent_id": agent_id,
            "thread_id": self.thread_id,
            "started_at": datetime.now().isoformat(),
            "turns": [],
            "total_tokens_in": 0,
            "total_tokens_out": 0,
            "total_tokens": 0,
            "total_tool_calls": 0,
            "tools_used": {},
            "errors": [],
            "latency_total": 0.0,
        }

    async def send_message(self, message: str, expected_tool: Optional[str] = None) -> dict:
        """Send message and log response with full details."""
        async with httpx.AsyncClient(timeout=120) as client:
            start = datetime.now()

            try:
                response = await client.post(
                    f"{BASE_URL}/chat/chat",
                    json={
                        "message": message,
                        "agent_id": self.agent_id,
                        "thread_id": self.thread_id
                    }
                )
                elapsed = (datetime.now() - start).total_seconds()

                if response.status_code != 200:
                    error = {
                        "turn": len(self.results["turns"]) + 1,
                        "error": f"HTTP {response.status_code}",
                        "detail": response.text[:500]
                    }
                    self.results["errors"].append(error)
                    print(f"  ERROR: HTTP {response.status_code}")
                    return {"error": response.status_code}

                data = response.json()

            except Exception as e:
                elapsed = (datetime.now() - start).total_seconds()
                error = {
                    "turn": len(self.results["turns"]) + 1,
                    "error": str(type(e).__name__),
                    "detail": str(e)
                }
                self.results["errors"].append(error)
                print(f"  ERROR: {e}")
                return {"error": str(e)}

            # Extract token info
            tokens_in = data.get("tokens_in", 0)
            tokens_out = data.get("tokens_out", 0)
            tokens_total = data.get("tokens_used", tokens_in + tokens_out)

            # Extract tool calls
            tool_calls = data.get("tool_calls_made", [])

            # Extract message content (handles both string and object formats)
            raw_messages = data.get("messages", [])
            if raw_messages and isinstance(raw_messages[0], dict):
                agent_messages = [m.get("content", "") for m in raw_messages]
            else:
                agent_messages = raw_messages

            # Build turn record
            turn = {
                "turn": len(self.results["turns"]) + 1,
                "timestamp": datetime.now().isoformat(),
                "user_message": message,
                "agent_response": agent_messages,
                "tokens_in": tokens_in,
                "tokens_out": tokens_out,
                "tokens_total": tokens_total,
                "tool_calls": tool_calls,
                "latency_seconds": round(elapsed, 2),
                "escalation": data.get("escalation"),
                "expected_tool": expected_tool,
                "tool_match": expected_tool in [t.get("name") for t in tool_calls] if expected_tool else None
            }

            # Update totals
            self.results["turns"].append(turn)
            self.results["total_tokens_in"] += tokens_in
            self.results["total_tokens_out"] += tokens_out
            self.results["total_tokens"] += tokens_total
            self.results["latency_total"] += elapsed

            # Track tool usage
            for tool in tool_calls:
                tool_name = tool.get("name", "unknown")
                self.results["tools_used"][tool_name] = self.results["tools_used"].get(tool_name, 0) + 1
                self.results["total_tool_calls"] += 1

            # Write to log file
            with open(self.log_file, "a") as f:
                f.write(json.dumps(turn, default=str) + "\n")

            # Print progress
            tool_str = f" [{', '.join(t.get('name', '?') for t in tool_calls)}]" if tool_calls else ""
            response_preview = (agent_messages[0] if agent_messages else "")[:60]
            print(f"  Turn {turn['turn']}: {tokens_total} tokens, {elapsed:.1f}s{tool_str}")
            print(f"    User: {message[:50]}...")
            print(f"    Agent: {response_preview}...")

            return data

    async def run_conversation(self, messages: list) -> dict:
        """Run a multi-turn conversation.

        Messages can be:
        - str: simple message
        - dict: {"message": "...", "expected_tool": "tool_name"}
        """
        print(f"\n{'='*60}")
        print(f"SCENARIO: {self.test_name}")
        print(f"Thread: {self.thread_id}")
        print(f"{'='*60}")

        for item in messages:
            if isinstance(item, str):
                msg = item
                expected_tool = None
            else:
                msg = item.get("message", item.get("msg", ""))
                expected_tool = item.get("expected_tool")

            await self.send_message(msg, expected_tool)
            await asyncio.sleep(0.5)  # Natural delay between turns

        self.results["ended_at"] = datetime.now().isoformat()
        self.results["duration_seconds"] = round(self.results["latency_total"], 2)

        return self.results

    def save_summary(self) -> Path:
        """Save detailed test summary."""
        summary_file = LOG_DIR / f"{self.thread_id}_summary.json"

        # Calculate metrics
        num_turns = len(self.results["turns"])
        self.results["metrics"] = {
            "avg_tokens_per_turn": round(self.results["total_tokens"] / num_turns, 1) if num_turns else 0,
            "avg_latency_seconds": round(self.results["latency_total"] / num_turns, 2) if num_turns else 0,
            "tool_call_rate": round(self.results["total_tool_calls"] / num_turns, 2) if num_turns else 0,
            "error_rate": round(len(self.results["errors"]) / num_turns, 2) if num_turns else 0,
        }

        # Cost estimation (approximate for Gemini Flash)
        # Input: ~$0.075/1M tokens, Output: ~$0.30/1M tokens
        input_cost = self.results["total_tokens_in"] * 0.000000075
        output_cost = self.results["total_tokens_out"] * 0.0000003
        self.results["estimated_cost_usd"] = round(input_cost + output_cost, 6)

        with open(summary_file, "w") as f:
            json.dump(self.results, f, indent=2, default=str)

        return summary_file


# =============================================================================
# TEST SCENARIOS
# =============================================================================

def get_next_weekday(weekday: int) -> str:
    """Get next occurrence of weekday (0=Mon, 6=Sun) in YYYY-MM-DD format."""
    today = datetime.now().date()
    days_ahead = weekday - today.weekday()
    if days_ahead <= 0:
        days_ahead += 7
    next_date = today + timedelta(days=days_ahead)
    return next_date.strftime("%Y-%m-%d")


def get_scenarios() -> dict:
    """Define all test scenarios."""

    # Get dates for booking tests
    next_wednesday = get_next_weekday(2)  # Wednesday
    next_friday = get_next_weekday(4)     # Friday
    next_sunday = get_next_weekday(6)     # Sunday (closed)

    return {
        "booking_happy_path": {
            "description": "Complete booking flow: greeting -> info -> availability -> book",
            "messages": [
                "Oi, quero agendar um banho pro meu cachorro",
                "É um golden retriever, nome Rex, ele tem uns 30kg",
                {"message": f"Pode ser na {next_wednesday.split('-')[2]}/{next_wednesday.split('-')[1]} às 10h com a Marina?", "expected_tool": "check_availability"},
                {"message": "Isso, pode confirmar. Meu nome é Carlos e telefone 11999998888", "expected_tool": "book_appointment"},
            ]
        },

        "booking_with_questions": {
            "description": "Booking with price questions mid-flow",
            "messages": [
                "Boa tarde! Quero agendar um banho",
                "Quanto custa o banho pra cachorro grande?",
                "Ok, e demora quanto tempo?",
                "Beleza, quero agendar então. Meu cachorro é um labrador",
                {"message": f"Pode ser {next_wednesday}?", "expected_tool": "check_availability"},
                {"message": "15h tá bom. Maria, 11988887777", "expected_tool": "book_appointment"},
            ]
        },

        "task_creation": {
            "description": "Follow-up task creation for customer with allergy",
            "messages": [
                "Oi, meu cachorro tem alergia a shampoo comum",
                "Vocês têm produtos especiais pra pele sensível?",
                {"message": "Pode anotar pra me ligarem sobre isso? Meu nome é João, 11977776666", "expected_tool": "create_task"},
            ]
        },

        "task_urgent": {
            "description": "Urgent task for customer complaint",
            "messages": [
                "Olá, estou com um problema sério",
                "Meu cachorro voltou do banho com uma irritação na pele",
                {"message": "Preciso que alguém me ligue urgente. Ana, 11966665555", "expected_tool": "create_task"},
            ]
        },

        "edge_sunday": {
            "description": "Try to book on Sunday (closed)",
            "messages": [
                "Quero agendar um banho pro domingo",
            ]
        },

        "edge_past_date": {
            "description": "Try to book in the past",
            "messages": [
                "Quero agendar pra ontem",
            ]
        },

        "edge_vague_price": {
            "description": "Vague price question without service",
            "messages": [
                "Quanto custa?",
            ]
        },

        "edge_multi_pet": {
            "description": "Multiple pets booking request",
            "messages": [
                "Tenho 2 cachorros, quero agendar os dois no mesmo dia",
                "Um é pequeno e outro é grande",
                {"message": f"Pode ser na {next_friday}?", "expected_tool": "check_availability"},
            ]
        },

        "faq_questions": {
            "description": "FAQ-based questions",
            "messages": [
                "Posso ficar com meu cachorro durante o banho?",
                "E se meu cachorro for agressivo?",
                "Preciso levar alguma coisa?",
            ]
        },

        "cancel_flow": {
            "description": "Try to cancel a booking (may fail if no booking exists)",
            "messages": [
                "Preciso cancelar meu agendamento",
                {"message": "Código TESTE123", "expected_tool": "cancel_appointment"},
            ]
        },

        "info_questions": {
            "description": "Business info questions",
            "messages": [
                "Qual o horário de funcionamento?",
                "Onde vocês ficam?",
                "Aceitam cartão?",
            ]
        },

        "cat_booking": {
            "description": "Cat-specific service booking",
            "messages": [
                "Vocês atendem gatos?",
                "Quero agendar um banho pra minha gata Luna",
                {"message": f"Pode ser na {next_friday} com a Ana?", "expected_tool": "check_availability"},
            ]
        },
    }


# =============================================================================
# REPORT GENERATION
# =============================================================================

def generate_report(all_results: list) -> Path:
    """Generate comprehensive test report."""

    report_file = LOG_DIR / f"report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"

    # Aggregate metrics
    total_tokens = sum(r["total_tokens"] for r in all_results)
    total_turns = sum(len(r["turns"]) for r in all_results)
    total_tool_calls = sum(r["total_tool_calls"] for r in all_results)
    total_errors = sum(len(r["errors"]) for r in all_results)
    total_cost = sum(r.get("estimated_cost_usd", 0) for r in all_results)

    # Aggregate tool usage
    all_tools = {}
    for r in all_results:
        for tool, count in r.get("tools_used", {}).items():
            all_tools[tool] = all_tools.get(tool, 0) + count

    # Build report
    report = {
        "generated_at": datetime.now().isoformat(),
        "summary": {
            "scenarios_run": len(all_results),
            "total_turns": total_turns,
            "total_tokens": total_tokens,
            "total_tokens_in": sum(r["total_tokens_in"] for r in all_results),
            "total_tokens_out": sum(r["total_tokens_out"] for r in all_results),
            "total_tool_calls": total_tool_calls,
            "total_errors": total_errors,
            "estimated_cost_usd": round(total_cost, 6),
        },
        "averages": {
            "tokens_per_turn": round(total_tokens / total_turns, 1) if total_turns else 0,
            "tokens_per_scenario": round(total_tokens / len(all_results), 1) if all_results else 0,
            "tool_calls_per_scenario": round(total_tool_calls / len(all_results), 2) if all_results else 0,
        },
        "tool_usage": all_tools,
        "scenarios": [
            {
                "name": r["test_name"],
                "turns": len(r["turns"]),
                "tokens": r["total_tokens"],
                "tool_calls": r["total_tool_calls"],
                "tools_used": list(r.get("tools_used", {}).keys()),
                "errors": len(r["errors"]),
                "duration_seconds": r.get("duration_seconds", 0),
            }
            for r in all_results
        ],
        "full_results": all_results,
    }

    with open(report_file, "w") as f:
        json.dump(report, f, indent=2, default=str)

    # Print summary
    print("\n" + "=" * 60)
    print("TEST REPORT SUMMARY")
    print("=" * 60)
    print(f"Scenarios run: {len(all_results)}")
    print(f"Total turns: {total_turns}")
    print(f"Total tokens: {total_tokens:,}")
    print(f"  - Input: {report['summary']['total_tokens_in']:,}")
    print(f"  - Output: {report['summary']['total_tokens_out']:,}")
    print(f"Total tool calls: {total_tool_calls}")
    print(f"Errors: {total_errors}")
    print(f"Estimated cost: ${total_cost:.6f}")
    print()
    print("Tool usage:")
    for tool, count in sorted(all_tools.items(), key=lambda x: -x[1]):
        print(f"  - {tool}: {count}")
    print()
    print(f"Report saved: {report_file}")
    print("=" * 60)

    return report_file


# =============================================================================
# MAIN
# =============================================================================

async def run_all_tests(agent_id: int, scenario_filter: Optional[str] = None):
    """Run all or selected test scenarios."""

    scenarios = get_scenarios()

    if scenario_filter:
        if scenario_filter not in scenarios:
            print(f"Unknown scenario: {scenario_filter}")
            print(f"Available: {', '.join(scenarios.keys())}")
            return
        scenarios = {scenario_filter: scenarios[scenario_filter]}

    all_results = []

    for name, scenario in scenarios.items():
        print(f"\n>>> Running: {name}")
        print(f"    {scenario['description']}")

        tester = AgentTester(agent_id, name)
        result = await tester.run_conversation(scenario["messages"])
        tester.save_summary()
        all_results.append(result)

        # Brief pause between scenarios
        await asyncio.sleep(1)

    # Generate final report
    generate_report(all_results)


def main():
    parser = argparse.ArgumentParser(description="Test agent tools and conversations")
    parser.add_argument("agent_id", type=int, nargs="?", default=5, help="Agent ID to test (default: 5)")
    parser.add_argument("--scenario", "-s", type=str, help="Run specific scenario only")
    parser.add_argument("--list", "-l", action="store_true", help="List available scenarios")

    args = parser.parse_args()

    if args.list:
        scenarios = get_scenarios()
        print("Available scenarios:")
        for name, s in scenarios.items():
            print(f"  - {name}: {s['description']}")
        return

    print(f"Testing agent ID: {args.agent_id}")
    print(f"Logs directory: {LOG_DIR}")

    asyncio.run(run_all_tests(args.agent_id, args.scenario))


if __name__ == "__main__":
    main()
