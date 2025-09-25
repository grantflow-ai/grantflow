import { GrantSectionFactory } from "::testing/factories";
import type { Active, Collision, Data, DataRef } from "@dnd-kit/core";
import { pointerWithin } from "@dnd-kit/core";
import { describe, expect, it, vi } from "vitest";
import type { GrantSection } from "@/types/grant-sections";
import { createZoneCollisionDetection } from "./zone-collision-detection";

vi.mock("@dnd-kit/core", async () => {
	const actual = await vi.importActual("@dnd-kit/core");
	return {
		...actual,
		pointerWithin: vi.fn(),
	};
});

const mockedPointerWithin = vi.mocked(pointerWithin);

// ~keep Helper to create mock collision detection args
const createMockArgs = (overrides: any = {}) => ({
	active: {
		data: {
			current: {
				section: GrantSectionFactory.build({ id: "active-section", parent_id: null }),
			},
		},
		id: "active-section",
	} as {
		data: DataRef<{ section: GrantSection }>;
	} & Active,
	collisionRect: {
		bottom: 150,
		height: 50,
		left: 100,
		right: 200,
		top: 100,
		width: 100,
	},
	droppableContainers: [],
	droppableRects: new Map([
		[
			"target-section",
			{
				bottom: 260,
				height: 60,
				left: 400,
				right: 800,
				top: 200,
				width: 400,
			},
		],
	]),
	pointerCoordinates: { x: 500, y: 230 },
	...overrides,
});

const createMockCollision = (sectionData: Partial<GrantSection> = {}) =>
	({
		data: {
			droppableContainer: {
				data: {
					current: {
						section: GrantSectionFactory.build({
							id: "target-section",
							parent_id: null,
							...sectionData,
						}),
					},
				},
			},
		},
		id: "target-section",
	}) as {
		data: Data<{
			droppableContainer: {
				data: {
					current: {
						section: GrantSection;
					};
				};
			};
		}>;
	} & Collision;

describe("createZoneCollisionDetection", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Early Returns", () => {
		it("returns default collisions when no pointer coordinates", () => {
			const args = createMockArgs({ pointerCoordinates: null });
			const defaultCollisions = [createMockCollision()];
			mockedPointerWithin.mockReturnValue(defaultCollisions);

			const collisionDetection = createZoneCollisionDetection();
			const result = collisionDetection(args);

			expect(result).toBe(defaultCollisions);
			expect(result[0].data).not.toHaveProperty("zone");
		});

		it("returns default collisions when no collisions found", () => {
			const args = createMockArgs();
			mockedPointerWithin.mockReturnValue([]);

			const collisionDetection = createZoneCollisionDetection();
			const result = collisionDetection(args);

			expect(result).toEqual([]);
		});

		it("adds zone data when active section is a subsection", () => {
			const subsection = GrantSectionFactory.build({ parent_id: "main-section" });
			const args = createMockArgs({
				active: {
					data: { current: { section: subsection } },
					id: "subsection",
				} as {
					data: DataRef<{ section: GrantSection }>;
				} & Active,
				pointerCoordinates: { x: 600, y: 230 },
			});
			const defaultCollisions = [createMockCollision()];
			mockedPointerWithin.mockReturnValue(defaultCollisions);

			const collisionDetection = createZoneCollisionDetection();
			const result = collisionDetection(args);

			expect(result[0].data).toMatchObject({
				zone: "child",
				zonePercent: 50,
			});
		});

		it("returns default collisions when no rect found for primary collision", () => {
			const args = createMockArgs({
				droppableRects: new Map(),
			});
			const defaultCollisions = [createMockCollision()];
			mockedPointerWithin.mockReturnValue(defaultCollisions);

			const collisionDetection = createZoneCollisionDetection();
			const result = collisionDetection(args);

			expect(result).toBe(defaultCollisions);
		});

		it("returns default collisions when colliding section is a subsection", () => {
			const args = createMockArgs();
			const subsectionCollision = createMockCollision({ parent_id: "main-section" });
			mockedPointerWithin.mockReturnValue([subsectionCollision]);

			const collisionDetection = createZoneCollisionDetection();
			const result = collisionDetection(args);

			expect(result).toEqual([subsectionCollision]);
			expect(result[0].data).not.toHaveProperty("zone");
		});
	});

	describe("Zone Calculation", () => {
		it("calculates sibling zone when mouse is in left 16%", () => {
			const args = createMockArgs({
				pointerCoordinates: { x: 440, y: 230 },
			});
			const defaultCollisions = [createMockCollision()];
			mockedPointerWithin.mockReturnValue(defaultCollisions);

			const collisionDetection = createZoneCollisionDetection();
			const result = collisionDetection(args);

			expect(result[0].data).toMatchObject({
				zone: "sibling",
				zonePercent: 10,
			});
		});

		it("calculates child zone when mouse is in right 84%", () => {
			const args = createMockArgs({
				pointerCoordinates: { x: 600, y: 230 },
			});
			const defaultCollisions = [createMockCollision()];
			mockedPointerWithin.mockReturnValue(defaultCollisions);

			const collisionDetection = createZoneCollisionDetection();
			const result = collisionDetection(args);

			expect(result[0].data).toMatchObject({
				zone: "child",
				zonePercent: 50,
			});
		});

		it("handles exact 16% boundary (should be sibling zone with 25% threshold)", () => {
			const args = createMockArgs({
				pointerCoordinates: { x: 464, y: 230 },
			});
			const defaultCollisions = [createMockCollision()];
			mockedPointerWithin.mockReturnValue(defaultCollisions);

			const collisionDetection = createZoneCollisionDetection();
			const result = collisionDetection(args);

			expect(result[0].data).toMatchObject({
				zone: "sibling",
				zonePercent: 16,
			});
		});

		it("handles exact 25% boundary (should be child zone)", () => {
			const args = createMockArgs({
				pointerCoordinates: { x: 500, y: 230 }, // 25% = (500 - 400) / 400 = 0.25
			});
			const defaultCollisions = [createMockCollision()];
			mockedPointerWithin.mockReturnValue(defaultCollisions);

			const collisionDetection = createZoneCollisionDetection();
			const result = collisionDetection(args);

			expect(result[0].data).toMatchObject({
				zone: "child",
				zonePercent: 25,
			});
		});

		it("handles mouse at far left edge", () => {
			const args = createMockArgs({
				pointerCoordinates: { x: 400, y: 230 },
			});
			const defaultCollisions = [createMockCollision()];
			mockedPointerWithin.mockReturnValue(defaultCollisions);

			const collisionDetection = createZoneCollisionDetection();
			const result = collisionDetection(args);

			expect(result[0].data).toMatchObject({
				zone: "sibling",
				zonePercent: 0,
			});
		});

		it("handles mouse at far right edge", () => {
			const args = createMockArgs({
				pointerCoordinates: { x: 800, y: 230 },
			});
			const defaultCollisions = [createMockCollision()];
			mockedPointerWithin.mockReturnValue(defaultCollisions);

			const collisionDetection = createZoneCollisionDetection();
			const result = collisionDetection(args);

			expect(result[0].data).toMatchObject({
				zone: "child",
				zonePercent: 100,
			});
		});
	});

	describe("Multiple Collisions", () => {
		it("applies zone data to all collisions", () => {
			const args = createMockArgs({
				pointerCoordinates: { x: 440, y: 230 },
			});
			const collision1 = createMockCollision();
			const collision2 = { ...createMockCollision(), id: "other-section" };
			const defaultCollisions = [collision1, collision2];
			mockedPointerWithin.mockReturnValue(defaultCollisions);

			const collisionDetection = createZoneCollisionDetection();
			const result = collisionDetection(args);

			expect(result).toHaveLength(2);
			expect(result[0].data).toMatchObject({
				zone: "sibling",
				zonePercent: 10,
			});
			expect(result[1].data).toMatchObject({
				zone: "sibling",
				zonePercent: 10,
			});
		});
	});

	describe("Edge Cases", () => {
		it("handles missing section data in active", () => {
			const args = createMockArgs({
				active: {
					data: { current: {} },
					id: "active-section",
				} as {
					data: DataRef<{ section: GrantSection }>;
				} & Active,
			});
			const defaultCollisions = [createMockCollision()];
			mockedPointerWithin.mockReturnValue(defaultCollisions);

			const collisionDetection = createZoneCollisionDetection();
			const result = collisionDetection(args);

			expect(result).toBe(defaultCollisions);
			expect(result[0].data).not.toHaveProperty("zone");
		});

		it("handles missing section data in collision", () => {
			const args = createMockArgs();
			const collisionWithoutSection = {
				data: {
					droppableContainer: {
						data: { current: {} },
					},
				},
				id: "target-section",
			};
			mockedPointerWithin.mockReturnValue([collisionWithoutSection]);

			const collisionDetection = createZoneCollisionDetection();
			const result = collisionDetection(args);

			expect(result).toEqual([collisionWithoutSection]);
			expect(result[0].data).not.toHaveProperty("zone");
		});

		it("preserves existing collision data", () => {
			const args = createMockArgs({
				pointerCoordinates: { x: 600, y: 230 },
			});
			const collisionWithExistingData = {
				...createMockCollision(),
				data: {
					...createMockCollision().data,
					anotherProperty: 123,
					existingProperty: "preserved",
				},
			};
			mockedPointerWithin.mockReturnValue([collisionWithExistingData]);

			const collisionDetection = createZoneCollisionDetection();
			const result = collisionDetection(args);

			expect(result[0].data).toMatchObject({
				anotherProperty: 123,
				existingProperty: "preserved",
				zone: "child",
				zonePercent: 50,
			});
		});
	});

	describe("Integration", () => {
		it("works with realistic grant section data", () => {
			const args = createMockArgs({
				active: {
					data: {
						current: {
							section: GrantSectionFactory.build({
								id: "research-strategy",
								order: 0,
								parent_id: null,
								title: "Research Strategy",
							}),
						},
					},
					id: "research-strategy",
				} as {
					data: DataRef<{ section: GrantSection }>;
				} & Active,
				pointerCoordinates: { x: 450, y: 230 },
			});

			const collision = createMockCollision({
				id: "project-summary",
				order: 1,
				parent_id: null,
				title: "Project Summary",
			});
			mockedPointerWithin.mockReturnValue([collision]);

			const collisionDetection = createZoneCollisionDetection();
			const result = collisionDetection(args);

			expect(result[0].data).toMatchObject({
				zone: "sibling",
				zonePercent: 12.5,
			});
		});
	});
});
