import * as React from "react";
import { Badge } from "@/components/ui/badge";
import type { ButtonProps } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import type { UndoRedoAction, UseUndoRedoConfig } from "@/components/ui/undo-redo-button";
import { UNDO_REDO_SHORTCUT_KEYS, useUndoRedo } from "@/components/ui/undo-redo-button";
import { useTiptapEditor } from "@/hooks/use-tiptap-editor";

import { parseShortcutKeys } from "@/utils";

export interface UndoRedoButtonProps extends Omit<ButtonProps, "type">, UseUndoRedoConfig {
	/**
	 * Optional text to display alongside the icon.
	 */
	text?: string;
	/**
	 * Optional show shortcut keys in the button.
	 * @default false
	 */
	showShortcut?: boolean;
}

export function HistoryShortcutBadge({
	action,
	shortcutKeys = UNDO_REDO_SHORTCUT_KEYS[action],
}: {
	action: UndoRedoAction;
	shortcutKeys?: string;
}) {
	return <Badge>{parseShortcutKeys({ shortcutKeys })}</Badge>;
}

/**
 * Button component for triggering undo/redo actions in a Tiptap editor.
 *
 * For custom button implementations, use the `useHistory` hook instead.
 */
export const UndoRedoButton = React.forwardRef<HTMLButtonElement, UndoRedoButtonProps>(
	(
		{
			editor: providedEditor,
			action,
			text,
			hideWhenUnavailable = false,
			onExecuted,
			showShortcut = false,
			onClick,
			children,
			...buttonProps
		},
		ref,
	) => {
		const { editor } = useTiptapEditor(providedEditor);
		const { isVisible, handleAction, label, canExecute, Icon, shortcutKeys } = useUndoRedo({
			action,
			editor,
			hideWhenUnavailable,
			onExecuted,
		});

		const handleClick = React.useCallback(
			(event: React.MouseEvent<HTMLButtonElement>) => {
				onClick?.(event);
				if (event.defaultPrevented) return;
				handleAction();
			},
			[handleAction, onClick],
		);

		if (!isVisible) {
			return null;
		}

		return (
			<Button
				type="button"
				disabled={!canExecute}
				data-style="ghost"
				data-disabled={!canExecute}
				tabIndex={-1}
				aria-label={label}
				tooltip={label}
				onClick={handleClick}
				{...buttonProps}
				ref={ref}
			>
				{children ?? (
					<>
						<Icon className="tiptap-button-icon" />
						{text && <span className="tiptap-button-text">{text}</span>}
						{showShortcut && <HistoryShortcutBadge action={action} shortcutKeys={shortcutKeys} />}
					</>
				)}
			</Button>
		);
	},
);

UndoRedoButton.displayName = "UndoRedoButton";
