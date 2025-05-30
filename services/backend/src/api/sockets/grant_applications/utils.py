from datetime import timedelta

from litestar.datastructures import UploadFile
from litestar.exceptions import ValidationException
from litestar.stores.valkey import ValkeyStore
from packages.db.src.enums import ApplicationStatusEnum
from packages.db.src.tables import GrantApplication
from packages.shared_utils.src.env import get_env
from packages.shared_utils.src.serialization import deserialize, serialize
from services.backend.src.common_types import APIWebsocket, WebsocketMessage

from .constants import WIZARD_STEPS_COMPLETED_VALKEY_KEY
from .dto import ApplicationResponseDTO, ApplicationWizardResponseDTO, FundingOrganizationDTO, GrantTemplateDTO


async def store_wizard_state(
    store: ValkeyStore,
    current_step: str,
) -> list[str]:
    serialized_state = await store.get(WIZARD_STEPS_COMPLETED_VALKEY_KEY)
    completed_steps: list[str] = deserialize(serialized_state, list[str]) if serialized_state else []

    if current_step not in completed_steps:
        completed_steps.append(current_step)
        await store.set(WIZARD_STEPS_COMPLETED_VALKEY_KEY, serialize(completed_steps), expires_in=timedelta(weeks=8))

    return completed_steps


def prepare_wizard_response(
    application: GrantApplication, completed_steps: list[str] | None = None
) -> ApplicationWizardResponseDTO:
    application_dto = ApplicationResponseDTO(
        id=str(application.id),
        title=application.title,
        status=application.status if hasattr(application, "status") else ApplicationStatusEnum.DRAFT,
        research_objectives=application.research_objectives,
        form_inputs=application.form_inputs,
        text=application.text,
        completed_at=application.completed_at,
        created_at=application.created_at,
        updated_at=application.updated_at,
    )

    if application.grant_template:
        funding_org_data = (
            FundingOrganizationDTO(
                id=str(application.grant_template.funding_organization.id),
                full_name=application.grant_template.funding_organization.full_name,
                abbreviation=application.grant_template.funding_organization.abbreviation,
            )
            if application.grant_template.funding_organization
            else None
        )

        template_dto = GrantTemplateDTO(
            id=str(application.grant_template.id),
            grant_sections=application.grant_template.grant_sections,
            grant_application_id=str(application.id),
            funding_organization=funding_org_data,
        )

        application_dto["grant_template"] = template_dto
    response = ApplicationWizardResponseDTO(
        data=application_dto,
    )

    if completed_steps:
        response["completed_steps"] = completed_steps

    return response


async def get_cfp_content(cfp_file_upload: UploadFile | None, cfp_url: str | None) -> str:
    from packages.shared_utils.src.extraction import extract_file_content

    if cfp_file_upload:
        output, _ = await extract_file_content(
            content=await cfp_file_upload.read(),
            mime_type=cfp_file_upload.content_type,
        )
        return output if isinstance(output, str) else output["content"]
    if cfp_url:
        # TODO:
        pass
    raise ValidationException("Either one file or a CFP URL is required")


class MessageHandler:
    __slots__ = ("_debug", "_socket")

    def __init__(self, socket: APIWebsocket) -> None:
        self._socket = socket
        self._debug = get_env("DEBUG", raise_on_missing=False)

    async def send_message(self, message: WebsocketMessage) -> None:
        await self._socket.send_json(message)
