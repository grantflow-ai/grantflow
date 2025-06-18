import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useWizardStore } from "@/stores/wizard-store";

import { TemplateFileUploader } from "./template-file-uploader";

vi.mock("@/actions/sources", () => ({
	createTemplateSourceUploadUrl: vi.fn().mockResolvedValue({
		url: "https://fake-signed-url.com/upload",
	}),
}));

globalThis.fetch = vi.fn();

describe("TemplateFileUploader", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		useWizardStore.setState({
			currentStep: 0,
		});
	});

	it("renders upload button", () => {
		render(<TemplateFileUploader />);

		expect(screen.getByTestId("upload-files-button")).toBeInTheDocument();
	});

	it("renders file input with correct attributes", () => {
		render(<TemplateFileUploader />);

		const fileInput = screen.getByTestId("file-input");
		expect(fileInput).toBeInTheDocument();
		expect(fileInput).toHaveAttribute("type", "file");
		expect(fileInput).toHaveAttribute("multiple");
	});

	it("accepts correct file types", () => {
		render(<TemplateFileUploader />);

		const fileInput = screen.getByTestId("file-input");
		const acceptValue = fileInput.getAttribute("accept");

		expect(acceptValue).toContain("application/pdf");
		expect(acceptValue).toContain("text/plain");
		expect(acceptValue).toContain("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
	});

	it("has correct test container", () => {
		render(<TemplateFileUploader />);

		expect(screen.getByTestId("template-file-container")).toBeInTheDocument();
	});
});
