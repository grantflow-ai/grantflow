import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';

// Test configuration
export const options = {
  scenarios: {
    // Scenario 1: Gradual ramp-up to test system limits
    gradual_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 10 },  // Ramp to 10 users
        { duration: '5m', target: 10 },  // Stay at 10
        { duration: '2m', target: 25 },  // Ramp to 25
        { duration: '5m', target: 25 },  // Stay at 25
        { duration: '2m', target: 50 },  // Ramp to 50
        { duration: '10m', target: 50 }, // Stay at 50 (peak load)
        { duration: '2m', target: 0 },   // Ramp down
      ],
    },
    // Scenario 2: Spike test for worst-case
    spike_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      startTime: '30m', // Start after gradual test
      stages: [
        { duration: '30s', target: 100 }, // Sudden spike
        { duration: '2m', target: 100 },  // Maintain spike
        { duration: '30s', target: 0 },   // Quick drop
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<1000', 'p(99)<2000'], // 95% under 1s, 99% under 2s
    http_req_failed: ['rate<0.05'], // Error rate under 5%
    http_reqs: ['rate>10'], // At least 10 requests per second
  },
};

// Configuration
const BASE_URL = __ENV.BASE_URL || 'https://api.grantflow.ai';
const USE_MOCK = __ENV.USE_MOCK === 'true';

// Simulate different user behaviors
const USER_SCENARIOS = new SharedArray('scenarios', function() {
  return [
    { weight: 0.4, scenario: 'search_only' },
    { weight: 0.3, scenario: 'upload_and_search' },
    { weight: 0.2, scenario: 'heavy_user' },
    { weight: 0.1, scenario: 'api_integration' },
  ];
});

// Helper function to pick weighted scenario
function pickScenario() {
  const rand = Math.random();
  let cumulative = 0;

  for (const { weight, scenario } of USER_SCENARIOS) {
    cumulative += weight;
    if (rand < cumulative) {
      return scenario;
    }
  }
  return 'search_only';
}

export default function() {
  const scenario = pickScenario();

  switch(scenario) {
    case 'search_only':
      searchOnlyUser();
      break;
    case 'upload_and_search':
      uploadAndSearchUser();
      break;
    case 'heavy_user':
      heavyUser();
      break;
    case 'api_integration':
      apiIntegrationUser();
      break;
  }
}

// Scenario 1: User who only searches (most common)
function searchOnlyUser() {
  // Health check
  const health = http.get(`${BASE_URL}/health`);
  check(health, {
    'health check OK': (r) => r.status === 200,
  });

  sleep(1);

  // Search for grants
  const searchPayload = JSON.stringify({
    query: 'cancer research NIH',
    filters: {
      deadline_after: '2024-01-01',
      amount_min: 50000,
    },
  });

  const searchRes = http.post(`${BASE_URL}/grants/search`, searchPayload, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': USE_MOCK ? 'Bearer mock-token' : getAuthToken(),
    },
  });

  check(searchRes, {
    'search successful': (r) => r.status === 200,
    'results returned': (r) => JSON.parse(r.body).results.length > 0,
  });

  sleep(2 + Math.random() * 3); // Read results

  // View specific grant
  if (searchRes.status === 200) {
    const results = JSON.parse(searchRes.body).results;
    if (results.length > 0) {
      const grantId = results[0].id;
      const grantRes = http.get(`${BASE_URL}/grants/${grantId}`, {
        headers: { 'Authorization': USE_MOCK ? 'Bearer mock-token' : getAuthToken() },
      });

      check(grantRes, {
        'grant details loaded': (r) => r.status === 200,
      });
    }
  }

  sleep(5 + Math.random() * 10); // Reading time
}

// Scenario 2: User who uploads documents and searches
function uploadAndSearchUser() {
  // Initial search
  searchOnlyUser();

  // Upload a document
  const uploadRes = http.post(`${BASE_URL}/documents/upload`, {
    file: open('./test-data/sample-grant.pdf', 'b'),
    metadata: JSON.stringify({
      title: 'Research Proposal',
      type: 'grant_application',
    }),
  }, {
    headers: { 'Authorization': USE_MOCK ? 'Bearer mock-token' : getAuthToken() },
  });

  check(uploadRes, {
    'upload successful': (r) => r.status === 201,
    'document_id returned': (r) => JSON.parse(r.body).document_id !== undefined,
  });

  if (uploadRes.status === 201) {
    const docId = JSON.parse(uploadRes.body).document_id;

    // Poll for processing status
    for (let i = 0; i < 10; i++) {
      sleep(3);

      const statusRes = http.get(`${BASE_URL}/documents/${docId}/status`, {
        headers: { 'Authorization': USE_MOCK ? 'Bearer mock-token' : getAuthToken() },
      });

      if (statusRes.status === 200) {
        const status = JSON.parse(statusRes.body).status;
        if (status === 'completed') {
          break;
        }
      }
    }

    // Get recommendations based on document
    const recsRes = http.get(`${BASE_URL}/documents/${docId}/recommendations`, {
      headers: { 'Authorization': USE_MOCK ? 'Bearer mock-token' : getAuthToken() },
    });

    check(recsRes, {
      'recommendations received': (r) => r.status === 200,
    });
  }

  sleep(10 + Math.random() * 20);
}

// Scenario 3: Heavy user (multiple uploads, lots of searches)
function heavyUser() {
  // Multiple document uploads
  for (let i = 0; i < 3; i++) {
    uploadAndSearchUser();
    sleep(5);
  }

  // Multiple searches
  for (let i = 0; i < 5; i++) {
    searchOnlyUser();
    sleep(2);
  }
}

// Scenario 4: API integration (programmatic access)
function apiIntegrationUser() {
  const batchPayload = JSON.stringify({
    queries: [
      'machine learning grants',
      'biomedical research funding',
      'climate change research grants',
    ],
  });

  const batchRes = http.post(`${BASE_URL}/grants/batch-search`, batchPayload, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': USE_MOCK ? 'Bearer mock-token' : getAuthToken(),
    },
  });

  check(batchRes, {
    'batch search successful': (r) => r.status === 200,
    'all queries processed': (r) => JSON.parse(r.body).results.length === 3,
  });

  sleep(1); // API clients are faster
}

// Helper to get auth token (implement based on your auth flow)
function getAuthToken() {
  // In real test, this would handle actual authentication
  return 'Bearer test-token';
}

// Custom metrics for cost tracking
import { Counter } from 'k6/metrics';

const apiCalls = new Counter('api_calls');
const documentsUploaded = new Counter('documents_uploaded');
const searchesPerformed = new Counter('searches_performed');

export function handleSummary(data) {
  // Calculate estimated costs based on metrics
  const totalApiCalls = data.metrics.api_calls?.values?.count || 0;
  const totalDocs = data.metrics.documents_uploaded?.values?.count || 0;
  const totalSearches = data.metrics.searches_performed?.values?.count || 0;

  const estimatedCosts = {
    api_gateway: (totalApiCalls / 1000000) * 0.40,
    document_processing: totalDocs * 0.10, // Rough estimate
    search_operations: totalSearches * 0.02, // Embeddings + LLM
  };

  const totalCost = Object.values(estimatedCosts).reduce((a, b) => a + b, 0);

  return {
    'stdout': JSON.stringify({
      ...data,
      costEstimate: {
        breakdown: estimatedCosts,
        total: totalCost,
        costPerVU: totalCost / (data.metrics.vus?.values?.max || 1),
      },
    }, null, 2),
    'summary.json': JSON.stringify(data, null, 2),
  };
}