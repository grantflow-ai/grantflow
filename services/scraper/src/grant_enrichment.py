import asyncio
import re
from typing import Any

from packages.db.src.connection import get_session_maker
from packages.db.src.tables import Grant
from packages.shared_utils.src.logger import get_logger
from playwright.async_api import async_playwright
from sqlalchemy import or_, select, update
from sqlalchemy.ext.asyncio import async_sessionmaker

logger = get_logger(__name__)

PAGE_LOAD_TIMEOUT_MS = 30000
PAGE_WAIT_TIMEOUT_MS = 2000
MIN_AMOUNT_THRESHOLD = 10000
MAX_AMOUNT_THRESHOLD = 10000000
MAX_AMOUNTS_TO_COLLECT = 10
AMOUNT_BREAK_THRESHOLD = 3
CONTENT_SEARCH_LIMIT = 100000
MIN_ELIGIBLE_TEXT_LENGTH = 50
MAX_ELIGIBILITY_LENGTH = 100
REQUEST_DELAY_SECONDS = 0.5
MEDIAN_MULTIPLIER = 5

ELIGIBLE_ORGS = {
    "Higher Education Institutions": [
        "Public/State Controlled Institutions of Higher Education",
        "Private Institutions of Higher Education",
    ],
    "Healthcare": [
        "Hospitals",
        "Clinics",
        "Community Health Centers",
    ],
    "Government": [
        "State Governments",
        "County Governments",
        "City or Township Governments",
        "Special District Governments",
        "Indian/Native American Tribal Governments (Federally Recognized)",
        "Indian/Native American Tribal Governments (Other than Federally Recognized)",
        "Regional Organizations",
        "U.S. Territory or Possession",
    ],
    "Nonprofits": [
        "Nonprofits having a 501(c)(3) status with the IRS",
        "Nonprofits that do not have a 501(c)(3) status with the IRS",
        "Faith-based or Community-based Organizations",
    ],
    "Businesses": [
        "Small Businesses",
        "For-Profit Organizations",
    ],
    "International": [
        "Foreign Institutions",
        "International Organizations",
    ],
    "Other": [
        "Native American Organizations",
        "Public Housing Authorities",
        "Independent School Districts",
    ],
}


def parse_amount(amount_text: str) -> int | None:
    if not amount_text:
        return None

    amount_text = amount_text.replace(",", "").replace("$", "").strip()

    multiplier = 1
    if "M" in amount_text or "million" in amount_text.lower():
        multiplier = 1000000
        amount_text = re.sub(r"M|million", "", amount_text, flags=re.IGNORECASE).strip()
    elif "K" in amount_text or "thousand" in amount_text.lower():
        multiplier = 1000
        amount_text = re.sub(r"K|thousand", "", amount_text, flags=re.IGNORECASE).strip()

    try:
        return int(float(amount_text) * multiplier)
    except (ValueError, AttributeError):
        return None


def categorize_eligibility(eligible_text: str) -> str:
    if not eligible_text:
        return ""

    categories_found = []
    eligible_lower = eligible_text.lower()

    for category, keywords in ELIGIBLE_ORGS.items():
        for keyword in keywords:
            if keyword.lower() in eligible_lower:
                if category not in categories_found:
                    categories_found.append(category)
                break

    return ", ".join(categories_found) if categories_found else "Various"


async def fetch_grant_page_content(url: str) -> str | None:
    try:
        async with async_playwright() as playwright:
            browser = await playwright.chromium.launch(headless=True)
            page = await browser.new_page()

            await page.goto(url, wait_until="networkidle", timeout=PAGE_LOAD_TIMEOUT_MS)
            await page.wait_for_timeout(PAGE_WAIT_TIMEOUT_MS)

            content = await page.content()
            await browser.close()

            return content
    except Exception as e:
        logger.error("Failed to fetch grant page", url=url, error=str(e), error_type=type(e).__name__)
        return None


def _clean_html_content(html_content: str) -> str:
    return re.sub(
        r"&(?:nbsp;|amp;|[a-z]+;)",
        lambda m: " " if m.group() == "&nbsp;" else "&" if m.group() == "&amp;" else "",
        html_content,
    )


def _extract_amounts_from_html(clean_text: str) -> tuple[int | None, int | None]:
    amount_patterns = [
        r"YR\s*\d+:\s*\$([0-9,]+)",
        r"Year\s*\d+.*?\$([0-9,]+)",
        r"award\s+amount.*?\$([0-9,]+)",
        r"maximum\s+award.*?\$([0-9,]+)",
        r"total\s+award.*?\$([0-9,]+)",
        r"total\s+costs.*?\$([0-9,]+)",
        r"direct\s+costs.*?\$([0-9,]+)",
        r"annual\s+direct\s+costs.*?\$([0-9,]+)",
        r"up\s+to\s+\$([0-9,]+)",
        r"not\s+to\s+exceed\s+\$([0-9,]+)",
        r"maximum\s+of\s+\$([0-9,]+)",
        r"ceiling.*?\$([0-9,]+)",
        r"\$([0-9,]+)\s*per\s*year",
        r"\$([0-9,]+)\s*annually",
        r"\$([0-9,]+)/year",
        r"budget.*?\$([0-9,]+)",
        r"funding\s+level.*?\$([0-9,]+)",
        r"\$([0-9,]+(?:,[0-9]+)*)",
    ]

    amounts_found = []

    award_sections = [
        r"Award\s*Information.*?(?:</section>|</div>|<h[1-6])",
        r"Budget\s*Information.*?(?:</section>|</div>|<h[1-6])",
        r"Funding\s*Opportunity.*?(?:</section>|</div>|<h[1-6])",
        r"Financial\s*Information.*?(?:</section>|</div>|<h[1-6])",
    ]

    section_text = ""
    for section_pattern in award_sections:
        match = re.search(section_pattern, clean_text, re.IGNORECASE | re.DOTALL)
        if match:
            section_text = match.group(0)
            break

    search_texts = (
        [section_text, clean_text[:CONTENT_SEARCH_LIMIT]] if section_text else [clean_text[:CONTENT_SEARCH_LIMIT]]
    )

    for search_text in search_texts:
        if not search_text:
            continue

        for pattern in amount_patterns:
            matches = re.findall(pattern, search_text, re.IGNORECASE)
            for match in matches:
                amount = parse_amount(match)
                if amount and MIN_AMOUNT_THRESHOLD <= amount <= MAX_AMOUNT_THRESHOLD:
                    amounts_found.append(amount)
                    if len(amounts_found) >= MAX_AMOUNTS_TO_COLLECT:
                        break

            if len(amounts_found) >= AMOUNT_BREAK_THRESHOLD:
                break

        if amounts_found:
            break

    if amounts_found:
        if len(amounts_found) > 2:
            sorted_amounts = sorted(amounts_found)
            median = sorted_amounts[len(sorted_amounts) // 2]
            amounts_found = [a for a in amounts_found if a <= median * MEDIAN_MULTIPLIER]

        return min(amounts_found), max(amounts_found)

    return None, None


def _extract_eligibility_from_html(clean_text: str) -> str | None:
    eligible_patterns = [
        r"Eligible\s*Applicants.*?(?:</section>|</div>|<h[1-6])",
        r"Eligible\s*Organizations.*?(?:</section>|</div>|<h[1-6])",
        r"Who\s*(?:Can|May)\s*Apply.*?(?:</section>|</div>|<h[1-6])",
        r"Eligibility\s*(?:Criteria|Requirements|Information).*?(?:</section>|</div>|<h[1-6])",
        r"Application\s*Eligibility.*?(?:</section>|</div>|<h[1-6])",
    ]

    for pattern in eligible_patterns:
        match = re.search(pattern, clean_text, re.IGNORECASE | re.DOTALL)
        if match:
            eligible_text = match.group(0)
            eligible_text = re.sub(r"<[^>]+>", " ", eligible_text)
            eligible_text = re.sub(r"\s+", " ", eligible_text).strip()

            if len(eligible_text) > MIN_ELIGIBLE_TEXT_LENGTH:
                eligibility = categorize_eligibility(eligible_text)
                if not eligibility and "nonprofit" in eligible_text.lower():
                    eligibility = "Nonprofits"
                elif not eligibility and "universit" in eligible_text.lower():
                    eligibility = "Higher Education Institutions"
                elif not eligibility and any(
                    word in eligible_text.lower() for word in ["business", "commercial", "industry"]
                ):
                    eligibility = "Businesses"
                elif not eligibility and any(
                    word in eligible_text.lower() for word in ["government", "state", "federal", "municipal"]
                ):
                    eligibility = "Government"

                if eligibility:
                    return eligibility[:MAX_ELIGIBILITY_LENGTH]

    return None


def extract_grant_details(html_content: str) -> dict[str, Any]:
    clean_text = _clean_html_content(html_content)

    amount_min, amount_max = _extract_amounts_from_html(clean_text)
    eligibility = _extract_eligibility_from_html(clean_text)

    return {
        "amount_min": amount_min,
        "amount_max": amount_max,
        "category": None,
        "eligibility": eligibility,
    }


async def enrich_grant_data(
    session_maker: async_sessionmaker[Any],
    limit: int = 50,
) -> dict[str, Any]:
    stats = {
        "total_processed": 0,
        "successfully_enriched": 0,
        "failed": 0,
        "skipped": 0,
        "amounts_extracted": 0,
        "eligibility_extracted": 0,
    }

    async with session_maker() as session:
        result = await session.execute(
            update(Grant)
            .where(
                or_(
                    Grant.category.is_(None),
                    ~Grant.category.like("%R%"),
                    ~Grant.category.like("%U%"),
                    ~Grant.category.like("%K%"),
                )
            )
            .where(Grant.activity_code.isnot(None))
            .values(category=Grant.activity_code)
        )
        await session.commit()
        logger.info("Updated categories from activity_code", count=result.rowcount)

        result = await session.execute(
            update(Grant)
            .where(Grant.category.is_(None))
            .where(Grant.document_type.isnot(None))
            .values(category=Grant.document_type)
        )
        await session.commit()
        logger.info("Updated categories from document_type", count=result.rowcount)

        query = (
            select(Grant)
            .where(Grant.url.isnot(None))
            .where(or_(Grant.amount_min.is_(None), Grant.eligibility.is_(None)))
            .order_by(Grant.created_at.desc())
            .limit(limit)
        )

        result = await session.execute(query)
        grants = result.scalars().all()

        logger.info("Starting grant enrichment", grant_count=len(grants))

        for i, grant in enumerate(grants, 1):
            stats["total_processed"] += 1

            if not grant.url:
                stats["skipped"] += 1
                continue

            logger.info(
                "Processing grant",
                progress=f"{i}/{len(grants)}",
                document_number=grant.document_number,
                url=grant.url,
            )

            html_content = await fetch_grant_page_content(grant.url)
            if not html_content:
                stats["failed"] += 1
                logger.error(
                    "Failed to fetch content",
                    document_number=grant.document_number,
                )
                continue

            extracted_data = extract_grant_details(html_content)
            extracted_data.pop("category", None)

            updates = {k: v for k, v in extracted_data.items() if v is not None}
            if updates:
                await session.execute(update(Grant).where(Grant.id == grant.id).values(**updates))

                stats["successfully_enriched"] += 1
                if "amount_min" in updates or "amount_max" in updates:
                    stats["amounts_extracted"] += 1
                if "eligibility" in updates:
                    stats["eligibility_extracted"] += 1

                logger.info(
                    "Grant enriched",
                    document_number=grant.document_number,
                    extracted_data=updates,
                )
            else:
                stats["skipped"] += 1
                logger.debug(
                    "No data extracted",
                    document_number=grant.document_number,
                )

            await asyncio.sleep(REQUEST_DELAY_SECONDS)

        await session.commit()

    logger.info("Enrichment complete", stats=stats)
    return stats


async def main() -> None:
    session_maker = get_session_maker()

    stats = await enrich_grant_data(
        session_maker=session_maker,
        limit=50,
    )

    logger.info(
        "Enrichment results summary",
        total_processed=stats["total_processed"],
        successfully_enriched=stats["successfully_enriched"],
        amounts_extracted=stats["amounts_extracted"],
        eligibility_extracted=stats["eligibility_extracted"],
        failed=stats["failed"],
        skipped=stats["skipped"],
    )


if __name__ == "__main__":
    asyncio.run(main())
