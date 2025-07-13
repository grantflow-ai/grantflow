import { GrantSectionDetailedFactory } from "::testing/factories";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { vi } from "vitest";
import type { GrantSection, UpdateGrantSection } from "@/types/grant-sections";
import { SortableSection } from "./grant-sections";

const meta: Meta<typeof SortableSection> = {
	component: SortableSection,
	decorators: [
		(Story) => (
			<div className="w-full max-w-4xl mx-auto p-4 bg-gray-50 min-h-screen">
				<Story />
			</div>
		),
	],
	parameters: {
		layout: "fullscreen",
	},
	title: "Components/Wizard/GrantSections",
};

export default meta;
type Story = StoryObj<typeof SortableSection>;

const defaultProps = {
	isDetailedSection: () => true,
	isDragging: false,
	isExpanded: false,
	onAddSubsection: vi.fn(),
	onDelete: vi.fn(),
	onToggleExpand: vi.fn(),
	onUpdate: vi.fn(),
	toUpdateGrantSection: (section: GrantSection): UpdateGrantSection => ({
		depends_on: [],
		generation_instructions: "",
		is_clinical_trial: null,
		is_detailed_research_plan: null,
		keywords: [],
		max_words: 1000,
		search_queries: [],
		topics: [],
		...section,
	}),
};

export const BasicSection: Story = {
	args: {
		...defaultProps,
		section: GrantSectionDetailedFactory.build({
			is_detailed_research_plan: false,
			max_words: 1500,
			title: "Project Overview",
		}),
	},
	name: "Basic Section - Collapsed State",
};

export const ExpandedSection: Story = {
	args: {
		...defaultProps,
		isExpanded: true,
		section: GrantSectionDetailedFactory.build({
			is_detailed_research_plan: false,
			max_words: 3000,
			title: "Research Methodology",
		}),
	},
	name: "Expanded Section - Edit Form Visible",
};

export const ResearchPlanSection: Story = {
	args: {
		...defaultProps,
		isExpanded: true,
		section: GrantSectionDetailedFactory.build({
			is_detailed_research_plan: true,
			max_words: 5000,
			title: "Detailed Research Plan",
		}),
	},
	name: "Research Plan Section - Main Research Plan Toggle",
};

export const SubsectionBasic: Story = {
	args: {
		...defaultProps,
		isSubsection: true,
		section: GrantSectionDetailedFactory.build({
			max_words: 800,
			parent_id: "parent-section-id",
			title: "Literature Review",
		}),
	},
	name: "Subsection - Collapsed State",
};

export const SubsectionExpanded: Story = {
	args: {
		...defaultProps,
		isExpanded: true,
		isSubsection: true,
		section: GrantSectionDetailedFactory.build({
			max_words: 1200,
			parent_id: "parent-section-id",
			title: "Data Collection Methods",
		}),
	},
	name: "Subsection - Expanded Edit Form",
};

export const DraggingState: Story = {
	args: {
		...defaultProps,
		isDragging: true,
		section: GrantSectionDetailedFactory.build({
			max_words: 2000,
			title: "Budget Justification",
		}),
	},
	name: "Dragging State - Visual Feedback",
};

export const NoMaxWords: Story = {
	args: {
		...defaultProps,
		isExpanded: true,
		section: GrantSectionDetailedFactory.build({
			max_words: 0, // No word limit
			title: "Project Timeline",
		}),
	},
	name: "No Word Limit - Section Without Max Words",
};

export const LongTitle: Story = {
	args: {
		...defaultProps,
		section: GrantSectionDetailedFactory.build({
			max_words: 4000,
			title: "Comprehensive Analysis of Environmental Impact and Sustainability Measures for Large-Scale Renewable Energy Implementation",
		}),
	},
	name: "Long Title - Text Overflow Handling",
};

export const MinimalWords: Story = {
	args: {
		...defaultProps,
		isExpanded: true,
		section: GrantSectionDetailedFactory.build({
			max_words: 100,
			title: "Executive Summary",
		}),
	},
	name: "Minimal Word Count - 100 Words",
};

export const MaximumWords: Story = {
	args: {
		...defaultProps,
		isExpanded: true,
		section: GrantSectionDetailedFactory.build({
			max_words: 10_000,
			title: "Comprehensive Technical Documentation",
		}),
	},
	name: "Maximum Word Count - 10,000 Words",
};

function InteractiveDemoComponent() {
	const [isExpanded, setIsExpanded] = useState(false);
	const [isDragging, setIsDragging] = useState(false);
	const [section, setSection] = useState(() =>
		GrantSectionDetailedFactory.build({
			is_detailed_research_plan: false,
			max_words: 2500,
			title: "Interactive Section Demo",
		}),
	);

	return (
		<div className="space-y-4">
			<div className="bg-white p-4 rounded border">
				<h3 className="text-lg font-semibold mb-2">Controls</h3>
				<div className="flex gap-4">
					<button
						className="px-3 py-1 bg-blue-500 text-white rounded"
						onClick={() => {
							setIsExpanded(!isExpanded);
						}}
						type="button"
					>
						{isExpanded ? "Collapse" : "Expand"}
					</button>
					<button
						className="px-3 py-1 bg-purple-500 text-white rounded"
						onClick={() => {
							setIsDragging(!isDragging);
						}}
						type="button"
					>
						{isDragging ? "Stop Dragging" : "Start Dragging"}
					</button>
					<button
						className="px-3 py-1 bg-green-500 text-white rounded"
						onClick={() => {
							setSection({
								...section,
								is_detailed_research_plan: !section.is_detailed_research_plan,
							});
						}}
						type="button"
					>
						Toggle Research Plan: {section.is_detailed_research_plan ? "ON" : "OFF"}
					</button>
				</div>
			</div>
			<SortableSection
				{...defaultProps}
				isDragging={isDragging}
				isExpanded={isExpanded}
				onToggleExpand={() => {
					setIsExpanded(!isExpanded);
				}}
				onUpdate={(updates) => {
					setSection({ ...section, ...updates });
				}}
				section={section}
			/>
		</div>
	);
}

export const InteractiveDemo: Story = {
	name: "Interactive Demo - All States Controllable",
	render: () => <InteractiveDemoComponent />,
};

function SectionHierarchyComponent() {
	const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

	const parentSection = GrantSectionDetailedFactory.build({
		id: "parent-1",
		is_detailed_research_plan: true,
		max_words: 4000,
		title: "Research Design and Methodology",
	});

	const subsections = [
		GrantSectionDetailedFactory.build({
			id: "sub-1",
			max_words: 800,
			parent_id: parentSection.id,
			title: "Participant Recruitment",
		}),
		GrantSectionDetailedFactory.build({
			id: "sub-2",
			max_words: 1200,
			parent_id: parentSection.id,
			title: "Data Collection Procedures",
		}),
		GrantSectionDetailedFactory.build({
			id: "sub-3",
			max_words: 1000,
			parent_id: parentSection.id,
			title: "Statistical Analysis Plan",
		}),
	];

	const toggleExpand = (id: string) => {
		const newExpanded = new Set(expandedSections);
		if (newExpanded.has(id)) {
			newExpanded.delete(id);
		} else {
			newExpanded.add(id);
		}
		setExpandedSections(newExpanded);
	};

	return (
		<div className="space-y-2">
			<SortableSection
				{...defaultProps}
				isExpanded={expandedSections.has(parentSection.id)}
				onToggleExpand={() => {
					toggleExpand(parentSection.id);
				}}
				section={parentSection}
			/>
			{subsections.map((subsection) => (
				<SortableSection
					{...defaultProps}
					isExpanded={expandedSections.has(subsection.id)}
					isSubsection={true}
					key={subsection.id}
					onToggleExpand={() => {
						toggleExpand(subsection.id);
					}}
					section={subsection}
				/>
			))}
		</div>
	);
}

export const SectionHierarchy: Story = {
	name: "Section Hierarchy - Parent with Subsections",
	render: () => <SectionHierarchyComponent />,
};

function FormValidationStatesComponent() {
	const [formStates, setFormStates] = useState({
		emptyTitle: "",
		invalidWordCount: -100,
		longPrompt: "A".repeat(1000),
	});

	const section = GrantSectionDetailedFactory.build({
		max_words: Math.abs(formStates.invalidWordCount) || 1000,
		title: formStates.emptyTitle || "Section with Form Issues",
	});

	return (
		<div className="space-y-4">
			<div className="bg-white p-4 rounded border">
				<h3 className="text-lg font-semibold mb-2">Form State Controls</h3>
				<div className="space-y-2">
					<input
						className="w-full p-2 border rounded"
						onChange={(e) => {
							setFormStates({ ...formStates, emptyTitle: e.target.value });
						}}
						placeholder="Test empty title validation"
						value={formStates.emptyTitle}
					/>
					<input
						className="w-full p-2 border rounded"
						onChange={(e) => {
							setFormStates({ ...formStates, invalidWordCount: Number.parseInt(e.target.value) || 0 });
						}}
						placeholder="Test word count validation"
						type="number"
						value={formStates.invalidWordCount}
					/>
				</div>
			</div>
			<SortableSection {...defaultProps} isExpanded={true} section={section} />
		</div>
	);
}

export const FormValidationStates: Story = {
	name: "Form Validation States - Edge Cases",
	render: () => <FormValidationStatesComponent />,
};

export const AccessibilityFocus: Story = {
	args: {
		...defaultProps,
		isExpanded: true,
		section: GrantSectionDetailedFactory.build({
			max_words: 2000,
			title: "Accessibility Testing Section",
		}),
	},
	name: "Accessibility Focus - Keyboard Navigation",
	parameters: {
		docs: {
			description: {
				story: "Test keyboard navigation, screen reader support, and focus management. Use Tab, Enter, and Arrow keys to navigate.",
			},
		},
	},
};
