import * as React from "react";
import { Badge } from "@/components/ui/badge";
import type { UseBlockquoteConfig } from "@/components/ui/blockquote-button";
import { BLOCKQUOTE_SHORTCUT_KEY, useBlockquote } from "@/components/ui/blockquote-button";
import type { ButtonProps } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import { useTiptapEditor } from "@/hooks/use-tiptap-editor";

import { parseShortcutKeys } from "@/utils";

export interface BlockquoteButtonProps extends Omit<ButtonProps, "type">, UseBlockquoteConfig {
	text?: string;
	showShortcut?: boolean;
}

export function BlockquoteShortcutBadge({ shortcutKeys = BLOCKQUOTE_SHORTCUT_KEY }: { shortcutKeys?: string }) {
	return <Badge>{parseShortcutKeys({ shortcutKeys })}</Badge>;
}

export const BlockquoteButton = React.forwardRef<HTMLButtonElement, BlockquoteButtonProps>(
	(
		{
			editor: providedEditor,
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
		const { isVisible, canToggle, isActive, handleToggle, label, shortcutKeys, Icon } = useBlockquote({
			editor,
			hideWhenUnavailable,
			onToggled,
		});

		const handleClick = React.useCallback(
			(event: React.MouseEvent<HTMLButtonElement>) => {
				onClick?.(event);
				if (event.defaultPrevented) return;
				handleToggle();
			},
			[handleToggle, onClick],
		);

		if (!isVisible) {
			return null;
		}

		return (
			<Button
				type="button"
				data-style="ghost"
				data-active-state={isActive ? "on" : "off"}
				role="button"
				tabIndex={-1}
				disabled={!canToggle}
				data-disabled={!canToggle}
				aria-label={label}
				aria-pressed={isActive}
				tooltip="Blockquote"
				onClick={handleClick}
				{...buttonProps}
				ref={ref}
			>
				{children ?? (
					<>
						<Icon className="tiptap-button-icon" />
						{text && <span className="tiptap-button-text">{text}</span>}
						{showShortcut && <BlockquoteShortcutBadge shortcutKeys={shortcutKeys} />}
					</>
				)}
			</Button>
		);
	},
);

BlockquoteButton.displayName = "BlockquoteButton";
