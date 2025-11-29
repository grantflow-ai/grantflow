import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PredefinedTemplateSectionsEditor } from "@/components/admin/predefined-templates/sections-editor";
import type { GrantSection } from "@/types/grant-sections";

const baseSection: GrantSection = {
	depends_on: [],
	evidence: "",
	generation_instructions: "",
	id: "section-main",
	is_clinical_trial: null,
	is_detailed_research_plan: false,
	keywords: [],
	length_constraint: { source: null, type: "words", value: 500 },
	needs_applicant_writing: false,
	order: 0,
	parent_id: null,
	search_queries: [],
	title: "Main Section",
	topics: [],
};

describe("PredefinedTemplateSectionsEditor", () => {
	it("adds a new section when requested", async () => {
		const onChange = vi.fn();
		render(<PredefinedTemplateSectionsEditor onChange={onChange} sections={[]} />);

		fireEvent.click(screen.getByTestId("add-section-button"));

		await waitFor(() => {
			expect(onChange).toHaveBeenCalled();
		});

		const lastCall = onChange.mock.calls.at(-1);
		const [sections] = lastCall as [GrantSection[]];
		expect(sections).toHaveLength(1);
		expect(sections[0]?.title).toBe("New Section");
	});

	it("updates section titles and propagates changes", async () => {
		const onChange = vi.fn();
		render(<PredefinedTemplateSectionsEditor onChange={onChange} sections={[baseSection]} />);

		fireEvent.click(screen.getByTestId("section-toggle-section-main"));
		fireEvent.change(screen.getByTestId("section-title-section-main"), { target: { value: "Updated Title" } });

		await waitFor(() => {
			expect(onChange).toHaveBeenCalled();
		});

		const lastCall = onChange.mock.calls.at(-1);
		const [sections] = lastCall as [GrantSection[]];
		expect(sections[0]?.title).toBe("Updated Title");
	});

	it("enforces a single detailed research plan section", async () => {
		const sections: GrantSection[] = [
			{ ...baseSection, id: "section-a", title: "Section A" },
			{ ...baseSection, id: "section-b", order: 1, title: "Section B" },
		];
		const onChange = vi.fn();

		render(<PredefinedTemplateSectionsEditor onChange={onChange} sections={sections} />);

		fireEvent.click(screen.getByTestId("section-toggle-section-a"));
		fireEvent.click(screen.getByTestId("section-research-plan-section-a"));

		fireEvent.click(screen.getByTestId("section-toggle-section-b"));
		fireEvent.click(screen.getByTestId("section-research-plan-section-b"));

		await waitFor(() => {
			expect(onChange).toHaveBeenCalled();
		});

		const [latest] = onChange.mock.calls.pop() as [GrantSection[]];
		const sectionA = latest.find((section) => section.id === "section-a") as
			| ({ is_detailed_research_plan?: boolean | null } & GrantSection)
			| undefined;
		const sectionB = latest.find((section) => section.id === "section-b") as
			| ({ is_detailed_research_plan?: boolean | null } & GrantSection)
			| undefined;

		expect(sectionA?.is_detailed_research_plan).toBe(false);
		expect(sectionB?.is_detailed_research_plan).toBe(true);
	});
});
