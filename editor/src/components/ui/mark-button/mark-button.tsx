import * as React from "react";
import { Badge } from "@/components/ui/badge";
import type { ButtonProps } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import type { Mark, UseMarkConfig } from "@/components/ui/mark-button";
import { MARK_SHORTCUT_KEYS, useMark } from "@/components/ui/mark-button";
import { useTiptapEditor } from "@/hooks/use-tiptap-editor";

import { parseShortcutKeys } from "@/utils";

export interface MarkButtonProps extends Omit<ButtonProps, "type">, UseMarkConfig {
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

export function MarkShortcutBadge({
	type,
	shortcutKeys = MARK_SHORTCUT_KEYS[type],
}: {
	type: Mark;
	shortcutKeys?: string;
}) {
	return <Badge>{parseShortcutKeys({ shortcutKeys })}</Badge>;
}

/**
 * Button component for toggling marks in a Tiptap editor.
 *
 * For custom button implementations, use the `useMark` hook instead.
 */
export const MarkButton = React.forwardRef<HTMLButtonElement, MarkButtonProps>(
	(
		{
			editor: providedEditor,
			type,
			text,
			hideWhenUnavailable = false,
			onToggled,
			showShortcut = false,
			onClick,
			children,
			...buttonProps
		},
		ref,
	) => {
		const { editor } = useTiptapEditor(providedEditor);
		const { isVisible, handleMark, label, canToggle, isActive, Icon, shortcutKeys } = useMark({
			editor,
			hideWhenUnavailable,
			onToggled,
			type,
		});

		const handleClick = React.useCallback(
			(event: React.MouseEvent<HTMLButtonElement>) => {
				onClick?.(event);
				if (event.defaultPrevented) return;
				handleMark();
			},
			[handleMark, onClick],
		);

		if (!isVisible) {
			return null;
		}

		return (
			<Button
				type="button"
				disabled={!canToggle}
				data-style="ghost"
				data-active-state={isActive ? "on" : "off"}
				data-disabled={!canToggle}
				tabIndex={-1}
				aria-label={label}
				aria-pressed={isActive}
				tooltip={label}
				onClick={handleClick}
				{...buttonProps}
				ref={ref}
			>
				{children ?? (
					<>
						<Icon className="tiptap-button-icon" />
						{text && <span className="tiptap-button-text">{text}</span>}
						{showShortcut && <MarkShortcutBadge type={type} shortcutKeys={shortcutKeys} />}
					</>
				)}
			</Button>
		);
	},
);

MarkButton.displayName = "MarkButton";
