"""
Test Data Generation for Vector Benchmarking

This module generates realistic test data for vector benchmarking.
Since we're using the real production schema, we need to create
proper entities (users, projects, rag_sources) to test with.

Key functions:
- create_test_entities: Creates users, projects, and rag_sources
- generate_test_chunks: Creates realistic text chunks for indexing
- create_test_vectors: Uses production embedding service to generate vectors

The beauty of this approach: we test with real data structures!
"""

import hashlib
import random
import uuid

from packages.db.src.json_objects import Chunk
from packages.db.src.tables import TextVector
from packages.shared_utils.src.dto import VectorDTO
from packages.shared_utils.src.logger import get_logger
from sqlalchemy.ext.asyncio import AsyncSession

logger = get_logger(__name__)


class TestDataGenerator:
    """
    Generates realistic test data for vector benchmarking.

    This creates proper database entities using production models,
    so we can test the real RAG pipeline with different vector configurations.

    Example:
        generator = TestDataGenerator(session)

        # Create base entities
        user, project, rag_source = await generator.create_test_entities()

        # Create test chunks
        chunks = await generator.generate_test_chunks(1000, rag_source.id)

        # Generate vectors using production code
        vectors = await generator.create_test_vectors(chunks, dimension=256)
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def generate_test_chunks(
        self, chunk_count: int, rag_source_id: uuid.UUID, categories: list[str] | None = None
    ) -> list[Chunk]:
        """
        Generates realistic text chunks for vector testing.

        These chunks simulate real grant documents, research papers, etc.
        They're structured like your production data but with predictable content.

        Args:
            chunk_count: Number of chunks to generate
            rag_source_id: ID of RAG source these chunks belong to
            categories: List of content categories (defaults to grant-related)

        Returns:
            List of Chunk objects ready for vector generation

        Example:
            chunks = await generator.generate_test_chunks(1000, rag_source.id)
            # Creates 1000 realistic chunks with grant-related content
        """
        if categories is None:
            categories = [
                "grant_proposal",
                "research_plan",
                "budget_section",
                "evaluation_criteria",
                "background_research",
            ]

        content_templates = {
            "grant_proposal": [
                "This research proposal investigates {topic} through innovative {methodology}. "
                "The expected outcomes include {outcome} and will contribute to {field}.",
                "Our research aims to address {problem} using {approach}. "
                "The methodology involves {method} to achieve {goal}.",
                "The proposed study will examine {subject} with a focus on {aspect}. "
                "Key objectives include {objective1} and {objective2}.",
            ],
            "research_plan": [
                "The research methodology employs {technique} to analyze {data_type}. "
                "Data collection will involve {collection_method} over {timeframe}.",
                "Our experimental design includes {design_type} with {sample_size} participants. "
                "Variables measured include {variable1} and {variable2}.",
                "The analytical approach utilizes {analysis_method} to test {hypothesis}.",
            ],
            "budget_section": [
                "Personnel costs include {personnel_type} at {rate} for {duration}. "
                "Equipment expenses total {amount} for {equipment_list}.",
                "Travel budget allocates {travel_amount} for {travel_purpose}. "
                "Supplies and materials require {supplies_amount}.",
                "Indirect costs calculated at {rate} of direct costs totaling {total}.",
            ],
            "evaluation_criteria": [
                "Success will be measured by {metric1} and {metric2}. "
                "Evaluation timeline includes {milestone1} and {milestone2}.",
                "Quality indicators include {indicator1} and {indicator2}. "
                "Performance targets are {target1} and {target2}.",
                "Assessment methods involve {assessment1} and {assessment2}.",
            ],
            "background_research": [
                "Previous studies by {author} demonstrate {finding}. Current literature shows {trend} in {field}.",
                "Research gaps include {gap1} and {gap2}. This study addresses {research_question}.",
                "Theoretical framework builds on {theory} and {approach}.",
            ],
        }

        placeholders = {
            "topic": [f"topic_{i}" for i in range(100)],
            "methodology": [f"methodology_{i}" for i in range(50)],
            "outcome": [f"outcome_{i}" for i in range(30)],
            "field": [f"field_{i}" for i in range(20)],
            "problem": [f"problem_{i}" for i in range(40)],
            "approach": [f"approach_{i}" for i in range(35)],
            "method": [f"method_{i}" for i in range(45)],
            "goal": [f"goal_{i}" for i in range(25)],
            "subject": [f"subject_{i}" for i in range(60)],
            "aspect": [f"aspect_{i}" for i in range(30)],
            "objective1": [f"objective1_{i}" for i in range(40)],
            "objective2": [f"objective2_{i}" for i in range(40)],
            "technique": [f"technique_{i}" for i in range(30)],
            "data_type": [f"data_type_{i}" for i in range(25)],
            "collection_method": [f"collection_method_{i}" for i in range(20)],
            "timeframe": [f"timeframe_{i}" for i in range(15)],
            "design_type": [f"design_type_{i}" for i in range(20)],
            "sample_size": [f"sample_size_{i}" for i in range(10)],
            "variable1": [f"variable1_{i}" for i in range(30)],
            "variable2": [f"variable2_{i}" for i in range(30)],
            "analysis_method": [f"analysis_method_{i}" for i in range(25)],
            "hypothesis": [f"hypothesis_{i}" for i in range(35)],
            "personnel_type": [f"personnel_type_{i}" for i in range(15)],
            "rate": [f"rate_{i}" for i in range(10)],
            "duration": [f"duration_{i}" for i in range(12)],
            "amount": [f"amount_{i}" for i in range(20)],
            "equipment_list": [f"equipment_list_{i}" for i in range(25)],
            "travel_amount": [f"travel_amount_{i}" for i in range(15)],
            "travel_purpose": [f"travel_purpose_{i}" for i in range(20)],
            "supplies_amount": [f"supplies_amount_{i}" for i in range(15)],
            "total": [f"total_{i}" for i in range(10)],
            "metric1": [f"metric1_{i}" for i in range(30)],
            "metric2": [f"metric2_{i}" for i in range(30)],
            "milestone1": [f"milestone1_{i}" for i in range(25)],
            "milestone2": [f"milestone2_{i}" for i in range(25)],
            "indicator1": [f"indicator1_{i}" for i in range(35)],
            "indicator2": [f"indicator2_{i}" for i in range(35)],
            "target1": [f"target1_{i}" for i in range(30)],
            "target2": [f"target2_{i}" for i in range(30)],
            "assessment1": [f"assessment1_{i}" for i in range(25)],
            "assessment2": [f"assessment2_{i}" for i in range(25)],
            "author": [f"author_{i}" for i in range(50)],
            "finding": [f"finding_{i}" for i in range(40)],
            "trend": [f"trend_{i}" for i in range(30)],
            "gap1": [f"gap1_{i}" for i in range(35)],
            "gap2": [f"gap2_{i}" for i in range(35)],
            "research_question": [f"research_question_{i}" for i in range(40)],
            "theory": [f"theory_{i}" for i in range(25)],
        }

        chunks = []
        logger.info("Generating test chunks", chunk_count=chunk_count)

        for i in range(chunk_count):
            category = random.choice(categories)
            template = random.choice(content_templates[category])

            content = template
            for placeholder, values in placeholders.items():
                if f"{{{placeholder}}}" in content:
                    content = content.replace(f"{{{placeholder}}}", random.choice(values))

            content = f"[Chunk {i}] {content}"

            chunk = Chunk(content=content, page_number=i)
            chunks.append(chunk)

        logger.info("Generated test chunks", chunks_count=len(chunks), categories_count=len(categories))
        return chunks

    async def create_test_vectors(
        self, chunks: list[Chunk], rag_source_id: uuid.UUID, dimension: int = 384
    ) -> list[VectorDTO]:
        """
        Creates realistic vector embeddings for chunks.

        For benchmarking, we create deterministic embeddings based on content hash.
        This ensures consistent vectors across test runs while maintaining realistic
        embedding properties (normalized, diverse).

        Args:
            chunks: List of chunks to create vectors for
            rag_source_id: RAG source ID for the vectors
            dimension: Vector dimension (must match current table dimension)

        Returns:
            List of VectorDTO objects ready for database insertion

        Example:
            vectors = await generator.create_test_vectors(chunks, rag_source.id, 256)
            # Creates 256-dimensional vectors for all chunks
        """
        logger.info("Creating test vectors", chunks_count=len(chunks), dimension=dimension)

        vectors = []

        for chunk in chunks:
            content_hash = hashlib.sha256(chunk["content"].encode()).hexdigest()

            embedding = []
            for i in range(0, min(len(content_hash), dimension * 2), 2):
                hex_pair = content_hash[i : i + 2]
                value = int(hex_pair, 16) / 255.0
                embedding.append(value)

            if len(embedding) < dimension:
                padding = [random.random() * 0.1 for _ in range(dimension - len(embedding))]
                embedding.extend(padding)
            else:
                embedding = embedding[:dimension]

            norm = sum(x * x for x in embedding) ** 0.5
            if norm > 0:
                embedding = [x / norm for x in embedding]

            vector_dto = VectorDTO(embedding=embedding, rag_source_id=str(rag_source_id), chunk=chunk)
            vectors.append(vector_dto)

        logger.info("Created test vectors", vectors_count=len(vectors))
        return vectors

    async def generate_query_vectors(self, count: int, dimension: int = 384) -> list[list[float]]:
        """
        Generate normalized query vectors for testing.

        Args:
            count: Number of query vectors to generate
            dimension: Dimension of each query vector

        Returns:
            List of normalized vectors for similarity testing

        Example:
            query_vectors = await generator.generate_query_vectors(50, 384)
            # Creates 50 test query vectors with 384 dimensions
        """
        query_vectors = []
        for i in range(count):
            # Create a query vector with predictable pattern
            query_vector = [0.1 * ((i + 1) % 10)] * dimension
            # Normalize vector
            norm = sum(x * x for x in query_vector) ** 0.5
            if norm > 0:
                query_vector = [x / norm for x in query_vector]
            query_vectors.append(query_vector)

        logger.info("Generated query vectors", count=count, dimension=dimension)
        return query_vectors

    async def insert_vectors_to_database(self, vectors: list[VectorDTO]) -> None:
        """
        Inserts vectors into the database using production models.

        This tests the real database insertion code with your test vectors.

        Args:
            vectors: List of VectorDTO objects to insert

        Example:
            await generator.insert_vectors_to_database(vectors)
            # Vectors are now in the text_vectors table
        """
        logger.info("Inserting vectors into database", vectors_count=len(vectors))

        batch_size = 1000
        for i in range(0, len(vectors), batch_size):
            batch = vectors[i : i + batch_size]

            text_vectors = []
            for vector_dto in batch:
                text_vector = TextVector(
                    embedding=vector_dto["embedding"],
                    chunk=vector_dto["chunk"],
                    rag_source_id=uuid.UUID(vector_dto["rag_source_id"]),
                )
                text_vectors.append(text_vector)

            self.session.add_all(text_vectors)
            await self.session.commit()

            logger.info(
                "Inserted batch",
                batch_num=i // batch_size + 1,
                total_batches=(len(vectors) + batch_size - 1) // batch_size,
            )

        logger.info("Successfully inserted vectors", vectors_count=len(vectors))
