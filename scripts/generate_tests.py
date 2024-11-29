import asyncio
import logging
from asyncio import gather
from functools import partial
from string import Template
from typing import TYPE_CHECKING, Any, Final

from anyio import Path
from dotenv import load_dotenv

from src.constants import PREMIUM_TEXT_GENERATION_MODEL
from src.rag_backend.dto import GenerationResultDTO
from src.rag_backend.utils import handle_completions_request, handle_segmented_text_generation

if TYPE_CHECKING:
    from collections.abc import Coroutine

logger = logging.getLogger(__name__)

TEST_GENERATION_SYSTEM_PROMPT: Final[str] = """
You are an expert in writing unit tests using pytest and python.

## Guidelines:

1. Do not add comments to the generated code.
2. Fully type tests - both parameters and return types.
3. Use pytest fixtures where necessary.
4. Use async code where necessary. Do not decorate the tests with `@pytest.mark.asyncio` because this is configured globally.
5. For mocking, prefer using the mocker fixture which is installed (`mocker: MockerFixture` is the typed parameter)
"""

TEST_GENERATION_USER_PROMPT: Final[Template] = Template("""
Your task is to write tests for the following code:

```python
${code}
```

The code should be imported in the generated code from the module "${module_path}"
${previous_part_text}

You should use the same fixtures as in the example, and use the same factories (created with polyfactory)
""")

SKIP_FILES = {"__init__.py", "dto.py", "constants.py", "data_types.py", "main.py", "handler.py"}


async def handle_file_test_generation(
    previous_part_text: str | None, *, code: str, module_path: str
) -> GenerationResultDTO:
    """Generate a part of the test code for a file.

    Args:
        previous_part_text: The previous part of the test code, if any.
        code: The code to generate tests for.
        module_path: The module path of the code.

    Returns:
        GenerationResultDTO: The generated test code.
    """
    user_prompt = TEST_GENERATION_USER_PROMPT.substitute(
        code=code,
        module_path=module_path,
        previous_part_text=previous_part_text if previous_part_text else "",
    ).strip()

    return await handle_completions_request(
        prompt_identifier="file_tests",
        system_prompt=TEST_GENERATION_SYSTEM_PROMPT,
        user_prompt=user_prompt,
        model=PREMIUM_TEXT_GENERATION_MODEL,
    )


async def generate_file_tests(*, file_path: Path, src_folder: Path, tests_folder: Path) -> None:
    """Generate tests for a file.

    Args:
        file_path: The path to the file to generate tests for.
        src_folder: The path to the src folder.
        tests_folder: The path to the tests folder.

    Returns:
        None
    """
    logger.info("Processing %s", file_path)

    source_code = await file_path.read_text()
    module_path = f"src.{file_path.relative_to(src_folder).with_suffix("").as_posix().replace("/", ".")}"

    absolute_path = await file_path.absolute()

    target_file = Path(f"{str(absolute_path).removesuffix(".py").replace(str(src_folder), str(tests_folder))}_test.py")
    if await target_file.exists():
        logger.info("File already exists, skipping")
        return

    logger.info("Generating test %s", target_file)

    handler = partial(
        handle_file_test_generation,
        code=source_code,
        module_path=module_path,
    )

    generated_tests = await handle_segmented_text_generation(
        entity_type="file", entity_identifier=f"file: {module_path}", prompt_handler=handler
    )

    logger.info("Successfully generated tests for file %s, writing tests to %s", file_path, target_file)

    await target_file.parent.mkdir(parents=True, exist_ok=True)
    await target_file.write_text(generated_tests.replace("```python", "").replace("```", ""))


async def generate_tests() -> None:
    """Generate tests for all files in the src folder."""
    src_folder = await (Path(__file__).parent.parent / "src").absolute()
    tests_folder = await (Path(__file__).parent.parent / "tests").absolute()

    coroutines: list[Coroutine[Any, Any, None]] = []

    async for item in src_folder.rglob("*.py"):
        if item.name in SKIP_FILES:
            continue

        coroutines.append(generate_file_tests(file_path=item, src_folder=src_folder, tests_folder=tests_folder))

    await gather(*coroutines)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    logging.info("Generating tests")

    load_dotenv()
    asyncio.run(generate_tests())
