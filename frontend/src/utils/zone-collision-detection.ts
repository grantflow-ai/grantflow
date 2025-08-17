import {
	type Active,
	type Collision,
	type CollisionDetection,
	type Data,
	type DataRef,
	pointerWithin,
} from "@dnd-kit/core";
import type { ZoneType } from "@/components/organizations/project/applications/wizard/application-structure/drag-drop-context";
import type { GrantSection } from "@/types/grant-sections";

/**
 * Creates a custom collision detection algorithm that enhances dnd-kit's pointerWithin
 * collision detection with zone information for grant sections.
 *
 * This collision detection function:
 * 1. Activates when dragging any section (main or sub-section)
 * 2. Only calculates zones when hovering over main sections
 * 3. Divides sections into two zones based on mouse X position:
 *    - Left 16%: "sibling" zone (drop as sibling section)
 *    - Right 84%: "child" zone (drop as child subsection)
 * 4. Adds zone and zonePercent data to all collision objects
 *
 * @returns A collision detection function compatible with dnd-kit's DndContext
 *
 * @example
 * ```tsx
 * const zoneCollisionDetection = createZoneCollisionDetection();
 *
 * <DndContext collisionDetection={zoneCollisionDetection}>
 *   // Your drag and drop components
 * </DndContext>
 * ```
 *
 * @example Accessing zone data in drag handlers:
 * ```tsx
 * const onDragMove = (event) => {
 *   const collision = event.collisions?.find(c => c.id === overItem?.id);
 *   const zone = collision?.data?.zone; // "sibling" | "child" | null
 *   const zonePercent = collision?.data?.zonePercent; // 0-100 | null
 * };
 * ```
 */
export const createZoneCollisionDetection = (): CollisionDetection => {
	return (args) => {
		const { active, droppableRects, pointerCoordinates } = args;

		const defaultCollisions = pointerWithin(args);

		if (!pointerCoordinates || defaultCollisions.length === 0) {
			return defaultCollisions;
		}

		const { data: { current: { section: activeSection } = {} } = {} } = active as {
			data: DataRef<{ section: GrantSection }>;
		} & Active;

		if (!activeSection) {
			return defaultCollisions;
		}

		const [primaryCollision] = defaultCollisions;
		const rect = droppableRects.get(primaryCollision.id);

		if (!rect) {
			return defaultCollisions;
		}

		const {
			data: { droppableContainer: { data: { current: { section: collidingSection } = {} } = {} } = {} } = {},
		} = primaryCollision as {
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

		if (!collidingSection || collidingSection.parent_id !== null) {
			return defaultCollisions;
		}

		const relativeX = pointerCoordinates.x - rect.left;
		const zonePercent = (relativeX / rect.width) * 100;
		const zone: ZoneType = zonePercent < 16 ? "sibling" : "child";

		return defaultCollisions.map((collision) => ({
			...collision,
			data: {
				...collision.data,
				zone,
				zonePercent,
			},
		}));
	};
};
