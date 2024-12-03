import ast
import asyncio
import logging
import sys
from asyncio import gather
from functools import partial
from importlib import import_module
from inspect import getsource
from io import StringIO
from string import Template
from typing import TYPE_CHECKING, Any, Final

import pytest
from anyio import Path
from coverage import Coverage
from dotenv import load_dotenv

from src.constants import PREMIUM_TEXT_GENERATION_MODEL
from src.rag_backend.dto import GenerationResultDTO
from src.rag_backend.utils import handle_completions_request, handle_segmented_text_generation
from src.utils.exceptions import FileParsingError, ValidationError
from src.utils.serialization import serialize

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

ERROR_MESSAGE_FRAGMENT = Template("""
Your last attempt at generating tests failed with the following error message:
<error_message>
${error_message}
<error_message>

Here is the previous version of the tests file. Update it to fix the errors.
${previous_version}
""")

TEST_GENERATION_USER_PROMPT: Final[Template] = Template("""
Your task is to write tests for the following code:

```python
${code}
```

Here is the code for all internal imports it uses. Do not mock these dependencies because they are a part of the same package.

```json
${imports_code}
```

All the other names in the following list are external imports. If you need to mock any of these, use the `mocker` fixture.

${external_imports_list}

The code should be imported in the generated code from the module "${module_path}"
${previous_part_text}

${error_message_fragment}
""")

SKIP_FILES = {"__init__.py", "dto.py", "constants.py", "data_types.py", "main.py", "handler.py"}


async def get_test_coverage(test_file: Path) -> tuple[float, str]:
    """Run test with coverage and return coverage percentage + report."""
    cov = Coverage()
    cov.start()

    await asyncio.to_thread(pytest.main, [str(test_file), "-v"])

    cov.stop()
    cov.save()

    percentage = cov.report()
    report = StringIO()
    cov.report(file=report)

    return percentage, report.getvalue()


async def handle_file_test_generation(
    previous_part_text: str | None,
    *,
    code: str,
    external_imports_list: list[str],
    imports_code: dict[str, str],
    module_path: str,
    error_message: str | None = None,
    previous_version: str | None = None,
) -> GenerationResultDTO:
    """Generate a part of the test code for a file.

    Args:
        previous_part_text: The previous part of the test code, if any.
        code: The code to generate tests for.
        external_imports_list: The list of external imports.
        imports_code: The code for the internal imports.
        module_path: The module path of the code.
        error_message: The error message, if any.
        previous_version: The previous version of the test code, if any.

    Returns:
        GenerationResultDTO: The generated test code.
    """
    if error_message and previous_version:
        error_message_fragment = ERROR_MESSAGE_FRAGMENT.substitute(
            error_message=error_message, previous_version=previous_version
        )
    else:
        error_message_fragment = ""
    user_prompt = TEST_GENERATION_USER_PROMPT.substitute(
        code=code,
        module_path=module_path,
        previous_part_text=previous_part_text if previous_part_text else "",
        imports_code=imports_code,
        external_imports_list=serialize(external_imports_list),
        error_message_fragment=error_message_fragment,
    ).strip()

    return await handle_completions_request(
        prompt_identifier="file_tests",
        system_prompt=TEST_GENERATION_SYSTEM_PROMPT,
        user_prompt=user_prompt,
        model=PREMIUM_TEXT_GENERATION_MODEL,
    )


async def validate_generated_tests(test_file: Path) -> None:
    """Run pytest on generated file and return success + output.

    Args:
        test_file: The path to the test file to validate.

    Raises:
        ValidationError: If the tests fail.

    Returns:
        None
    """
    test_result = await asyncio.to_thread(pytest.main, [str(test_file), "-v", "--collect-only"])
    if not test_result == pytest.ExitCode.OK:
        raise ValidationError(f"Generated tests failed to run. Pytest exit code: {test_result}")


async def test_coverage(test_file: Path, min_coverage: int = 85) -> None:
    """Check test coverage for the generated tests.

    Args:
        test_file: The path to the test file to check coverage for.
        min_coverage: The minimum required coverage percentage.

    Raises:
        ValidationError: If the coverage is below the minimum required.

    Returns:
        None
    """
    coverage_pct, coverage_report = await get_test_coverage(test_file)
    if coverage_pct < min_coverage:
        raise ValidationError(
            f"Insufficient coverage ({coverage_pct}%) while the minimum required is {min_coverage}. Here is the coverage report: \n\n{coverage_report}"
        )


async def generate_file_tests(
    *,
    external_imports_list: list[str],
    file_path: Path,
    imports_code: dict[str, str],
    src_folder: Path,
    tests_folder: Path,
) -> None:
    """Generate tests for a file.

    Args:
        external_imports_list: The list of external imports.
        file_path: The path to the file to generate tests for.
        imports_code: The code for the internal imports.
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

    tries = 5
    error_message: str | None = None
    while tries > 0:
        try:
            handler = partial(
                handle_file_test_generation,
                code=source_code,
                module_path=module_path,
                imports_code=imports_code,
                external_imports_list=external_imports_list,
                error_message=error_message,
            )
            generated_tests = await handle_segmented_text_generation(
                entity_type="file", entity_identifier=f"file: {module_path}", prompt_handler=handler
            )

            logger.info("Successfully generated tests for file %s, writing tests to %s", file_path, target_file)

            await target_file.parent.mkdir(parents=True, exist_ok=True)
            await target_file.write_text(generated_tests.replace("```python", "").replace("```", ""))
            await validate_generated_tests(target_file)
            await test_coverage(target_file)
        except ValidationError as e:
            error_message = str(e)
            tries -= 1


async def extract_imports(file_path: Path) -> set[str]:
    """Extract imports from a Python file.

    Args:
        file_path: The path to the file to extract imports from.

    Raises:
        FileParsingError: If the file cannot be parsed.

    Returns:
        A set of tuples containing the import and the namespace.
    """
    content = await file_path.read_text()
    namespaces = set[str]()

    try:
        tree = ast.parse(content)
        for node in ast.walk(tree):
            if isinstance(node, (ast.Import | ast.ImportFrom)):
                for name in node.names:
                    node_name = name.name
                    node_module = getattr(node, "module", "")
                    namespaces.add(f"{node_module}.{node_name}" if node_module else node_name)
    except SyntaxError as e:
        logger.error("Could not parse %s", file_path)
        raise FileParsingError(f"Warning: Could not parse {file_path}", context=str(e)) from e

    return namespaces


async def resolve_imports(file_path: Path) -> tuple[dict[str, str], list[str]]:
    """Resolve imports for a file.

    Args:
        file_path: The path to the file to resolve imports for.

    Returns:
        A tuple containing a dictionary of internal imports and a list of external imports.
    """
    all_namespaces = set[str]()

    queue = [file_path]
    seen_files = set()
    while queue:
        current_file = queue.pop(0)
        if current_file in seen_files:
            continue

        seen_files.add(current_file)
        namespaces = await extract_imports(current_file)

        all_namespaces.update(namespaces)

    imports_code_mapping = dict[str, str]()
    external_imports_list = list[str]()

    for namespace in sorted(all_namespaces):
        if namespace.startswith("src."):
            component = namespace.split(".")[-1]
            module_path = ".".join(namespace.split(".")[:-1])
            module = import_module(module_path, package="src")
            code = getsource(module.__dict__[component])
            imports_code_mapping[namespace] = code
        else:
            external_imports_list.append(namespace)

    return imports_code_mapping, external_imports_list


async def generate_tests() -> None:
    """Generate tests for all files in the src folder."""
    src_folder = await (Path(__file__).parent.parent / "src").absolute()
    tests_folder = await (Path(__file__).parent.parent / "tests").absolute()

    coroutines: list[Coroutine[Any, Any, None]] = []

    async for item in src_folder.rglob("*.py"):
        if item.name in SKIP_FILES:
            continue

        internal_imports_code, external_imports_list = await resolve_imports(item)

        coroutines.append(
            generate_file_tests(
                external_imports_list=external_imports_list,
                file_path=item,
                imports_code=internal_imports_code,
                src_folder=src_folder,
                tests_folder=tests_folder,
            )
        )

    await gather(*coroutines)


if __name__ == "__main__":
    logging.basicConfig(level=logging.DEBUG, stream=sys.stdout)
    logging.info("Generating tests")

    load_dotenv()
    asyncio.run(generate_tests())
