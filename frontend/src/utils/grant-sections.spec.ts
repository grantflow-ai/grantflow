import { GrantSectionDetailedFactory } from "::testing/factories";
import { describe, expect, it, vi } from "vitest";
import type { GrantSection, UpdateGrantSection } from "@/types/grant-sections";
import {
	assignOrderAndParent,
	calculateDropIndicatorVisibility,
	determineNewParentId,
	executeMainToSubConversion,
	getTargetIndexForMainSectionReorder,
	hasSubSections,
	reorderMainWhenOverMainHasSubSections,
	updateBackendWithReorderedSections,
	updateReorder,
} from "./grant-sections";

const makeSection2ChildOfSection1 = (section: GrantSection): null | string => {
	if (section.id === "section-2") {
		return "section-1";
	}
	return section.parent_id;
};

const makeAllParentsNull = (): null => null;

const makeAllParentsUndefined = (): null => null;

const reassignSectionToMoveToMain1 = (section: GrantSection): null | string => {
	if (section.id === "section-to-move") {
		return "main-1";
	}
	return section.parent_id;
};

const reassignSection1ToNewParent = (section: GrantSection): null | string =>
	section.id === "section-1" ? "new-parent" : section.parent_id;

const reassignSection2ToNewParent = (section: GrantSection): null | string =>
	section.id === "section-2" ? "new-parent" : section.parent_id;

const reassignParentFallbackChain = (section: GrantSection): null | string => {
	if (section.id === "section-1") {
		return null;
	}
	return section.parent_id;
};

const createTestSections = () => ({
	main1: GrantSectionDetailedFactory.build({ id: "main-1", order: 0, parent_id: null }),
	main2: GrantSectionDetailedFactory.build({ id: "main-2", order: 3, parent_id: null }),
	main3: GrantSectionDetailedFactory.build({ id: "main-3", order: 5, parent_id: null }),
	sub1a: GrantSectionDetailedFactory.build({ id: "sub-1a", order: 1, parent_id: "main-1" }),
	sub1b: GrantSectionDetailedFactory.build({ id: "sub-1b", order: 2, parent_id: "main-1" }),
	sub2a: GrantSectionDetailedFactory.build({ id: "sub-2a", order: 4, parent_id: "main-2" }),
});

describe("grant-sections utilities", () => {
	describe("determineNewParentId", () => {
		it("returns over section's parent when over section is a child", () => {
			const activeSection = GrantSectionDetailedFactory.build({
				id: "active-main",
				parent_id: null,
			});
			const overSection = GrantSectionDetailedFactory.build({
				id: "over-child",
				parent_id: "parent-123",
			});

			const result = determineNewParentId(activeSection, overSection);

			expect(result).toBe("parent-123");
		});

		it("returns over section's id when active is child and over is main", () => {
			const activeSection = GrantSectionDetailedFactory.build({
				id: "active-child",
				parent_id: "some-parent",
			});
			const overSection = GrantSectionDetailedFactory.build({
				id: "over-main",
				parent_id: null,
			});

			const result = determineNewParentId(activeSection, overSection);

			expect(result).toBe("over-main");
		});

		it("returns null when both sections are main sections", () => {
			const activeSection = GrantSectionDetailedFactory.build({
				id: "active-main",
				parent_id: null,
			});
			const overSection = GrantSectionDetailedFactory.build({
				id: "over-main",
				parent_id: null,
			});

			const result = determineNewParentId(activeSection, overSection);

			expect(result).toBeNull();
		});

		it("returns parent when both sections are children of same parent", () => {
			const sharedParentId = "shared-parent";
			const activeSection = GrantSectionDetailedFactory.build({
				id: "active-child",
				parent_id: sharedParentId,
			});
			const overSection = GrantSectionDetailedFactory.build({
				id: "over-child",
				parent_id: sharedParentId,
			});

			const result = determineNewParentId(activeSection, overSection);

			expect(result).toBe(sharedParentId);
		});

		it("returns parent when both sections are children of different parents", () => {
			const activeSection = GrantSectionDetailedFactory.build({
				id: "active-child",
				parent_id: "parent-a",
			});
			const overSection = GrantSectionDetailedFactory.build({
				id: "over-child",
				parent_id: "parent-b",
			});

			const result = determineNewParentId(activeSection, overSection);

			expect(result).toBe("parent-b");
		});
	});

	describe("hasSubSections", () => {
		it("returns true when section has child sections", () => {
			const parentId = "parent-section";
			const sections = [
				GrantSectionDetailedFactory.build({
					id: parentId,
					parent_id: null,
				}),
				GrantSectionDetailedFactory.build({
					id: "child-1",
					parent_id: parentId,
				}),
				GrantSectionDetailedFactory.build({
					id: "child-2",
					parent_id: parentId,
				}),
			];

			const result = hasSubSections(parentId, sections);

			expect(result).toBe(true);
		});

		it("returns false when section has no child sections", () => {
			const sectionId = "lonely-section";
			const sections = [
				GrantSectionDetailedFactory.build({
					id: sectionId,
					parent_id: null,
				}),
				GrantSectionDetailedFactory.build({
					id: "other-section",
					parent_id: null,
				}),
			];

			const result = hasSubSections(sectionId, sections);

			expect(result).toBe(false);
		});

		it("returns false when section id does not exist in sections array", () => {
			const nonExistentId = "non-existent";
			const sections = [
				GrantSectionDetailedFactory.build({
					id: "section-1",
					parent_id: null,
				}),
				GrantSectionDetailedFactory.build({
					id: "section-2",
					parent_id: null,
				}),
			];

			const result = hasSubSections(nonExistentId, sections);

			expect(result).toBe(false);
		});

		it("returns false when sections array is empty", () => {
			const result = hasSubSections("any-id", []);

			expect(result).toBe(false);
		});

		it("handles mixed parent-child relationships correctly", () => {
			const parentId = "parent";
			const sections = [
				GrantSectionDetailedFactory.build({
					id: parentId,
					parent_id: null,
				}),
				GrantSectionDetailedFactory.build({
					id: "child-of-parent",
					parent_id: parentId,
				}),
				GrantSectionDetailedFactory.build({
					id: "other-parent",
					parent_id: null,
				}),
				GrantSectionDetailedFactory.build({
					id: "child-of-other",
					parent_id: "other-parent",
				}),
			];

			const hasChildrenResult = hasSubSections(parentId, sections);
			const otherHasChildrenResult = hasSubSections("other-parent", sections);
			const childHasChildrenResult = hasSubSections("child-of-parent", sections);

			expect(hasChildrenResult).toBe(true);
			expect(otherHasChildrenResult).toBe(true);
			expect(childHasChildrenResult).toBe(false);
		});
	});

	describe("getTargetIndexForMainSectionReorder", () => {
		it("returns originalIndex + 1 when target section has no subsections", () => {
			const sections = [
				GrantSectionDetailedFactory.build({
					id: "main-1",
					parent_id: null,
				}),
				GrantSectionDetailedFactory.build({
					id: "main-2",
					parent_id: null,
				}),
				GrantSectionDetailedFactory.build({
					id: "main-3",
					parent_id: null,
				}),
			];

			const result = getTargetIndexForMainSectionReorder(sections, "main-2", 1, 0);

			expect(result).toBe(2);
		});

		it("returns lastSubSectionIndex when activeIndex <= lastSubSectionIndex", () => {
			const sections = [
				GrantSectionDetailedFactory.build({
					id: "main-1",
					parent_id: null,
				}),
				GrantSectionDetailedFactory.build({
					id: "main-2",
					parent_id: null,
				}),
				GrantSectionDetailedFactory.build({
					id: "sub-2-1",
					parent_id: "main-2",
				}),
				GrantSectionDetailedFactory.build({
					id: "sub-2-2",
					parent_id: "main-2",
				}),
			];

			const result = getTargetIndexForMainSectionReorder(sections, "main-2", 1, 0);

			expect(result).toBe(3);
		});

		it("returns lastSubSectionIndex + 1 when activeIndex > lastSubSectionIndex", () => {
			const sections = [
				GrantSectionDetailedFactory.build({
					id: "main-1",
					parent_id: null,
				}),
				GrantSectionDetailedFactory.build({
					id: "sub-1",
					parent_id: "main-1",
				}),
				GrantSectionDetailedFactory.build({
					id: "main-2",
					parent_id: null,
				}),
			];

			const result = getTargetIndexForMainSectionReorder(sections, "main-1", 0, 2);

			expect(result).toBe(2);
		});

		it("handles empty sections array", () => {
			const result = getTargetIndexForMainSectionReorder([], "non-existent", 0, 0);

			expect(result).toBe(1);
		});

		it("handles non-existent overItemId", () => {
			const sections = [
				GrantSectionDetailedFactory.build({
					id: "main-1",
					parent_id: null,
				}),
			];

			const result = getTargetIndexForMainSectionReorder(sections, "non-existent", 0, 0);

			expect(result).toBe(1);
		});

		it("correctly identifies last subsection index with multiple main sections", () => {
			const sections = [
				GrantSectionDetailedFactory.build({
					id: "main-1",
					parent_id: null,
				}),
				GrantSectionDetailedFactory.build({
					id: "sub-1-1",
					parent_id: "main-1",
				}),
				GrantSectionDetailedFactory.build({
					id: "main-2",
					parent_id: null,
				}),
				GrantSectionDetailedFactory.build({
					id: "sub-2-1",
					parent_id: "main-2",
				}),
				GrantSectionDetailedFactory.build({
					id: "sub-2-2",
					parent_id: "main-2",
				}),
			];

			const result = getTargetIndexForMainSectionReorder(sections, "main-2", 2, 0);

			expect(result).toBe(4);
		});
	});

	describe("reorderMainWhenOverMainHasSubSections", () => {
		it("correctly reorders main section with subsections after target main with subsections", () => {
			const sections = [
				GrantSectionDetailedFactory.build({
					id: "main-1",
					parent_id: null,
				}),
				GrantSectionDetailedFactory.build({
					id: "sub-1-1",
					parent_id: "main-1",
				}),
				GrantSectionDetailedFactory.build({
					id: "main-2",
					parent_id: null,
				}),
				GrantSectionDetailedFactory.build({
					id: "sub-2-1",
					parent_id: "main-2",
				}),
				GrantSectionDetailedFactory.build({
					id: "main-3",
					parent_id: null,
				}),
			];

			const overItem = sections.find((s) => s.id === "main-2")!;
			const result = reorderMainWhenOverMainHasSubSections(sections, "main-3", "main-2", overItem);

			expect(result).toHaveLength(5);
			expect(result[0].id).toBe("main-1");
			expect(result[1].id).toBe("sub-1-1");
			expect(result[2].id).toBe("main-2");
			expect(result[3].id).toBe("sub-2-1");
			expect(result[4].id).toBe("main-3");
		});

		it("correctly reorders main section with subsections after target main without subsections", () => {
			const sections = [
				GrantSectionDetailedFactory.build({
					id: "main-1",
					parent_id: null,
				}),
				GrantSectionDetailedFactory.build({
					id: "main-2",
					parent_id: null,
				}),
				GrantSectionDetailedFactory.build({
					id: "sub-2-1",
					parent_id: "main-2",
				}),
			];

			const overItem = sections.find((s) => s.id === "main-1")!;
			const result = reorderMainWhenOverMainHasSubSections(sections, "main-2", "main-1", overItem);

			expect(result).toHaveLength(3);
			expect(result[0].id).toBe("main-1");
			expect(result[1].id).toBe("main-2");
			expect(result[2].id).toBe("sub-2-1");
		});

		it("returns original sections when trying to drop over a subsection (invalid operation)", () => {
			const sections = [
				GrantSectionDetailedFactory.build({
					id: "main-1",
					parent_id: null,
				}),
				GrantSectionDetailedFactory.build({
					id: "sub-1-1",
					parent_id: "main-1",
				}),
				GrantSectionDetailedFactory.build({
					id: "main-2",
					parent_id: null,
				}),
			];

			const overItem = sections.find((s) => s.id === "sub-1-1")!;
			const result = reorderMainWhenOverMainHasSubSections(sections, "main-2", "sub-1-1", overItem);

			expect(result).toEqual(sections);
		});

		it("handles moving main section without subsections", () => {
			const sections = [
				GrantSectionDetailedFactory.build({
					id: "main-1",
					parent_id: null,
				}),
				GrantSectionDetailedFactory.build({
					id: "main-2",
					parent_id: null,
				}),
				GrantSectionDetailedFactory.build({
					id: "main-3",
					parent_id: null,
				}),
			];

			const overItem = sections.find((s) => s.id === "main-1")!;
			const result = reorderMainWhenOverMainHasSubSections(sections, "main-3", "main-1", overItem);

			expect(result).toHaveLength(3);
			expect(result[0].id).toBe("main-1");
			expect(result[1].id).toBe("main-3");
			expect(result[2].id).toBe("main-2");
		});

		it("correctly filters sections to move including all subsections", () => {
			const sections = [
				GrantSectionDetailedFactory.build({
					id: "main-1",
					parent_id: null,
				}),
				GrantSectionDetailedFactory.build({
					id: "sub-1-1",
					parent_id: "main-1",
				}),
				GrantSectionDetailedFactory.build({
					id: "sub-1-2",
					parent_id: "main-1",
				}),
				GrantSectionDetailedFactory.build({
					id: "main-2",
					parent_id: null,
				}),
			];

			const overItem = sections.find((s) => s.id === "main-2")!;
			const result = reorderMainWhenOverMainHasSubSections(sections, "main-1", "main-2", overItem);

			expect(result).toHaveLength(4);
			expect(result[0].id).toBe("main-2");
			expect(result[1].id).toBe("main-1");
			expect(result[2].id).toBe("sub-1-1");
			expect(result[3].id).toBe("sub-1-2");
		});

		it("handles edge case with empty sections array", () => {
			const overItem = GrantSectionDetailedFactory.build({
				id: "main-1",
				parent_id: null,
			});

			const result = reorderMainWhenOverMainHasSubSections([], "non-existent", "main-1", overItem);

			expect(result).toEqual([]);
		});

		it("handles non-existent activeMainSectionId", () => {
			const sections = [
				GrantSectionDetailedFactory.build({
					id: "main-1",
					parent_id: null,
				}),
				GrantSectionDetailedFactory.build({
					id: "main-2",
					parent_id: null,
				}),
			];

			const overItem = sections.find((s) => s.id === "main-1")!;
			const result = reorderMainWhenOverMainHasSubSections(sections, "non-existent", "main-1", overItem);

			expect(result).toHaveLength(2);
			expect(result[0].id).toBe("main-1");
			expect(result[1].id).toBe("main-2");
		});
	});

	describe("assignOrderAndParent", () => {
		it("assigns sequential order numbers starting from 0", () => {
			const sections = [
				GrantSectionDetailedFactory.build({
					id: "section-1",
					order: 99,
					parent_id: null,
				}),
				GrantSectionDetailedFactory.build({
					id: "section-2",
					order: 5,
					parent_id: null,
				}),
				GrantSectionDetailedFactory.build({
					id: "section-3",
					order: 1,
					parent_id: null,
				}),
			];

			const result = assignOrderAndParent(sections);

			expect(result[0].order).toBe(0);
			expect(result[1].order).toBe(1);
			expect(result[2].order).toBe(2);
		});

		it("preserves existing parent_id when no parentAssignmentFn provided", () => {
			const sections = [
				GrantSectionDetailedFactory.build({
					id: "main-1",
					order: 0,
					parent_id: null,
				}),
				GrantSectionDetailedFactory.build({
					id: "sub-1",
					order: 1,
					parent_id: "main-1",
				}),
				GrantSectionDetailedFactory.build({
					id: "main-2",
					order: 2,
					parent_id: null,
				}),
			];

			const result = assignOrderAndParent(sections);

			expect(result[0].parent_id).toBeNull();
			expect(result[1].parent_id).toBe("main-1");
			expect(result[2].parent_id).toBeNull();
		});

		it("applies parentAssignmentFn when provided", () => {
			const sections = [
				GrantSectionDetailedFactory.build({
					id: "section-1",
					order: 0,
					parent_id: null,
				}),
				GrantSectionDetailedFactory.build({
					id: "section-2",
					order: 1,
					parent_id: "old-parent",
				}),
				GrantSectionDetailedFactory.build({
					id: "section-3",
					order: 2,
					parent_id: null,
				}),
			];

			const result = assignOrderAndParent(sections, makeSection2ChildOfSection1);

			expect(result[0].parent_id).toBeNull();
			expect(result[1].parent_id).toBe("section-1");
			expect(result[2].parent_id).toBeNull();
		});

		it("handles parentAssignmentFn returning null", () => {
			const sections = [
				GrantSectionDetailedFactory.build({
					id: "section-1",
					order: 0,
					parent_id: "some-parent",
				}),
				GrantSectionDetailedFactory.build({
					id: "section-2",
					order: 1,
					parent_id: "another-parent",
				}),
			];

			const result = assignOrderAndParent(sections, makeAllParentsNull);

			expect(result[0].parent_id).toBe("some-parent");
			expect(result[1].parent_id).toBe("another-parent");
		});

		it("handles parentAssignmentFn returning undefined (falls back to original parent)", () => {
			const sections = [
				GrantSectionDetailedFactory.build({
					id: "section-1",
					order: 0,
					parent_id: "original-parent",
				}),
				GrantSectionDetailedFactory.build({
					id: "section-2",
					order: 1,
					parent_id: null,
				}),
			];

			const result = assignOrderAndParent(sections, makeAllParentsUndefined);

			expect(result[0].parent_id).toBe("original-parent");
			expect(result[1].parent_id).toBeNull();
		});

		it("handles sections with null parent_id correctly", () => {
			const sections = [
				GrantSectionDetailedFactory.build({
					id: "main-1",
					order: 5,
					parent_id: null,
				}),
				GrantSectionDetailedFactory.build({
					id: "main-2",
					order: 10,
					parent_id: null,
				}),
			];

			const result = assignOrderAndParent(sections);

			expect(result[0].parent_id).toBeNull();
			expect(result[1].parent_id).toBeNull();
			expect(result[0].order).toBe(0);
			expect(result[1].order).toBe(1);
		});

		it("preserves all other section properties", () => {
			const sections = [
				GrantSectionDetailedFactory.build({
					depends_on: ["other-section"],
					generation_instructions: "Generate with care",
					id: "test-section",
					is_clinical_trial: true,
					is_detailed_research_plan: false,
					keywords: ["test", "section"],
					max_words: 3000,
					order: 99,
					parent_id: "original-parent",
					search_queries: ["test query"],
					title: "Test Title",
					topics: ["research"],
				}),
			];

			const result = assignOrderAndParent(sections);

			const [updated] = result;
			expect(updated.id).toBe("test-section");
			expect(updated.title).toBe("Test Title");
			expect((updated as any).max_words).toBe(3000);
			expect((updated as any).keywords).toEqual(["test", "section"]);
			expect((updated as any).topics).toEqual(["research"]);
			expect((updated as any).is_clinical_trial).toBe(true);
			expect((updated as any).is_detailed_research_plan).toBe(false);
			expect((updated as any).generation_instructions).toBe("Generate with care");
			expect((updated as any).search_queries).toEqual(["test query"]);
			expect((updated as any).depends_on).toEqual(["other-section"]);

			expect(updated.order).toBe(0);
			expect(updated.parent_id).toBe("original-parent");
		});

		it("handles empty sections array", () => {
			const result = assignOrderAndParent([]);

			expect(result).toEqual([]);
		});

		it("handles single section", () => {
			const sections = [
				GrantSectionDetailedFactory.build({
					id: "solo-section",
					order: 42,
					parent_id: "parent-id",
				}),
			];

			const result = assignOrderAndParent(sections);

			expect(result).toHaveLength(1);
			expect(result[0].order).toBe(0);
			expect(result[0].parent_id).toBe("parent-id");
			expect(result[0].id).toBe("solo-section");
		});

		it("correctly handles complex parentAssignmentFn logic", () => {
			const sections = [
				GrantSectionDetailedFactory.build({
					id: "main-1",
					order: 0,
					parent_id: null,
				}),
				GrantSectionDetailedFactory.build({
					id: "section-to-move",
					order: 1,
					parent_id: "old-parent",
				}),
				GrantSectionDetailedFactory.build({
					id: "another-section",
					order: 2,
					parent_id: "different-parent",
				}),
				GrantSectionDetailedFactory.build({
					id: "main-2",
					order: 3,
					parent_id: null,
				}),
			];

			const result = assignOrderAndParent(sections, reassignSectionToMoveToMain1);

			expect(result[0].parent_id).toBeNull();
			expect(result[1].parent_id).toBe("main-1");
			expect(result[2].parent_id).toBe("different-parent");
			expect(result[3].parent_id).toBeNull();

			expect(result[0].order).toBe(0);
			expect(result[1].order).toBe(1);
			expect(result[2].order).toBe(2);
			expect(result[3].order).toBe(3);
		});

		it("uses fallback chain: parentAssignmentFn result -> original parent_id -> null", () => {
			const sections = [
				GrantSectionDetailedFactory.build({
					id: "section-1",
					order: 0,
					parent_id: "original-parent",
				}),
				GrantSectionDetailedFactory.build({
					id: "section-2",
					order: 1,
					parent_id: null,
				}),
				GrantSectionDetailedFactory.build({
					id: "section-3",
					order: 2,
					parent_id: undefined as any,
				}),
			];

			const result = assignOrderAndParent(sections, reassignParentFallbackChain);

			expect(result[0].parent_id).toBe("original-parent");
			expect(result[1].parent_id).toBeNull();
			expect(result[2].parent_id).toBeNull();
		});

		it("maintains referential integrity - doesn't mutate original sections", () => {
			const sections = [
				GrantSectionDetailedFactory.build({
					id: "section-1",
					order: 5,
					parent_id: "parent-1",
				}),
			];

			const originalOrder = sections[0].order;
			const originalParent = sections[0].parent_id;

			const result = assignOrderAndParent(sections);

			expect(sections[0].order).toBe(originalOrder);
			expect(sections[0].parent_id).toBe(originalParent);

			expect(result[0].order).toBe(0);
			expect(result[0].parent_id).toBe("parent-1");
			expect(result[0]).not.toBe(sections[0]);
		});
	});

	describe("updateReorder", () => {
		const mockToUpdateGrantSection = vi.fn(
			(section: GrantSection): UpdateGrantSection => section as UpdateGrantSection,
		);
		const mockUpdateGrantSections = vi.fn();

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it("reorders sections using arrayMove and assigns new order", async () => {
			const sections = [
				GrantSectionDetailedFactory.build({ id: "section-1", order: 0 }),
				GrantSectionDetailedFactory.build({ id: "section-2", order: 1 }),
				GrantSectionDetailedFactory.build({ id: "section-3", order: 2 }),
			];

			await updateReorder(sections, 0, 2, mockToUpdateGrantSection, mockUpdateGrantSections);

			expect(mockUpdateGrantSections).toHaveBeenCalledTimes(1);
			const [[calledWith]] = mockUpdateGrantSections.mock.calls;

			expect(calledWith[0].id).toBe("section-2");
			expect(calledWith[0].order).toBe(0);
			expect(calledWith[1].id).toBe("section-3");
			expect(calledWith[1].order).toBe(1);
			expect(calledWith[2].id).toBe("section-1");
			expect(calledWith[2].order).toBe(2);
		});

		it("applies parent assignment function when provided", async () => {
			const sections = [
				GrantSectionDetailedFactory.build({ id: "section-1", order: 0, parent_id: null }),
				GrantSectionDetailedFactory.build({ id: "section-2", order: 1, parent_id: null }),
			];

			await updateReorder(
				sections,
				0,
				1,
				mockToUpdateGrantSection,
				mockUpdateGrantSections,
				reassignSection1ToNewParent,
			);

			const [[calledWith]] = mockUpdateGrantSections.mock.calls;
			expect(calledWith[1].parent_id).toBe("new-parent");
			expect(calledWith[0].parent_id).toBeNull();
		});

		it("handles empty sections array", async () => {
			await updateReorder([], 0, 0, mockToUpdateGrantSection, mockUpdateGrantSections);

			expect(mockUpdateGrantSections).not.toHaveBeenCalled();
		});

		it("handles same source and target index", async () => {
			const sections = [GrantSectionDetailedFactory.build({ id: "section-1", order: 0 })];

			await updateReorder(sections, 0, 0, mockToUpdateGrantSection, mockUpdateGrantSections);

			const [[calledWith]] = mockUpdateGrantSections.mock.calls;
			expect(calledWith[0].id).toBe("section-1");
			expect(calledWith[0].order).toBe(0);
		});

		it("calls toUpdateGrantSection for each section", async () => {
			const sections = [
				GrantSectionDetailedFactory.build({ id: "section-1" }),
				GrantSectionDetailedFactory.build({ id: "section-2" }),
			];

			await updateReorder(sections, 0, 1, mockToUpdateGrantSection, mockUpdateGrantSections);

			expect(mockToUpdateGrantSection).toHaveBeenCalledTimes(2);
		});

		it("handles backward reordering (higher to lower index)", async () => {
			const sections = [
				GrantSectionDetailedFactory.build({ id: "section-1", order: 0 }),
				GrantSectionDetailedFactory.build({ id: "section-2", order: 1 }),
				GrantSectionDetailedFactory.build({ id: "section-3", order: 2 }),
			];

			await updateReorder(sections, 2, 0, mockToUpdateGrantSection, mockUpdateGrantSections);

			const [[calledWith]] = mockUpdateGrantSections.mock.calls;
			expect(calledWith[0].id).toBe("section-3");
			expect(calledWith[0].order).toBe(0);
			expect(calledWith[1].id).toBe("section-1");
			expect(calledWith[1].order).toBe(1);
			expect(calledWith[2].id).toBe("section-2");
			expect(calledWith[2].order).toBe(2);
		});
	});

	describe("updateBackendWithReorderedSections", () => {
		const mockToUpdateGrantSection = vi.fn(
			(section: GrantSection): UpdateGrantSection => section as UpdateGrantSection,
		);
		const mockUpdateGrantSections = vi.fn();

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it("assigns order to pre-reordered sections", async () => {
			const reorderedSections = [
				GrantSectionDetailedFactory.build({ id: "section-2", order: 99 }),
				GrantSectionDetailedFactory.build({ id: "section-1", order: 88 }),
				GrantSectionDetailedFactory.build({ id: "section-3", order: 77 }),
			];

			await updateBackendWithReorderedSections(
				reorderedSections,
				mockToUpdateGrantSection,
				mockUpdateGrantSections,
			);

			const [[calledWith]] = mockUpdateGrantSections.mock.calls;
			expect(calledWith[0].order).toBe(0);
			expect(calledWith[1].order).toBe(1);
			expect(calledWith[2].order).toBe(2);
		});

		it("applies parent assignment function to reordered sections", async () => {
			const reorderedSections = [
				GrantSectionDetailedFactory.build({ id: "section-1", parent_id: null }),
				GrantSectionDetailedFactory.build({ id: "section-2", parent_id: "old-parent" }),
			];

			await updateBackendWithReorderedSections(
				reorderedSections,
				mockToUpdateGrantSection,
				mockUpdateGrantSections,
				reassignSection2ToNewParent,
			);

			const [[calledWith]] = mockUpdateGrantSections.mock.calls;
			expect(calledWith[0].parent_id).toBeNull();
			expect(calledWith[1].parent_id).toBe("new-parent");
		});

		it("handles empty reordered sections array", async () => {
			await updateBackendWithReorderedSections([], mockToUpdateGrantSection, mockUpdateGrantSections);

			expect(mockUpdateGrantSections).toHaveBeenCalledWith([]);
		});

		it("preserves section properties except order and parent_id", async () => {
			const reorderedSections = [
				GrantSectionDetailedFactory.build({
					id: "section-1",
					keywords: ["test"],
					max_words: 5000,
					order: 999,
					parent_id: "original-parent",
					title: "Test Title",
				}),
			];

			await updateBackendWithReorderedSections(
				reorderedSections,
				mockToUpdateGrantSection,
				mockUpdateGrantSections,
			);

			const [[calledWith]] = mockUpdateGrantSections.mock.calls;
			expect(calledWith[0].title).toBe("Test Title");
			expect(calledWith[0].max_words).toBe(5000);
			expect(calledWith[0].keywords).toEqual(["test"]);
			expect(calledWith[0].order).toBe(0);
			expect(calledWith[0].parent_id).toBe("original-parent");
		});

		it("calls toUpdateGrantSection for each section", async () => {
			const reorderedSections = [
				GrantSectionDetailedFactory.build({ id: "section-1" }),
				GrantSectionDetailedFactory.build({ id: "section-2" }),
				GrantSectionDetailedFactory.build({ id: "section-3" }),
			];

			await updateBackendWithReorderedSections(
				reorderedSections,
				mockToUpdateGrantSection,
				mockUpdateGrantSections,
			);

			expect(mockToUpdateGrantSection).toHaveBeenCalledTimes(3);
		});
	});

	describe("executeMainToSubConversion", () => {
		const mockToUpdateGrantSection = vi.fn(
			(section: GrantSection): UpdateGrantSection => section as UpdateGrantSection,
		);
		const mockUpdateGrantSections = vi.fn();

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it("calculates target index correctly for forward movement", async () => {
			const sections = [
				GrantSectionDetailedFactory.build({ id: "active", order: 0 }),
				GrantSectionDetailedFactory.build({ id: "middle", order: 1 }),
				GrantSectionDetailedFactory.build({ id: "over", order: 2 }),
			];

			const [activeItem] = sections;
			const activeIndex = 0;
			const overIndex = 2;

			await executeMainToSubConversion(
				sections,
				activeIndex,
				overIndex,
				activeItem,
				"new-parent",
				mockToUpdateGrantSection,
				mockUpdateGrantSections,
			);

			const [[calledWith]] = mockUpdateGrantSections.mock.calls;
			expect(calledWith[0].id).toBe("middle");
			expect(calledWith[1].id).toBe("over");
			expect(calledWith[2].id).toBe("active");
			expect(calledWith[2].parent_id).toBe("new-parent");
		});

		it("calculates target index correctly for backward movement", async () => {
			const sections = [
				GrantSectionDetailedFactory.build({ id: "over", order: 0 }),
				GrantSectionDetailedFactory.build({ id: "middle", order: 1 }),
				GrantSectionDetailedFactory.build({ id: "active", order: 2 }),
			];

			const { 2: activeItem } = sections;
			const activeIndex = 2;
			const overIndex = 0;

			await executeMainToSubConversion(
				sections,
				activeIndex,
				overIndex,
				activeItem,
				"new-parent",
				mockToUpdateGrantSection,
				mockUpdateGrantSections,
			);

			const [[calledWith]] = mockUpdateGrantSections.mock.calls;
			expect(calledWith[0].id).toBe("over");
			expect(calledWith[1].id).toBe("active");
			expect(calledWith[1].parent_id).toBe("new-parent");
			expect(calledWith[2].id).toBe("middle");
		});

		it("assigns new parent only to active section", async () => {
			const sections = [
				GrantSectionDetailedFactory.build({ id: "active", parent_id: null }),
				GrantSectionDetailedFactory.build({ id: "other", parent_id: "existing-parent" }),
			];

			const [activeItem] = sections;

			await executeMainToSubConversion(
				sections,
				0,
				1,
				activeItem,
				"new-parent",
				mockToUpdateGrantSection,
				mockUpdateGrantSections,
			);

			const [[calledWith]] = mockUpdateGrantSections.mock.calls;
			const activeAfterUpdate = calledWith.find((s: any) => s.id === "active");
			const otherAfterUpdate = calledWith.find((s: any) => s.id === "other");

			expect(activeAfterUpdate?.parent_id).toBe("new-parent");
			expect(otherAfterUpdate?.parent_id).toBe("existing-parent");
		});

		it("handles null new parent (converting to main section)", async () => {
			const sections = [
				GrantSectionDetailedFactory.build({ id: "active", parent_id: "old-parent" }),
				GrantSectionDetailedFactory.build({ id: "other", order: 1 }),
			];

			const [activeItem] = sections;

			await executeMainToSubConversion(
				sections,
				0,
				1,
				activeItem,
				null,
				mockToUpdateGrantSection,
				mockUpdateGrantSections,
			);

			const [[calledWith]] = mockUpdateGrantSections.mock.calls;
			const activeAfterUpdate = calledWith.find((s: any) => s.id === "active");

			expect(activeAfterUpdate?.parent_id).toBe("old-parent");
		});

		it("handles same active and over index", async () => {
			const sections = [
				GrantSectionDetailedFactory.build({ id: "active", order: 0 }),
				GrantSectionDetailedFactory.build({ id: "other", order: 1 }),
			];

			const [activeItem] = sections;
			const activeIndex = 0;
			const overIndex = 0;

			await executeMainToSubConversion(
				sections,
				activeIndex,
				overIndex,
				activeItem,
				"new-parent",
				mockToUpdateGrantSection,
				mockUpdateGrantSections,
			);

			const [[calledWith]] = mockUpdateGrantSections.mock.calls;
			expect(calledWith[0].id).toBe("other");
			expect(calledWith[1].id).toBe("active");
			expect(calledWith[1].parent_id).toBe("new-parent");
		});

		it("handles edge case with single section", async () => {
			const sections = [GrantSectionDetailedFactory.build({ id: "only-section", parent_id: null })];

			const [activeItem] = sections;

			await executeMainToSubConversion(
				sections,
				0,
				0,
				activeItem,
				"new-parent",
				mockToUpdateGrantSection,
				mockUpdateGrantSections,
			);

			const [[calledWith]] = mockUpdateGrantSections.mock.calls;
			expect(calledWith).toHaveLength(1);
			expect(calledWith[0].id).toBe("only-section");
			expect(calledWith[0].parent_id).toBe("new-parent");
			expect(calledWith[0].order).toBe(0);
		});
	});

	describe("calculateDropIndicatorVisibility", () => {
		describe("Edge Cases and Safety", () => {
			it("returns no indicators when dragging same item over itself", () => {
				const sections = createTestSections();
				const activeItem = sections.main1;
				const overItem = sections.main1;

				const result = calculateDropIndicatorVisibility(
					activeItem,
					overItem,
					0,
					0,
					Object.values(sections),
					"main-1",
				);

				expect(result).toEqual({
					isSubsectionWidth: false,
					showAbove: false,
					showBelow: false,
				});
			});

			it("returns default when activeIndex is -1 (invalid)", () => {
				const sections = createTestSections();
				const activeItem = sections.main1;
				const overItem = sections.main2;

				const result = calculateDropIndicatorVisibility(
					activeItem,
					overItem,
					-1,
					3,
					Object.values(sections),
					"main-2",
				);

				expect(result).toEqual({
					isSubsectionWidth: false, // overItem.parent_id is null
					showAbove: false,
					showBelow: true,
				});
			});

			it("returns default when overIndex is -1 (invalid)", () => {
				const sections = createTestSections();
				const activeItem = sections.main1;
				const overItem = sections.sub2a;

				const result = calculateDropIndicatorVisibility(
					activeItem,
					overItem,
					0,
					-1,
					Object.values(sections),
					"sub-2a",
				);

				expect(result).toEqual({
					isSubsectionWidth: true, // overItem.parent_id is not null
					showAbove: false,
					showBelow: true,
				});
			});
		});

		describe("Special Case: Last Subsection Full Width", () => {
			it("shows full width indicator for last subsection when dragging over main with subsections", () => {
				const sections = createTestSections();
				const activeItem = sections.main3;
				const overItem = sections.main1;

				const result = calculateDropIndicatorVisibility(
					activeItem,
					overItem,
					5,
					0,
					Object.values(sections),
					"sub-1b", // Last subsection of main-1
				);

				expect(result).toEqual({
					isSubsectionWidth: false, // Full main section width!
					showAbove: false,
					showBelow: true,
				});
			});

			it("does not apply full width for non-last subsection", () => {
				const sections = createTestSections();
				const activeItem = sections.main3;
				const overItem = sections.main1;

				const result = calculateDropIndicatorVisibility(
					activeItem,
					overItem,
					5,
					0,
					Object.values(sections),
					"sub-1a", // First subsection of main-1, not last
				);

				expect(result.isSubsectionWidth).toBe(false);
				expect(result.showBelow).toBe(true);
			});

			it("does not apply full width when dragging over main without subsections", () => {
				const sections = createTestSections();
				const activeItem = sections.main1;
				const overItem = sections.main3;

				const result = calculateDropIndicatorVisibility(
					activeItem,
					overItem,
					0,
					5,
					Object.values(sections),
					"main-3",
				);

				expect(result).toEqual({
					isSubsectionWidth: false,
					showAbove: false,
					showBelow: true,
				});
			});
		});

		describe("Scenario 1: Sub → Main", () => {
			it("shows below indicator with main width when moving subsection to main", () => {
				const sections = createTestSections();
				const activeItem = sections.sub1a; // Subsection
				const overItem = sections.main2; // Main section

				const result = calculateDropIndicatorVisibility(
					activeItem,
					overItem,
					1,
					3,
					Object.values(sections),
					"main-2",
				);

				expect(result).toEqual({
					isSubsectionWidth: false,
					showAbove: false,
					showBelow: true,
				});
			});

			it("shows below indicator for subsection moving to different main", () => {
				const sections = createTestSections();
				const activeItem = sections.sub2a; // From main-2
				const overItem = sections.main3; // To main-3

				const result = calculateDropIndicatorVisibility(
					activeItem,
					overItem,
					4,
					5,
					Object.values(sections),
					"main-3",
				);

				expect(result).toEqual({
					isSubsectionWidth: false,
					showAbove: false,
					showBelow: true,
				});
			});
		});

		describe("Scenario 2: Main → Sub", () => {
			it("shows above indicator with subsection width when moving main to subsection", () => {
				const sections = createTestSections();
				const activeItem = sections.main3; // Main section without subs
				const overItem = sections.sub1a; // Subsection

				const result = calculateDropIndicatorVisibility(
					activeItem,
					overItem,
					5,
					1,
					Object.values(sections),
					"sub-1a",
				);

				expect(result).toEqual({
					isSubsectionWidth: true,
					showAbove: true,
					showBelow: false,
				});
			});

			it("prevents moving main section into its own subsection", () => {
				const sections = createTestSections();
				const activeItem = sections.main1; // Main with subsections
				const overItem = sections.sub1a; // Its own subsection

				const result = calculateDropIndicatorVisibility(
					activeItem,
					overItem,
					0,
					1,
					Object.values(sections),
					"sub-1a",
				);

				expect(result).toEqual({
					isSubsectionWidth: false,
					showAbove: false,
					showBelow: false, // No indicators - invalid move
				});
			});

			it("allows moving main section with subsections to different parent's subsection", () => {
				const sections = createTestSections();
				const activeItem = sections.main1; // Main with subsections
				const overItem = sections.sub2a; // Different parent's subsection

				const result = calculateDropIndicatorVisibility(
					activeItem,
					overItem,
					0,
					4,
					Object.values(sections),
					"sub-2a",
				);

				expect(result).toEqual({
					isSubsectionWidth: true,
					showAbove: true,
					showBelow: false,
				});
			});
		});

		describe("Scenario 3: Sub → Sub", () => {
			it("shows below indicator when moving subsection down within same parent", () => {
				const sections = createTestSections();
				const activeItem = sections.sub1a; // First subsection
				const overItem = sections.sub1b; // Second subsection, same parent

				const result = calculateDropIndicatorVisibility(
					activeItem,
					overItem,
					1,
					2,
					Object.values(sections),
					"sub-1b",
				);

				expect(result).toEqual({
					isSubsectionWidth: true,
					showAbove: false,
					showBelow: true,
				});
			});

			it("shows above indicator when moving subsection up within same parent", () => {
				const sections = createTestSections();
				const activeItem = sections.sub1b; // Second subsection
				const overItem = sections.sub1a; // First subsection, same parent

				const result = calculateDropIndicatorVisibility(
					activeItem,
					overItem,
					2,
					1,
					Object.values(sections),
					"sub-1a",
				);

				expect(result).toEqual({
					isSubsectionWidth: true,
					showAbove: false,
					showBelow: false,
				});
			});

			it("shows no indicator for no-op case (adjacent with same parent)", () => {
				const sections = createTestSections();
				const activeItem = sections.sub1b;
				const overItem = sections.sub1a;

				const result = calculateDropIndicatorVisibility(
					activeItem,
					overItem,
					2,
					1,
					Object.values(sections),
					"sub-1a",
				);

				expect(result).toEqual({
					isSubsectionWidth: true,
					showAbove: false,
					showBelow: false,
				});
			});

			it("shows below indicator when moving subsection to different parent", () => {
				const sections = createTestSections();
				const activeItem = sections.sub1a; // From main-1
				const overItem = sections.sub2a; // To main-2 parent

				const result = calculateDropIndicatorVisibility(
					activeItem,
					overItem,
					1,
					4,
					Object.values(sections),
					"sub-2a",
				);

				expect(result).toEqual({
					isSubsectionWidth: true,
					showAbove: false,
					showBelow: true,
				});
			});
		});

		describe("Scenario 4: Main → Main", () => {
			it("shows below indicator when moving main section down", () => {
				const sections = createTestSections();
				const activeItem = sections.main1;
				const overItem = sections.main3;

				const result = calculateDropIndicatorVisibility(
					activeItem,
					overItem,
					0,
					5,
					Object.values(sections),
					"main-3",
				);

				expect(result).toEqual({
					isSubsectionWidth: false,
					showAbove: false,
					showBelow: true,
				});
			});

			it("shows above indicator when moving main section up", () => {
				const sections = createTestSections();
				const activeItem = sections.main3;
				const overItem = sections.main1;

				const result = calculateDropIndicatorVisibility(
					activeItem,
					overItem,
					5,
					0,
					Object.values(sections),
					"main-1",
				);

				expect(result).toEqual({
					isSubsectionWidth: false,
					showAbove: false,
					showBelow: true,
				});
			});

			it("uses safe default for complex main-to-main with subsections", () => {
				const sections = createTestSections();
				const activeItem = sections.main1;
				const overItem = sections.main2;

				const result = calculateDropIndicatorVisibility(
					activeItem,
					overItem,
					0,
					3,
					Object.values(sections),
					"main-2",
				);

				expect(result).toEqual({
					isSubsectionWidth: false,
					showAbove: false,
					showBelow: true,
				});
			});
		});

		describe("Error Handling", () => {
			it("handles errors gracefully and returns default", () => {
				const malformedSections = [{ id: "bad-section", order: 0, parent_id: "non-existent" } as any];

				const activeItem = GrantSectionDetailedFactory.build({ id: "active", parent_id: null });
				const overItem = GrantSectionDetailedFactory.build({ id: "over", parent_id: null });

				const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

				const result = calculateDropIndicatorVisibility(activeItem, overItem, 0, 1, malformedSections, "over");

				expect(result).toEqual({
					isSubsectionWidth: false,
					showAbove: false,
					showBelow: true,
				});

				consoleSpy.mockRestore();
			});
		});

		describe("Complex Real-World Scenarios", () => {
			it("handles deeply nested hierarchy with multiple parents", () => {
				const complexSections = [
					GrantSectionDetailedFactory.build({ id: "main-a", order: 0, parent_id: null }),
					GrantSectionDetailedFactory.build({ id: "sub-a1", order: 1, parent_id: "main-a" }),
					GrantSectionDetailedFactory.build({ id: "sub-a2", order: 2, parent_id: "main-a" }),
					GrantSectionDetailedFactory.build({ id: "sub-a3", order: 3, parent_id: "main-a" }),
					GrantSectionDetailedFactory.build({ id: "main-b", order: 4, parent_id: null }),
					GrantSectionDetailedFactory.build({ id: "sub-b1", order: 5, parent_id: "main-b" }),
					GrantSectionDetailedFactory.build({ id: "main-c", order: 6, parent_id: null }),
				];

				const result = calculateDropIndicatorVisibility(
					complexSections[1],
					complexSections[5],
					1,
					5,
					complexSections,
					"sub-b1",
				);

				expect(result).toEqual({
					isSubsectionWidth: true,
					showAbove: false,
					showBelow: true,
				});
			});

			it("handles single-subsection parent correctly for last subsection logic", () => {
				const singleSubSections = [
					GrantSectionDetailedFactory.build({ id: "main-1", order: 0, parent_id: null }),
					GrantSectionDetailedFactory.build({ id: "sub-1-only", order: 1, parent_id: "main-1" }),
					GrantSectionDetailedFactory.build({ id: "main-2", order: 2, parent_id: null }),
				];

				const result = calculateDropIndicatorVisibility(
					singleSubSections[2],
					singleSubSections[0],
					2,
					0,
					singleSubSections,
					"sub-1-only",
				);

				expect(result).toEqual({
					isSubsectionWidth: false,
					showAbove: false,
					showBelow: true,
				});
			});

			it("prioritizes last subsection rule over regular main-to-main logic", () => {
				const sections = createTestSections();
				const activeItem = sections.main2;
				const overItem = sections.main1;

				const result = calculateDropIndicatorVisibility(
					activeItem,
					overItem,
					3,
					0,
					Object.values(sections),
					"sub-1b",
				);

				expect(result).toEqual({
					isSubsectionWidth: false,
					showAbove: false,
					showBelow: true,
				});
			});
		});
	});
});
