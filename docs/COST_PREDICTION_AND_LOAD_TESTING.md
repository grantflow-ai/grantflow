# Cost Prediction and Load Testing Strategy for GrantFlow

## Executive Summary

To establish minimum production costs and ensure system stability for dozens of concurrent users, I recommend a three-pronged approach:
1. **Baseline Cost Analysis** - Calculate minimum infrastructure costs
2. **Synthetic Load Testing** - Use k6 or Locust for realistic user simulation
3. **Cost Prediction Model** - Create a simple calculator based on test results

## 1. Baseline Infrastructure Costs (Minimum Production)

### Fixed Monthly Costs
```
Cloud Run (4 services @ 1 instance each):
- CPU: 0.25 vCPU × 4 × $24.50/month = ~$25/month
- Memory: 512MB × 4 × $2.70/month = ~$11/month
- Requests: First 2M free, then $0.40/million

Cloud SQL (PostgreSQL):
- db-f1-micro: ~$15/month
- Storage: 10GB @ $0.17/GB = ~$2/month
- Backups: ~$1/month

Cloud Storage:
- Storage: 50GB @ $0.02/GB = ~$1/month
- Operations: ~$5/month

Pub/Sub:
- First 10GB free (covers most startups)

Total Baseline: ~$60-80/month
```

### Variable Costs (Per User Activity)
```
Per Document Processing:
- OCR: $1.50 per 1000 pages
- Embeddings: ~$0.01 per document
- LLM calls: ~$0.02-0.10 per interaction
- Storage: Negligible

Per Active User Hour:
- Estimated: $0.05-0.20 depending on usage patterns
```

## 2. Load Testing Approach

### Option A: k6 Load Testing (Recommended)
```javascript
// k6-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '5m', target: 10 },  // Ramp to 10 users
    { duration: '10m', target: 50 }, // Ramp to 50 users
    { duration: '20m', target: 50 }, // Stay at 50
    { duration: '5m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.1'],    // Error rate under 10%
  },
};

export default function() {
  // Simulate real user journey
  const res = http.get('https://api.grantflow.ai/health');
  check(res, { 'status is 200': (r) => r.status === 200 });
  sleep(1);
}
```

### Option B: Python Synthetic Testing Framework
```python
# synthetic_load_test.py
import asyncio
import aiohttp
import time
from dataclasses import dataclass
from typing import List
import statistics

@dataclass
class TestResult:
    duration: float
    status: int
    endpoint: str
    timestamp: float

class SyntheticUser:
    """Simulates a real user journey through the application"""

    async def run_scenario(self, session: aiohttp.ClientSession) -> List[TestResult]:
        results = []

        # 1. Login
        start = time.time()
        async with session.post('/auth/login', json={...}) as resp:
            results.append(TestResult(
                duration=time.time() - start,
                status=resp.status,
                endpoint='/auth/login',
                timestamp=time.time()
            ))

        # 2. Upload document
        # 3. Check processing status
        # 4. Search grants
        # etc...

        return results

async def run_load_test(concurrent_users: int, duration_minutes: int):
    """Run load test with specified number of concurrent users"""
    async with aiohttp.ClientSession() as session:
        # Implementation here
        pass
```

### Option C: Claude SDK Agent (Your Suggestion)
```python
# claude_agent_test.py
from anthropic import Anthropic
import subprocess
import json

class ClaudeTestAgent:
    """Use Claude to generate and execute realistic test scenarios"""

    def __init__(self):
        self.client = Anthropic()

    async def generate_test_scenario(self, user_persona: str) -> List[str]:
        """Ask Claude to generate realistic user actions"""
        response = await self.client.messages.create(
            model="claude-3-sonnet-20241022",
            messages=[{
                "role": "user",
                "content": f"Generate a realistic test scenario for a {user_persona} using a grant application system. Return as JSON array of actions."
            }]
        )
        return json.loads(response.content)

    def execute_scenario(self, actions: List[str]):
        """Execute the generated scenario"""
        # Bridge to terminal/browser automation
        pass
```

## 3. Cost Prediction Calculator

```python
# cost_calculator.py
class CostPredictor:
    # Base costs (monthly)
    FIXED_COSTS = {
        'cloud_run_base': 36,
        'cloud_sql': 18,
        'storage': 6,
    }

    # Variable costs
    VARIABLE_COSTS = {
        'ocr_per_page': 0.0015,
        'embedding_per_doc': 0.01,
        'llm_per_call': 0.05,
        'cloud_run_per_million_requests': 0.40,
    }

    def predict_monthly_cost(self,
                           active_users: int,
                           docs_per_user: int = 10,
                           searches_per_user: int = 50) -> dict:

        fixed = sum(self.FIXED_COSTS.values())

        # Calculate variable costs
        total_docs = active_users * docs_per_user
        total_searches = active_users * searches_per_user

        variable = (
            total_docs * 20 * self.VARIABLE_COSTS['ocr_per_page'] +  # ~20 pages/doc
            total_docs * self.VARIABLE_COSTS['embedding_per_doc'] +
            total_searches * self.VARIABLE_COSTS['llm_per_call']
        )

        # Add request costs (rough estimate)
        total_requests = (active_users * 1000)  # 1000 requests per user per month
        request_costs = (total_requests / 1_000_000) * self.VARIABLE_COSTS['cloud_run_per_million_requests']

        return {
            'fixed_costs': fixed,
            'variable_costs': variable + request_costs,
            'total_monthly': fixed + variable + request_costs,
            'cost_per_user': (fixed + variable + request_costs) / active_users if active_users > 0 else 0
        }
```

## 4. Implementation Plan

### Phase 1: Baseline Testing (1-2 days)
1. Deploy minimal production setup
2. Monitor costs for 24-48 hours with no load
3. Establish baseline metrics

### Phase 2: Load Testing (3-5 days)
1. Implement k6 tests for critical user journeys
2. Run incremental load tests (10, 25, 50, 100 users)
3. Monitor:
   - Response times
   - Error rates
   - Resource utilization
   - Cost accumulation

### Phase 3: Analysis & Optimization (2-3 days)
1. Analyze cost per user per hour
2. Identify bottlenecks and cost drivers
3. Implement optimizations:
   - Request batching
   - Caching strategies
   - Autoscaling policies

## 5. Quick Start Commands

```bash
# Install k6
brew install k6

# Run basic load test
k6 run --vus 50 --duration 30m k6-test.js

# Monitor costs in real-time
gcloud alpha billing budgets describe [BUDGET_ID] --billing-account=[ACCOUNT_ID]

# Export cost data
gcloud billing export --format=csv --project=grantflow > costs.csv
```

## 6. Expected Results

For 50 concurrent users over 1 hour:
- **Infrastructure Cost**: ~$0.10-0.20
- **API/Processing Cost**: ~$2-5 (depending on document volume)
- **Total Cost**: ~$2-5 per peak hour
- **Monthly Projection** (100 active users): ~$200-500

## 7. Confidence Metrics

To achieve "highish certainty":
1. Run tests at 2x expected load
2. Include 20% safety margin in calculations
3. Test during different times (caching effects)
4. Simulate worst-case scenarios (all users uploading simultaneously)

## 8. Monitoring & Alerts

Already configured:
- Budget alerts at 50%, 75%, 90%, 100%
- Discord notifications for threshold breaches
- Real-time cost tracking in GCP Console

## Next Steps

1. Choose testing approach (recommend k6 for simplicity)
2. Define user journeys to test
3. Run incremental load tests
4. Build cost prediction model from results
5. Set up automated daily cost reports