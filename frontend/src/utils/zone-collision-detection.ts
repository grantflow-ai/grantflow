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

const detectZoneCollision: CollisionDetection = (args) => {
	const { active, droppableRects, pointerCoordinates } = args;

	const closestCollisions = closestCenter(args);

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
	if (!primaryCollision) {
		return defaultCollisions;
	}

	const rect = droppableRects.get(primaryCollision.id);

	if (!rect) {
		return defaultCollisions;
	}

	const { data: { droppableContainer: { data: { current: { section: collidingSection } = {} } = {} } = {} } = {} } =
		primaryCollision as {
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

	if (collidingSection.parent_id !== null) {
		return defaultCollisions;
	}

	const relativeX = pointerCoordinates.x - rect.left;
	const zonePercent = (relativeX / rect.width) * 100;
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

export const createZoneCollisionDetection = (): CollisionDetection => detectZoneCollision;
