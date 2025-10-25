import { ApplicationWithTemplateFactory } from "::testing/factories";
import { resetAllStores } from "::testing/store-reset";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useApplicationStore } from "@/stores/application-store";
import { GrantTypeStep } from "./grant-type-step";

describe("GrantTypeStep", () => {
	beforeEach(() => {
		resetAllStores();
	});

	it("renders both grant type cards", () => {
		const application = ApplicationWithTemplateFactory.build({
			grant_template: {
				...ApplicationWithTemplateFactory.build().grant_template!,
				grant_type: "RESEARCH",
			},
		});

		useApplicationStore.setState((state) => ({
			...state,
			application,
		}));

		render(<GrantTypeStep />);

		expect(screen.getByTestId("grant-type-card-basic-science")).toBeInTheDocument();
		expect(screen.getByTestId("grant-type-card-translational-research")).toBeInTheDocument();
	});

	it("calls updateGrantType when selecting a different card", async () => {
		const application = ApplicationWithTemplateFactory.build({
			grant_template: {
				...ApplicationWithTemplateFactory.build().grant_template!,
				grant_type: "RESEARCH",
			},
		});

		const updateGrantTypeMock = vi.fn();

		useApplicationStore.setState((state) => ({
			...state,
			application,
			updateGrantType: updateGrantTypeMock,
		}));

		render(<GrantTypeStep />);

		const translationalCard = screen.getByTestId("grant-type-card-translational-research");
		await userEvent.click(translationalCard);

		expect(updateGrantTypeMock).toHaveBeenCalledWith("TRANSLATIONAL");
	});
});
