import { ApplicationWithTemplateFactory, GrantTemplateFactory, RagSourceFactory } from "::testing/factories";
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useApplicationStore } from "@/stores";
import { RagSourcesContent } from "./rag-sources-content";

describe.sequential("RagSourcesContent", () => {
	beforeEach(() => {
		useApplicationStore.getState().reset();
	});

	afterEach(() => {
		cleanup();
	});

	it("renders no template message when application has no grant template", () => {
		const application = ApplicationWithTemplateFactory.build({
			grant_template: undefined,
		});

		useApplicationStore.setState({ application });

		const { container } = render(<RagSourcesContent />);

		expect(container.querySelector('[data-testid="rag-sources-no-template"]')).toBeInTheDocument();
	});

	it("renders no documents message when no RAG sources exist", () => {
		const application = ApplicationWithTemplateFactory.build({
			grant_template: GrantTemplateFactory.build({
				rag_sources: [],
			}),
		});

		useApplicationStore.setState({ application });

		const { container } = render(<RagSourcesContent />);

		expect(container.querySelector('[data-testid="rag-sources-empty"]')).toBeInTheDocument();
	});

	it("displays file sources with correct icons and statuses", () => {
		const application = ApplicationWithTemplateFactory.build({
			grant_template: GrantTemplateFactory.build({
				rag_sources: [
					RagSourceFactory.build({
						filename: "document1.pdf",
						sourceId: "file-1",
						status: "FINISHED",
						url: undefined,
					}),
					RagSourceFactory.build({
						filename: "document2.docx",
						sourceId: "file-2",
						status: "INDEXING",
						url: undefined,
					}),
				],
			}),
		});

		useApplicationStore.setState({ application });

		const { container } = render(<RagSourcesContent />);

		expect(container.querySelector('[data-testid="rag-source-file-1"]')).toBeInTheDocument();
		expect(container.querySelector('[data-testid="rag-source-file-2"]')).toBeInTheDocument();
	});

	it("displays URL sources with correct icons and statuses", () => {
		const application = ApplicationWithTemplateFactory.build({
			grant_template: GrantTemplateFactory.build({
				rag_sources: [
					RagSourceFactory.build({
						filename: undefined,
						sourceId: "url-1",
						status: "FINISHED",
						url: "https://example.com/article1",
					}),
					RagSourceFactory.build({
						filename: undefined,
						sourceId: "url-2",
						status: "FAILED",
						url: "https://example.com/article2",
					}),
				],
			}),
		});

		useApplicationStore.setState({ application });

		const { container } = render(<RagSourcesContent />);

		expect(container.querySelector('[data-testid="rag-source-url-1"]')).toBeInTheDocument();
		expect(container.querySelector('[data-testid="rag-source-url-2"]')).toBeInTheDocument();
	});

	it("displays mixed file and URL sources", () => {
		const application = ApplicationWithTemplateFactory.build({
			grant_template: GrantTemplateFactory.build({
				rag_sources: [
					RagSourceFactory.build({
						filename: "document.pdf",
						sourceId: "file-1",
						status: "FINISHED",
						url: undefined,
					}),
					RagSourceFactory.build({
						filename: undefined,
						sourceId: "url-1",
						status: "FINISHED",
						url: "https://example.com/article",
					}),
				],
			}),
		});

		useApplicationStore.setState({ application });

		const { container } = render(<RagSourcesContent />);

		expect(container.querySelector('[data-testid="rag-source-file-1"]')).toBeInTheDocument();
		expect(container.querySelector('[data-testid="rag-source-url-1"]')).toBeInTheDocument();
	});

	it("displays all sources in list", () => {
		const application = ApplicationWithTemplateFactory.build({
			grant_template: GrantTemplateFactory.build({
				rag_sources: [
					RagSourceFactory.build({
						filename: "document1.pdf",
						sourceId: "file-1",
						status: "FINISHED",
						url: undefined,
					}),
					RagSourceFactory.build({
						filename: "document2.pdf",
						sourceId: "file-2",
						status: "FINISHED",
						url: undefined,
					}),
					RagSourceFactory.build({
						filename: undefined,
						sourceId: "url-1",
						status: "FINISHED",
						url: "https://example.com/article",
					}),
				],
			}),
		});

		useApplicationStore.setState({ application });

		const { container } = render(<RagSourcesContent />);

		expect(container.querySelector('[data-testid="rag-source-file-1"]')).toBeInTheDocument();
		expect(container.querySelector('[data-testid="rag-source-file-2"]')).toBeInTheDocument();
		expect(container.querySelector('[data-testid="rag-source-url-1"]')).toBeInTheDocument();
	});

	it("displays single source correctly", () => {
		const application = ApplicationWithTemplateFactory.build({
			grant_template: GrantTemplateFactory.build({
				rag_sources: [
					RagSourceFactory.build({
						filename: "document.pdf",
						sourceId: "file-1",
						status: "FINISHED",
						url: undefined,
					}),
				],
			}),
		});

		useApplicationStore.setState({ application });

		const { container } = render(<RagSourcesContent />);

		expect(container.querySelector('[data-testid="rag-source-file-1"]')).toBeInTheDocument();
	});

	it("displays all possible statuses correctly", () => {
		const application = ApplicationWithTemplateFactory.build({
			grant_template: GrantTemplateFactory.build({
				rag_sources: [
					RagSourceFactory.build({
						filename: "created.pdf",
						sourceId: "file-1",
						status: "CREATED",
						url: undefined,
					}),
					RagSourceFactory.build({
						filename: "indexing.pdf",
						sourceId: "file-2",
						status: "INDEXING",
						url: undefined,
					}),
					RagSourceFactory.build({
						filename: "finished.pdf",
						sourceId: "file-3",
						status: "FINISHED",
						url: undefined,
					}),
					RagSourceFactory.build({
						filename: "failed.pdf",
						sourceId: "file-4",
						status: "FAILED",
						url: undefined,
					}),
				],
			}),
		});

		useApplicationStore.setState({ application });

		const { container } = render(<RagSourcesContent />);

		expect(container.querySelector('[data-testid="rag-source-file-1"]')).toBeInTheDocument();
		expect(container.querySelector('[data-testid="rag-source-file-2"]')).toBeInTheDocument();
		expect(container.querySelector('[data-testid="rag-source-file-3"]')).toBeInTheDocument();
		expect(container.querySelector('[data-testid="rag-source-file-4"]')).toBeInTheDocument();
	});

	it("handles sources with both filename and URL", () => {
		const application = ApplicationWithTemplateFactory.build({
			grant_template: GrantTemplateFactory.build({
				rag_sources: [
					RagSourceFactory.build({
						filename: "document.pdf",
						sourceId: "file-1",
						status: "FINISHED",
						url: "https://example.com/original-url",
					}),
				],
			}),
		});

		useApplicationStore.setState({ application });

		const { container } = render(<RagSourcesContent />);

		expect(container.querySelector('[data-testid="rag-source-file-1"]')).toBeInTheDocument();
	});

	it("handles unknown source types gracefully", () => {
		const application = ApplicationWithTemplateFactory.build({
			grant_template: GrantTemplateFactory.build({
				rag_sources: [
					RagSourceFactory.build({
						filename: undefined,
						sourceId: "unknown-1",
						status: "FINISHED",
						url: undefined,
					}),
				],
			}),
		});

		useApplicationStore.setState({ application });

		const { container } = render(<RagSourcesContent />);

		expect(container.querySelector('[data-testid="rag-source-unknown-1"]')).toBeInTheDocument();
	});

	it("renders within scrollable container", () => {
		const application = ApplicationWithTemplateFactory.build({
			grant_template: GrantTemplateFactory.build({
				rag_sources: [
					RagSourceFactory.build({
						filename: "document.pdf",
						sourceId: "file-1",
						status: "FINISHED",
						url: undefined,
					}),
				],
			}),
		});

		useApplicationStore.setState({ application });

		const { container } = render(<RagSourcesContent />);

		const listContainer = container.querySelector('[data-testid="rag-sources-list"]');
		expect(listContainer).toBeInTheDocument();
		expect(listContainer).toHaveClass("max-h-96");
		expect(listContainer).toHaveClass("overflow-y-auto");
	});
});
