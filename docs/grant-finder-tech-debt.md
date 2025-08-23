# Grant Finder Technical Debt Documentation

## Full-Text Search Optimization

### Current Implementation
The current implementation uses client-side filtering for search queries (see `public_grants.py` lines 217-222), which is inefficient for large datasets.

### Recommended Solutions

#### Option 1: Algolia (Recommended for Quick Implementation)
- **Pros**: Fast implementation, excellent search capabilities, scalable
- **Cons**: Additional cost, external dependency
- **Implementation**: 
  1. Create Algolia account and index
  2. Sync Firestore grants to Algolia index via Cloud Function trigger
  3. Use Algolia API for search queries in public_grants.py

#### Option 2: Elasticsearch on GCP
- **Pros**: Powerful search, stays within GCP ecosystem
- **Cons**: Higher operational overhead, requires cluster management
- **Implementation**:
  1. Deploy Elasticsearch cluster on GKE or use Elastic Cloud
  2. Create indexing pipeline from Firestore to Elasticsearch
  3. Replace Firestore queries with Elasticsearch queries

#### Option 3: Firestore Extensions
- **Pros**: Native Firestore integration, minimal code changes
- **Cons**: Limited search capabilities compared to dedicated search engines
- **Implementation**:
  1. Install Firestore Full-Text Search extension
  2. Configure indexed fields
  3. Update queries to use extension's search syntax

#### Option 4: Pre-computed Search Indexes
- **Pros**: No external dependencies, cost-effective
- **Cons**: Limited to exact and prefix matching, requires maintenance
- **Implementation**:
  1. Create search_terms subcollection with tokenized content
  2. Build Cloud Function to maintain search indexes on document changes
  3. Query search_terms collection instead of main collection

## Rate Limiting Solutions

### Current Implementation
In-memory rate limiting using a dictionary (see `public_grants.py` lines 29-57), which doesn't work across multiple Cloud Run instances.

### Recommended Solutions

#### Option 1: Redis/Memorystore (Recommended for Production)
- **Pros**: Distributed, fast, battle-tested
- **Cons**: Additional infrastructure cost
- **Implementation**:
  ```python
  import redis
  from packages.shared_utils.src.env import get_env
  
  redis_client = redis.from_url(get_env("REDIS_URL"))
  
  def check_rate_limit(client_ip: str) -> bool:
      key = f"rate_limit:{client_ip}"
      try:
          current = redis_client.incr(key)
          if current == 1:
              redis_client.expire(key, _RATE_LIMIT_WINDOW)
          return current <= _RATE_LIMIT_REQUESTS
      except redis.RedisError:
          # Fail open if Redis is down
          return True
  ```

#### Option 2: Firestore-based Rate Limiting
- **Pros**: No additional infrastructure, uses existing Firestore
- **Cons**: Higher latency, Firestore write costs
- **Implementation**:
  ```python
  async def check_rate_limit(client_ip: str) -> bool:
      client = get_firestore_client()
      doc_ref = client.collection("rate_limits").document(client_ip)
      
      @firestore.transactional
      async def update_in_transaction(transaction):
          doc = await transaction.get(doc_ref)
          if doc.exists:
              data = doc.to_dict()
              # Check and update logic
          else:
              # Create new rate limit doc
      
      return await client.transaction(update_in_transaction)
  ```

#### Option 3: Cloud Armor
- **Pros**: Network-level protection, DDoS protection included
- **Cons**: Less granular control, requires Load Balancer
- **Implementation**:
  1. Configure Cloud Load Balancer for Cloud Run service
  2. Create Cloud Armor security policy
  3. Add rate limiting rules to policy

#### Option 4: API Gateway with Quotas
- **Pros**: Built-in quota management, API key support
- **Cons**: Additional complexity, another service to manage
- **Implementation**:
  1. Deploy API Gateway in front of Cloud Run
  2. Configure quota policies
  3. Issue API keys for different rate limits

## Migration Strategy

### Phase 1: Search (Q1 2025)
1. Implement Algolia integration for new deployments
2. Maintain backward compatibility with current implementation
3. A/B test search quality improvements
4. Full rollout after validation

### Phase 2: Rate Limiting (Q1 2025)
1. Deploy Redis/Memorystore instance
2. Update rate limiting code with feature flag
3. Monitor for false positives
4. Remove in-memory implementation after validation

### Monitoring and Alerts
- Set up alerts for search latency > 500ms
- Monitor rate limit hit ratio
- Track search result quality metrics
- Alert on Redis connection failures

## Cost Estimates

### Algolia
- Free tier: 10,000 records, 10,000 searches/month
- Pro: $500/month for 1M records, 1M searches

### Redis/Memorystore
- Basic tier: ~$50/month for 1GB instance
- Standard tier: ~$200/month for HA setup

### Cloud Armor
- $5/month per policy + $0.75 per million requests

## References
- [Algolia Firestore Integration](https://www.algolia.com/doc/guides/sending-and-managing-data/send-and-update-your-data/tutorials/firebase/)
- [GCP Memorystore Documentation](https://cloud.google.com/memorystore/docs/redis)
- [Cloud Armor Rate Limiting](https://cloud.google.com/armor/docs/rate-limiting-overview)
- [Firestore Full-Text Search Extension](https://extensions.dev/extensions/algolia/firestore-algolia-search)