import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useApplicationStore } from "@/stores/application-store";
import { Autosave } from "./autosave";

vi.mock("next/image", () => ({
	default: ({ alt, src, ...props }: { alt: string; src: string }) => (
		<div data-alt={alt} data-src={src} data-testid="image" {...props} />
	),
}));

vi.mock("lucide-react", () => ({
	Loader2: ({ className }: { className?: string }) => <div className={className} data-testid="loader" />,
}));

describe("Autosave", () => {
	it("shows saving state when isSaving is true", async () => {
		useApplicationStore.setState({ isSaving: true });

		render(<Autosave />);

		expect(screen.getByTestId("loader")).toBeInTheDocument();
		expect(screen.getByText("Saving")).toBeInTheDocument();
		expect(screen.queryByText("All changes saved")).not.toBeInTheDocument();
	});

	it("shows saved state when isSaving is false", async () => {
		useApplicationStore.setState({ isSaving: false });

		render(<Autosave />);

		expect(screen.getByText("All changes saved")).toBeInTheDocument();
		expect(screen.queryByText("Saving")).not.toBeInTheDocument();
	});
});
