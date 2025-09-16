/* eslint-disable vitest/expect-expect */
import { setupAnalyticsMocks } from "::testing/analytics-test-utils";
import { setupAuthenticatedTest } from "::testing/auth-helpers";
import {
	ApplicationWithTemplateFactory,
	GetOrganizationResponseFactory,
	ListOrganizationsResponseFactory,
	UrlResponseFactory,
} from "::testing/factories";
import { resetAllStores } from "::testing/store-reset";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WizardStep } from "@/constants";
import { useApplicationStore } from "@/stores/application-store";
import { useOrganizationStore } from "@/stores/organization-store";
import { useWizardStore } from "@/stores/wizard-store";
import { WizardAnalyticsEvent } from "@/utils/analytics-events";
import * as segment from "@/utils/segment";
import * as validation from "@/utils/validation";

import { UrlInput } from "./url-input";

vi.mock("@/utils/validation");
vi.mock("@/utils/segment");

const mockIsValidUrl = vi.mocked(validation.isValidUrl);

describe.sequential("UrlInput", () => {
	const defaultParentId = "test-parent-id";
	const mockAddUrl = vi.fn().mockResolvedValue(undefined);

	beforeEach(() => {
		vi.clearAllMocks();
		resetAllStores();
		setupAuthenticatedTest();
		mockIsValidUrl.mockReturnValue(true);

		const organization = GetOrganizationResponseFactory.build();
		const organizations = ListOrganizationsResponseFactory.build();
		useOrganizationStore.setState({
			organization,
			organizations,
			selectedOrganizationId: organization.id,
		});

		useApplicationStore.setState({
			addUrl: mockAddUrl,
			application: null,
		});
	});

	afterEach(() => {
		cleanup();
	});

	describe("Basic Rendering", () => {
		it("renders the component with correct structure", () => {
			render(<UrlInput parentId={defaultParentId} />);

			expect(screen.getByLabelText("URL")).toBeInTheDocument();
			expect(screen.getByPlaceholderText("Paste a link and press Enter to add")).toBeInTheDocument();
			expect(screen.getByDisplayValue("")).toBeInTheDocument();
		});

		it("renders with proper input attributes", () => {
			render(<UrlInput parentId={defaultParentId} />);

			const input = screen.getByLabelText("URL");
			expect(input).toHaveAttribute("type", "url");
			expect(input).toHaveAttribute("id", "url-input");
			expect(input).toHaveAttribute("placeholder", "Paste a link and press Enter to add");
		});

		it("renders with globe icon", () => {
			const { container } = render(<UrlInput parentId={defaultParentId} />);

			const iconContainer = container.querySelector('[data-testid="url-input-icon"]');
			expect(iconContainer).toBeInTheDocument();
			expect(iconContainer?.querySelector("img")).toBeInTheDocument();
		});
	});

	describe("URL Input Handling", () => {
		it("updates input value when user types", async () => {
			const user = userEvent.setup();
			render(<UrlInput parentId={defaultParentId} />);

			const input = screen.getByLabelText("URL");
			const testUrl = "https://example.com";

			await user.type(input, testUrl);

			expect(input).toHaveValue(testUrl);
		});

		it("clears error when user starts typing after an error", async () => {
			const user = userEvent.setup();
			mockIsValidUrl.mockReturnValue(false);

			render(<UrlInput parentId={defaultParentId} />);

			const input = screen.getByLabelText("URL");

			await user.type(input, "invalid-url");
			await user.keyboard("{Enter}");

			expect(screen.getByText("Please enter a valid URL")).toBeInTheDocument();

			mockIsValidUrl.mockReturnValue(true);
			await user.type(input, "h");

			expect(screen.queryByText("Please enter a valid URL")).not.toBeInTheDocument();
		});

		it("trims whitespace from input before processing", async () => {
			const user = userEvent.setup();
			const testUrl = "https://example.com";

			render(<UrlInput parentId={defaultParentId} />);

			const input = screen.getByLabelText("URL");

			await user.type(input, `  ${testUrl}  `);
			await user.keyboard("{Enter}");

			expect(mockAddUrl).toHaveBeenCalledWith(testUrl, defaultParentId);
		});
	});

	describe("URL Validation", () => {
		it("shows validation error for invalid URL", async () => {
			const user = userEvent.setup();
			mockIsValidUrl.mockReturnValue(false);

			render(<UrlInput parentId={defaultParentId} />);

			const input = screen.getByLabelText("URL");

			await user.type(input, "invalid-url");
			await user.keyboard("{Enter}");

			expect(screen.getByText("Please enter a valid URL")).toBeInTheDocument();

			expect(mockAddUrl).not.toHaveBeenCalled();
		});

		it("validates URL using isValidUrl utility", async () => {
			const user = userEvent.setup();
			const testUrl = "https://example.com";

			render(<UrlInput parentId={defaultParentId} />);

			const input = screen.getByLabelText("URL");

			await user.type(input, testUrl);
			await user.keyboard("{Enter}");

			expect(mockIsValidUrl).toHaveBeenCalledWith(testUrl);
		});

		it("accepts valid URLs", async () => {
			const user = userEvent.setup();
			const testUrl = "https://example.com";
			mockIsValidUrl.mockReturnValue(true);

			render(<UrlInput parentId={defaultParentId} />);

			const input = screen.getByLabelText("URL");

			await user.type(input, testUrl);
			await user.keyboard("{Enter}");

			expect(mockAddUrl).toHaveBeenCalledWith(testUrl, defaultParentId);
			expect(screen.queryByText("Please enter a valid URL")).not.toBeInTheDocument();
		});
	});

	describe("Enter Key Handling", () => {
		it("adds URL when Enter is pressed with valid input", async () => {
			const user = userEvent.setup();
			const testUrl = "https://example.com";

			render(<UrlInput parentId={defaultParentId} />);

			const input = screen.getByLabelText("URL");

			await user.type(input, testUrl);
			await user.keyboard("{Enter}");

			expect(mockAddUrl).toHaveBeenCalledWith(testUrl, defaultParentId);
		});

		it("does not add URL when Enter is pressed with empty input", async () => {
			const user = userEvent.setup();

			render(<UrlInput parentId={defaultParentId} />);

			await user.keyboard("{Enter}");

			expect(mockAddUrl).not.toHaveBeenCalled();
		});

		it("does not add URL when Enter is pressed with only whitespace", async () => {
			const user = userEvent.setup();

			render(<UrlInput parentId={defaultParentId} />);

			const input = screen.getByLabelText("URL");

			await user.type(input, "   ");
			await user.keyboard("{Enter}");

			expect(mockAddUrl).not.toHaveBeenCalled();
		});

		it("ignores other key presses", async () => {
			const user = userEvent.setup();
			const testUrl = "https://example.com";

			render(<UrlInput parentId={defaultParentId} />);

			const input = screen.getByLabelText("URL");

			await user.type(input, testUrl);
			await user.keyboard("{Space}");
			await user.keyboard("{Tab}");
			await user.keyboard("{Escape}");

			expect(mockAddUrl).not.toHaveBeenCalled();
		});
	});

	describe("Parent ID Validation", () => {
		it("shows error when parentId is missing", async () => {
			const user = userEvent.setup();
			const testUrl = "https://example.com";

			render(<UrlInput />);

			const input = screen.getByLabelText("URL");

			await user.type(input, testUrl);
			await user.keyboard("{Enter}");

			expect(screen.getByText("Cannot add URL: Parent ID missing")).toBeInTheDocument();

			expect(mockAddUrl).not.toHaveBeenCalled();
		});

		it("shows error when parentId is undefined", async () => {
			const user = userEvent.setup();
			const testUrl = "https://example.com";

			render(<UrlInput parentId={undefined} />);

			const input = screen.getByLabelText("URL");

			await user.type(input, testUrl);
			await user.keyboard("{Enter}");

			expect(screen.getByText("Cannot add URL: Parent ID missing")).toBeInTheDocument();

			expect(mockAddUrl).not.toHaveBeenCalled();
		});

		it("shows error when parentId is empty string", async () => {
			const user = userEvent.setup();
			const testUrl = "https://example.com";

			render(<UrlInput parentId="" />);

			const input = screen.getByLabelText("URL");

			await user.type(input, testUrl);
			await user.keyboard("{Enter}");

			expect(screen.getByText("Cannot add URL: Parent ID missing")).toBeInTheDocument();

			expect(mockAddUrl).not.toHaveBeenCalled();
		});
	});

	describe("Duplicate URL Handling", () => {
		it("does not add URL if it already exists in application context", async () => {
			const user = userEvent.setup();
			const existingUrl = "https://existing.com";

			useApplicationStore.setState({
				application: {
					id: "test-app-id",
					project_id: "test-project",
					rag_sources: [
						{
							filename: null,
							parentId: defaultParentId,
							sourceId: "existing-source-id",
							status: "FINISHED",
							url: existingUrl,
						},
					],
					title: "Test Application",
				} as any,
			});

			render(<UrlInput parentId={defaultParentId} />);

			const input = screen.getByLabelText("URL");

			await user.type(input, existingUrl);
			await user.keyboard("{Enter}");

			expect(mockAddUrl).not.toHaveBeenCalled();
		});

		it("does not add URL if it already exists in template context", async () => {
			const user = userEvent.setup();
			const existingUrl = "https://existing.com";
			const templateId = "test-template-id";

			useApplicationStore.setState({
				application: {
					grant_template: {
						id: templateId,
						rag_sources: [
							{
								filename: null,
								parentId: templateId,
								sourceId: "existing-source-id",
								status: "FINISHED",
								url: existingUrl,
							},
						],
					},
					id: "test-app-id",
					project_id: "test-project",
					rag_sources: [],
					title: "Test Application",
				} as any,
			});

			render(<UrlInput parentId={templateId} />);

			const input = screen.getByLabelText("URL");

			await user.type(input, existingUrl);
			await user.keyboard("{Enter}");

			expect(mockAddUrl).not.toHaveBeenCalled();
		});

		it("adds URL if it does not exist in either context", async () => {
			const user = userEvent.setup();
			const newUrl = "https://new.com";

			useApplicationStore.setState({
				application: {
					id: "test-app-id",
					project_id: "test-project",
					rag_sources: [
						{
							filename: null,
							parentId: defaultParentId,
							sourceId: "source-1",
							status: "FINISHED",
							url: "https://existing1.com",
						},
						{
							filename: null,
							parentId: defaultParentId,
							sourceId: "source-2",
							status: "FINISHED",
							url: "https://existing2.com",
						},
					],
					title: "Test Application",
				} as any,
			});

			render(<UrlInput parentId={defaultParentId} />);

			const input = screen.getByLabelText("URL");

			await user.type(input, newUrl);
			await user.keyboard("{Enter}");

			expect(mockAddUrl).toHaveBeenCalledWith(newUrl, defaultParentId);
		});
	});

	describe("Input Clearing", () => {
		it("clears input after successful URL addition", async () => {
			const user = userEvent.setup();
			const testUrl = "https://example.com";

			render(<UrlInput parentId={defaultParentId} />);

			const input = screen.getByLabelText("URL");

			await user.type(input, testUrl);
			expect(input).toHaveValue(testUrl);

			await user.keyboard("{Enter}");

			expect(input).toHaveValue("");
		});

		it("clears input even when URL already exists", async () => {
			const user = userEvent.setup();
			const existingUrl = "https://existing.com";

			useApplicationStore.setState({
				application: {
					id: "test-app-id",
					project_id: "test-project",
					rag_sources: [
						{
							filename: null,
							parentId: defaultParentId,
							sourceId: "existing-source-id",
							status: "FINISHED",
							url: existingUrl,
						},
					],
					title: "Test Application",
				} as any,
			});

			render(<UrlInput parentId={defaultParentId} />);

			const input = screen.getByLabelText("URL");

			await user.type(input, existingUrl);
			expect(input).toHaveValue(existingUrl);

			await user.keyboard("{Enter}");

			expect(input).toHaveValue("");
		});

		it("does not clear input when validation fails", async () => {
			const user = userEvent.setup();
			const invalidUrl = "invalid-url";
			mockIsValidUrl.mockReturnValue(false);

			render(<UrlInput parentId={defaultParentId} />);

			const input = screen.getByLabelText("URL");

			await user.type(input, invalidUrl);
			expect(input).toHaveValue(invalidUrl);

			await user.keyboard("{Enter}");

			expect(input).toHaveValue(invalidUrl);
		});

		it("does not clear input when parentId is missing", async () => {
			const user = userEvent.setup();
			const testUrl = "https://example.com";

			render(<UrlInput />);

			const input = screen.getByLabelText("URL");

			await user.type(input, testUrl);
			expect(input).toHaveValue(testUrl);

			await user.keyboard("{Enter}");

			expect(input).toHaveValue(testUrl);
		});
	});

	describe("Error Message Display", () => {
		it("displays validation error message", async () => {
			const user = userEvent.setup();
			mockIsValidUrl.mockReturnValue(false);

			render(<UrlInput parentId={defaultParentId} />);

			const input = screen.getByLabelText("URL");

			await user.type(input, "invalid-url");
			await user.keyboard("{Enter}");

			expect(screen.getByText("Please enter a valid URL")).toBeInTheDocument();
		});

		it("displays parent ID missing error message", async () => {
			const user = userEvent.setup();
			const testUrl = "https://example.com";

			render(<UrlInput />);

			const input = screen.getByLabelText("URL");

			await user.type(input, testUrl);
			await user.keyboard("{Enter}");

			expect(screen.getByText("Cannot add URL: Parent ID missing")).toBeInTheDocument();
		});

		it("clears error message when user starts typing", async () => {
			const user = userEvent.setup();
			mockIsValidUrl.mockReturnValue(false);

			render(<UrlInput parentId={defaultParentId} />);

			const input = screen.getByLabelText("URL");

			await user.type(input, "invalid");
			await user.keyboard("{Enter}");

			expect(screen.getByText("Please enter a valid URL")).toBeInTheDocument();

			await user.type(input, "x");

			expect(screen.queryByText("Please enter a valid URL")).not.toBeInTheDocument();
		});
	});

	describe("Store Integration", () => {
		it("calls addUrl with correct parameters", async () => {
			const user = userEvent.setup();
			const testUrl = "https://example.com";
			const testParentId = "test-parent-123";

			render(<UrlInput parentId={testParentId} />);

			const input = screen.getByLabelText("URL");

			await user.type(input, testUrl);
			await user.keyboard("{Enter}");

			expect(mockAddUrl).toHaveBeenCalledWith(testUrl, testParentId);
			expect(mockAddUrl).toHaveBeenCalledTimes(1);
		});
	});

	describe("Edge Cases", () => {
		it("handles URLs with various formats", async () => {
			const user = userEvent.setup();
			const urls = [
				"https://example.com",
				"http://test.org",
				"https://subdomain.example.com/path",
				"https://example.com:8080/path?query=value#hash",
			];

			for (const url of urls) {
				const { unmount } = render(<UrlInput parentId={defaultParentId} />);

				const input = screen.getByLabelText("URL");
				await user.type(input, url);
				await user.keyboard("{Enter}");

				expect(mockAddUrl).toHaveBeenCalledWith(url, defaultParentId);

				unmount();
				vi.clearAllMocks();
				mockAddUrl.mockClear();
			}
		});

		it("handles factory-generated URLs", async () => {
			const user = userEvent.setup();
			const { url } = UrlResponseFactory.build();

			render(<UrlInput parentId={defaultParentId} />);

			const input = screen.getByLabelText("URL");

			await user.type(input, url);
			await user.keyboard("{Enter}");

			expect(mockAddUrl).toHaveBeenCalledWith(url, defaultParentId);
		});

		it("prevents default behavior on Enter keypress", async () => {
			const user = userEvent.setup();

			render(<UrlInput parentId={defaultParentId} />);

			const input = screen.getByLabelText("URL");

			await user.type(input, "https://example.com");

			await user.keyboard("{Enter}");

			expect(mockAddUrl).toHaveBeenCalled();
		});
	});

	describe("Analytics Tracking", () => {
		const { expectEventTracked, expectNoEventsTracked, resetAnalyticsMocks } = setupAnalyticsMocks();
		const user = userEvent.setup();

		beforeEach(() => {
			resetAnalyticsMocks();
			vi.clearAllMocks();
			mockIsValidUrl.mockReturnValue(true);

			useOrganizationStore.setState({
				selectedOrganizationId: "org-123",
			});

			const application = ApplicationWithTemplateFactory.build({
				id: "app-123",
				project_id: "proj-123",
			});
			application.grant_template = {
				...application.grant_template!,
				id: "template-123",
				rag_sources: [],
			};

			useApplicationStore.setState({
				addUrl: mockAddUrl.mockResolvedValue(UrlResponseFactory.build()),
				application,
			});
		});

		it("tracks URL addition for step 1 (Application Details)", async () => {
			useWizardStore.setState({
				currentStep: WizardStep.APPLICATION_DETAILS,
			});

			render(<UrlInput parentId="template-123" />);

			const input = screen.getByLabelText("URL");
			await user.type(input, "https://example.com/research-paper");
			await user.keyboard("{Enter}");

			await waitFor(() => {
				expectEventTracked(WizardAnalyticsEvent.STEP_1_LINK, {
					applicationId: "app-123",
					currentStep: WizardStep.APPLICATION_DETAILS,
					domain: "example.com",
					organizationId: "org-123",
					projectId: "proj-123",
					url: "https://example.com/research-paper",
				});
			});
		});

		it("tracks URL addition for step 3 (Knowledge Base)", async () => {
			useWizardStore.setState({
				currentStep: WizardStep.KNOWLEDGE_BASE,
			});

			render(<UrlInput parentId="app-123" />);

			const input = screen.getByLabelText("URL");
			await user.type(input, "https://research.org/publications/paper.pdf");
			await user.keyboard("{Enter}");

			await waitFor(() => {
				expectEventTracked(WizardAnalyticsEvent.STEP_3_LINK, {
					currentStep: WizardStep.KNOWLEDGE_BASE,
					domain: "research.org",
					url: "https://research.org/publications/paper.pdf",
				});
			});
		});

		it("tracks multiple URL additions separately", async () => {
			useWizardStore.setState({
				currentStep: WizardStep.APPLICATION_DETAILS,
			});

			render(<UrlInput parentId="template-123" />);

			const input = screen.getByLabelText("URL");

			await user.type(input, "https://first.com/doc");
			await user.keyboard("{Enter}");

			// Wait longer than the 500ms debounce time
			await new Promise((resolve) => setTimeout(resolve, 600));

			await user.clear(input);
			await user.type(input, "https://second.com/paper");
			await user.keyboard("{Enter}");

			await waitFor(() => {
				const { calls } = vi.mocked(segment.trackWizardEvent).mock;
				expect(calls).toHaveLength(2);

				// Check first URL tracking
				expect(calls[0][0]).toBe(WizardAnalyticsEvent.STEP_1_LINK);
				expect(calls[0][1]).toMatchObject({
					domain: "first.com",
					url: "https://first.com/doc",
				});

				// Check second URL tracking
				expect(calls[1][0]).toBe(WizardAnalyticsEvent.STEP_1_LINK);
				expect(calls[1][1]).toMatchObject({
					domain: "second.com",
					url: "https://second.com/paper",
				});
			});
		});

		it("tracks URLs with complex domains correctly", async () => {
			useWizardStore.setState({
				currentStep: WizardStep.KNOWLEDGE_BASE,
			});

			render(<UrlInput parentId="app-123" />);

			const input = screen.getByLabelText("URL");
			await user.type(input, "https://sub.domain.example.co.uk/path/to/resource?query=param#hash");
			await user.keyboard("{Enter}");

			await waitFor(() => {
				expectEventTracked(WizardAnalyticsEvent.STEP_3_LINK, {
					domain: "sub.domain.example.co.uk",
					url: "https://sub.domain.example.co.uk/path/to/resource?query=param#hash",
				});
			});
		});

		it("does not track invalid URLs", async () => {
			mockIsValidUrl.mockReturnValue(false);
			useWizardStore.setState({
				currentStep: WizardStep.APPLICATION_DETAILS,
			});

			render(<UrlInput parentId="template-123" />);

			const input = screen.getByLabelText("URL");
			await user.type(input, "not-a-valid-url");
			await user.keyboard("{Enter}");

			await waitFor(() => {
				expect(mockAddUrl).not.toHaveBeenCalled();
				expectNoEventsTracked();
			});
		});

		it("does not track duplicate URLs", async () => {
			const existingUrl = "https://existing.com/doc";
			const existingApp = useApplicationStore.getState().application!;
			useApplicationStore.setState({
				application: {
					...existingApp,
					grant_template: {
						...existingApp.grant_template!,
						id: "template-123",
						rag_sources: [{ filename: undefined, sourceId: "1", status: "FINISHED", url: existingUrl }],
					},
				},
			});

			useWizardStore.setState({
				currentStep: WizardStep.APPLICATION_DETAILS,
			});

			render(<UrlInput parentId="template-123" />);

			const input = screen.getByLabelText("URL");
			await user.type(input, existingUrl);
			await user.keyboard("{Enter}");

			await waitFor(() => {
				expect(screen.getByText("URL already exists")).toBeInTheDocument();
				expect(mockAddUrl).not.toHaveBeenCalled();
				expectNoEventsTracked();
			});
		});

		it("does not track when organizationId is missing", async () => {
			useOrganizationStore.setState({
				selectedOrganizationId: null,
			});
			useWizardStore.setState({
				currentStep: WizardStep.APPLICATION_DETAILS,
			});

			render(<UrlInput parentId="template-123" />);

			const input = screen.getByLabelText("URL");
			await user.type(input, "https://example.com/doc");
			await user.keyboard("{Enter}");

			await waitFor(() => {
				expect(mockAddUrl).toHaveBeenCalled();
				expectNoEventsTracked();
			});
		});

		it("tracks URL even if addUrl fails", async () => {
			mockAddUrl.mockRejectedValue(new Error("Network error"));
			useWizardStore.setState({
				currentStep: WizardStep.KNOWLEDGE_BASE,
			});

			render(<UrlInput parentId="app-123" />);

			const input = screen.getByLabelText("URL");
			await user.type(input, "https://example.com/doc");
			await user.keyboard("{Enter}");

			await waitFor(() => {
				expectEventTracked(WizardAnalyticsEvent.STEP_3_LINK, {
					domain: "example.com",
					url: "https://example.com/doc",
				});
			});
		});

		it("handles malformed URL gracefully in tracking", async () => {
			mockIsValidUrl.mockReturnValue(true);
			useWizardStore.setState({
				currentStep: WizardStep.APPLICATION_DETAILS,
			});

			render(<UrlInput parentId="template-123" />);

			const input = screen.getByLabelText("URL");
			await user.type(input, "http://:3000");
			await user.keyboard("{Enter}");

			await waitFor(() => {
				// addUrl is called with (url, parentId) not (parentId, url)
				expect(mockAddUrl).toHaveBeenCalledWith("http://:3000", "template-123");
				// Analytics tracking should not happen for malformed URL due to URL parsing error
				expectNoEventsTracked();
			});
		});
	});
});
