"""Quick test to validate token optimization impact."""

import asyncio
import logging
import time
from typing import Any

from services.rag.src.utils.post_processing import post_process_documents
from services.rag.src.dto import DocumentDTO


async def test_token_optimization_performance() -> None:
    """Test token optimization with simple document processing."""
    logger = logging.getLogger(__name__)
    
    # Create test documents
    test_docs: list[DocumentDTO] = [
        {
            "id": "1",
            "content": "This is a test document for melanoma research. " * 50,  # Make it substantial
            "metadata": {}
        },
        {
            "id": "2", 
            "content": "Another test document about cancer treatment and therapy. " * 50,
            "metadata": {}
        },
        {
            "id": "3",
            "content": "Research document on immunotherapy and biomarkers. " * 50,
            "metadata": {}
        }
    ]
    
    # Test post-processing with token optimization
    start_time = time.time()
    
    result = await post_process_documents(
        documents=test_docs,
        max_tokens=1000,
        model="test-model",
        query="melanoma research",
        task_description="Generate research content"
    )
    
    end_time = time.time()
    processing_time = end_time - start_time
    
    logger.info(
        "Token optimization test - Time: %.2fs, Docs processed: %d, Success: %s",
        processing_time,
        len(result),
        len(result) > 0
    )
    
    print(f"✅ Token optimization test completed in {processing_time:.2f}s")
    print(f"📄 Processed {len(result)} documents successfully")
    print(f"⚡ Performance: {'GOOD' if processing_time < 5.0 else 'SLOW'}")
    
    return processing_time


if __name__ == "__main__":
    asyncio.run(test_token_optimization_performance())