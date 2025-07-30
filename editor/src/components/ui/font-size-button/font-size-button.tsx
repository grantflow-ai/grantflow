import * as React from "react";
import type { ButtonProps } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import { useTiptapEditor } from "@/hooks/use-tiptap-editor";
import type { UseFontSizeConfig } from "./use-font-size";
import { useFontSize } from "./use-font-size";

export interface FontSizeButtonProps extends Omit<ButtonProps, "type">, UseFontSizeConfig {
	text?: string;
	showTooltip?: boolean;
}

export const FontSizeButton = React.forwardRef<HTMLButtonElement, FontSizeButtonProps>(
	(
		{
			editor: providedEditor,
			fontSize,
			text,
			hideWhenUnavailable = false,
			onToggled,
			showTooltip = true,
			onClick,
			children,
			...buttonProps
		},
		ref,
	) => {
		const { editor } = useTiptapEditor(providedEditor);
		const { isVisible, canToggle, isActive, handleToggle, label } = useFontSize({
			editor,
			fontSize,
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
				tabIndex={-1}
				disabled={!canToggle}
				data-disabled={!canToggle}
				aria-label={label}
				aria-pressed={isActive}
				tooltip={showTooltip ? label : undefined}
				onClick={handleClick}
				{...buttonProps}
				ref={ref}
			>
				{children ?? (text && <span className="tiptap-button-text">{text}</span>)}
			</Button>
		);
	},
);

FontSizeButton.displayName = "FontSizeButton";
