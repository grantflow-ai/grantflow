"use client";

import { CursorOverlayPlugin } from "@udecode/plate-selection/react";

import { CursorOverlay } from "gen/editor/ui/cursor-overlay";

export const cursorOverlayPlugin = CursorOverlayPlugin.configure({
	render: {
		afterEditable: () => <CursorOverlay />,
	},
});
