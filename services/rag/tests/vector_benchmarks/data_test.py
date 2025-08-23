import hashlib
import random
import uuid

from packages.db.src.json_objects import Chunk
from packages.db.src.tables import TextVector
from packages.shared_utils.src.dto import VectorDTO
from packages.shared_utils.src.logger import get_logger
from sqlalchemy.ext.asyncio import AsyncSession

logger = get_logger(__name__)


class BenchmarkDataGenerator:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def generate_test_chunks(
        self, chunk_count: int, rag_source_id: uuid.UUID, categories: list[str] | None = None
    ) -> list[Chunk]:
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
        query_vectors = []
        for i in range(count):
            query_vector = [0.1 * ((i + 1) % 10)] * dimension

            norm = sum(x * x for x in query_vector) ** 0.5
            if norm > 0:
                query_vector = [x / norm for x in query_vector]
            query_vectors.append(query_vector)

        logger.info("Generated query vectors", count=count, dimension=dimension)
        return query_vectors

    async def insert_vectors_to_database(self, vectors: list[VectorDTO]) -> None:
        logger.info("Inserting vectors into database", vectors_count=len(vectors))

        if not vectors:
            return

        await self._ensure_rag_sources_exist(vectors)

        first_vector_dim = len(vectors[0]["embedding"])
        use_raw_sql = first_vector_dim != 384

        if use_raw_sql:
            logger.info("Using raw SQL insertion for non-standard dimensions", dimension=first_vector_dim)
            await self._insert_vectors_raw_sql(vectors)
        else:
            logger.info("Using SQLAlchemy ORM insertion for standard dimensions")
            await self._insert_vectors_orm(vectors)

        logger.info("Successfully inserted vectors", vectors_count=len(vectors))

    async def _insert_vectors_orm(self, vectors: list[VectorDTO]) -> None:
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
                "Inserted ORM batch",
                batch_num=i // batch_size + 1,
                total_batches=(len(vectors) + batch_size - 1) // batch_size,
            )

    async def _insert_vectors_raw_sql(self, vectors: list[VectorDTO]) -> None:
        import json

        from sqlalchemy import text

        batch_size = 1000
        for i in range(0, len(vectors), batch_size):
            batch = vectors[i : i + batch_size]

            values_list = []
            params = {}

            for idx, vector_dto in enumerate(batch):
                param_prefix = f"v{i}_{idx}"
                values_list.append(
                    f"(gen_random_uuid(), :{param_prefix}_chunk, :{param_prefix}_embedding, :{param_prefix}_rag_source_id, now(), now())"
                )

                params[f"{param_prefix}_chunk"] = json.dumps(vector_dto["chunk"])

                vector_str = "[" + ",".join(str(float(x)) for x in vector_dto["embedding"]) + "]"
                params[f"{param_prefix}_embedding"] = vector_str
                params[f"{param_prefix}_rag_source_id"] = vector_dto["rag_source_id"]

            insert_sql = f"""
            INSERT INTO text_vectors (id, chunk, embedding, rag_source_id, created_at, updated_at)
            VALUES {", ".join(values_list)}
            """

            await self.session.execute(text(insert_sql), params)
            await self.session.commit()

            logger.info(
                "Inserted raw SQL batch",
                batch_num=i // batch_size + 1,
                total_batches=(len(vectors) + batch_size - 1) // batch_size,
            )

    async def _ensure_rag_sources_exist(self, vectors: list[VectorDTO]) -> None:
        import uuid

        from packages.db.src.enums import SourceIndexingStatusEnum
        from packages.db.src.tables import RagSource
        from sqlalchemy import select

        rag_source_ids = {uuid.UUID(vector["rag_source_id"]) for vector in vectors}

        for rag_source_id in rag_source_ids:
            result = await self.session.execute(select(RagSource).filter_by(id=rag_source_id))
            existing_source = result.scalar_one_or_none()

            if not existing_source:
                rag_source = RagSource(
                    id=rag_source_id,
                    indexing_status=SourceIndexingStatusEnum.CREATED,
                    text_content="Synthetic benchmark data",
                )
                self.session.add(rag_source)
                await self.session.commit()
                logger.info("Created RagSource for benchmarks", rag_source_id=str(rag_source_id))
