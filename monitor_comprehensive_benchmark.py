#!/usr/bin/env python3
# mypy: ignore-errors
"""
Monitor the comprehensive RAG quality benchmark test with table-based reporting.
Tracks progress across MiniLM (384d), SciBERT (768d), and MPNet (768d) with new metrics.
"""

import re
from datetime import UTC, datetime
from pathlib import Path
from typing import Any


def parse_comprehensive_benchmark_progress(log_file: str = "full_benchmark_fixed.log") -> dict[str, Any]:
    """Parse the comprehensive benchmark log and extract detailed progress."""

    try:
        with Path(log_file).open() as f:
            content = f.read()
    except FileNotFoundError:
        return {"error": "Log file not found"}

    progress = {
        "current_time": datetime.now(UTC).strftime("%H:%M:%S"),
        "models": {
            "minilm_2000": {"status": "pending", "queries_completed": 0},
            "scibert_2000": {"status": "pending", "queries_completed": 0},
            "mpnet_2000": {"status": "pending", "queries_completed": 0},
        },
        "current_model": None,
        "current_query": None,
        "overall_progress": {"completed": 0, "total": 15},
        "status": "unknown",
        "new_features": {
            "comprehensive_tables": "enabled",
            "all_metrics_displayed": "enabled",
            "csv_export": "enabled",
        },
    }

    # Track which models have started
    model_starts = re.findall(r'"config":"(\w+)".*"event":"🧪 Testing configuration', content)
    for model in model_starts:
        if model in progress["models"]:
            progress["models"][model]["status"] = "started"

    # Track completed configurations
    config_completions = re.findall(r'"config":"(\w+)".*"event":"🎯 RAG pipeline configuration completed', content)
    for model in config_completions:
        if model in progress["models"]:
            progress["models"][model]["status"] = "completed"
            progress["models"][model]["queries_completed"] = 5

    # Find current model being processed
    current_configs = re.findall(r'"config":"(\w+)"', content)
    if current_configs:
        current_model = current_configs[-1]
        progress["current_model"] = current_model

        # Count completed evaluations for current model
        if current_model in progress["models"]:
            eval_pattern = rf'"config":"{current_model}".*"event":"✅ AI evaluation completed"'
            completed_evals = re.findall(eval_pattern, content)
            progress["models"][current_model]["queries_completed"] = len(completed_evals)

            if progress["models"][current_model]["status"] != "completed":
                progress["models"][current_model]["status"] = "running"

    # Find current query
    current_query_match = re.findall(r'"query":"([^"]+)".*"event":"🔍 Testing RAG retrieval"', content)
    if current_query_match:
        progress["current_query"] = current_query_match[-1][:50] + "..."

    # Calculate overall progress
    model_values = list(progress["models"].values())
    total_completed = sum(model["queries_completed"] for model in model_values)
    progress["overall_progress"]["completed"] = total_completed
    progress["percentage"] = round((total_completed / 15) * 100, 1)

    # Determine overall status
    if "comprehensive RAG QUALITY BENCHMARK COMPLETED" in content:
        progress["status"] = "completed"
        # Check if new comprehensive tables were generated
        if "comprehensive_comparison" in content:
            progress["new_features"]["tables_generated"] = "yes"
    elif progress["current_model"]:
        progress["status"] = "running"
    else:
        progress["status"] = "starting"

    return progress


def format_comprehensive_benchmark_report(progress: dict[str, Any]) -> str:
    """Format comprehensive progress report for 3-way comparison with new table features."""

    if "error" in progress:
        return f"❌ {progress['error']}"

    # Model status icons
    def get_status_icon(model_info: dict[str, Any]) -> str:
        if model_info["status"] == "completed":
            return "✅"
        if model_info["status"] == "running":
            return "🏃"
        if model_info["status"] == "started":
            return "⏳"
        return "⚪"

    return f"""
🚀 Comprehensive RAG Benchmark Progress Report (Table-Based Reporting)
Time: {progress["current_time"]}

📊 Overall Progress: {progress["overall_progress"]["completed"]}/15 ({progress["percentage"]}%)
Status: {progress["status"].upper()}

🔬 Model Progress:
  {get_status_icon(progress["models"]["minilm_2000"])} MiniLM (384d):  {progress["models"]["minilm_2000"]["queries_completed"]}/5 queries
  {get_status_icon(progress["models"]["scibert_2000"])} SciBERT (768d): {progress["models"]["scibert_2000"]["queries_completed"]}/5 queries
  {get_status_icon(progress["models"]["mpnet_2000"])} MPNet (768d):   {progress["models"]["mpnet_2000"]["queries_completed"]}/5 queries

🎯 Current Activity:
  Model: {progress["current_model"] or "None"}
  Query: {progress["current_query"] or "None"}

🆕 New Features Enabled:
  📊 Comprehensive Tables: {progress["new_features"]["comprehensive_tables"]}
  📈 All Metrics Displayed: {progress["new_features"]["all_metrics_displayed"]}
  💾 CSV Export: {progress["new_features"]["csv_export"]}
  📋 Tables Generated: {progress["new_features"].get("tables_generated", "pending")}

📈 Expected Timeline:
  • MiniLM:  ~15 min (fast, 384d)
  • SciBERT: ~20 min (scientific, 768d)
  • MPNet:   ~20 min (general, 768d)
  Total: ~55 minutes estimated

📋 Report Format Changes:
  ❌ Old: "Best performer" sections removed
  ✅ New: Complete side-by-side comparison tables
  ✅ New: All metrics for all models visible
  ✅ New: CSV format for spreadsheet analysis
"""


if __name__ == "__main__":
    progress = parse_comprehensive_benchmark_progress()
    report = format_comprehensive_benchmark_report(progress)
