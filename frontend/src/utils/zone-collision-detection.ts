import {
	type Active,
	type Collision,
	type CollisionDetection,
	closestCenter,
	type Data,
	type DataRef,
	pointerWithin,
} from "@dnd-kit/core";
import type { ZoneType } from "@/components/organizations/project/applications/wizard/application-structure/drag-drop-context";
import type { GrantSection } from "@/types/grant-sections";

export const createZoneCollisionDetection = (): CollisionDetection => {
	return (args) => {
		const { active, droppableRects, pointerCoordinates } = args;

		// Use closestCenter as the primary detection for better drop experience
		const closestCollisions = closestCenter(args);

		// Fall back to pointerWithin if closestCenter returns nothing
		const defaultCollisions = closestCollisions.length > 0 ? closestCollisions : pointerWithin(args);

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

		if (!collidingSection) {
			return defaultCollisions;
		}

		// For subsections being dragged, we still want to detect zones when over main sections
		// This allows converting subsections to parents by dropping them in the sibling zone
		if (collidingSection.parent_id !== null) {
			// If we're over a subsection, no zone detection is needed
			return defaultCollisions;
		}

		const relativeX = pointerCoordinates.x - rect.left;
		const zonePercent = (relativeX / rect.width) * 100;
		// Increase the sibling zone from 16% to 25% for easier dropping
		const zone: ZoneType = zonePercent < 25 ? "sibling" : "child";

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
