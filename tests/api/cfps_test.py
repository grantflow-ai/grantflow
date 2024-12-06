from typing import Any

from sanic_testing.testing import SanicASGITestClient
from sqlalchemy import insert
from sqlalchemy.ext.asyncio import async_sessionmaker  # type: ignore[attr-defined]

from src.api.api_types import CfpResponse
from src.db.tables import FundingOrganization, GrantCfp
from src.utils.serialization import deserialize
from tests.factories import FundingOrganizationFactory, GrantCfpFactory


async def test_retrieve_cfps_api_request(
    asgi_client: SanicASGITestClient,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    funding_organizations = FundingOrganizationFactory.batch(2)
    async with async_session_maker() as session, session.begin():
        await session.execute(
            insert(FundingOrganization).values(
                [
                    {"id": funding_organization.id, "name": funding_organization.name}
                    for funding_organization in funding_organizations
                ]
            )
        )
        await session.commit()

    cfps = [
        *GrantCfpFactory.batch(4, funding_organization_id=funding_organizations[0].id),
        *GrantCfpFactory.batch(4, funding_organization_id=funding_organizations[1].id),
    ]

    async with async_session_maker() as session, session.begin():
        await session.execute(
            insert(GrantCfp).values(
                [
                    {
                        "id": cfp.id,
                        "allow_clinical_trials": cfp.allow_clinical_trials,
                        "allow_resubmissions": cfp.allow_resubmissions,
                        "category": cfp.category,
                        "code": cfp.code,
                        "description": cfp.description,
                        "title": cfp.title,
                        "url": cfp.url,
                        "funding_organization_id": cfp.funding_organization_id,
                    }
                    for cfp in cfps
                ]
            )
        )
        await session.commit()

    _, response = await asgi_client.get(
        "/cfps",
        headers={"Authorization": "Bearer some_token"},
    )
    assert response.status_code == 200

    response_body = deserialize(response.body, list[CfpResponse])
    assert len(response_body) == 8

    for cfp in response_body:
        assert cfp["id"]
        assert cfp["allow_clinical_trials"] is not None
        assert cfp["allow_resubmissions"] is not None
        assert cfp["code"] is not None
        assert cfp["funding_organization_id"] in [str(funding_organizations[0].id), str(funding_organizations[1].id)]
        assert cfp["funding_organization_name"] in [funding_organizations[0].name, funding_organizations[1].name]
