import * as React from "react";
import type { ButtonProps } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import type { UseFontFamilyConfig } from "@/components/ui/font-family-button";
import { useFontFamily } from "@/components/ui/font-family-button";
import { useTiptapEditor } from "@/hooks/use-tiptap-editor";

export interface FontFamilyButtonProps extends Omit<ButtonProps, "type">, UseFontFamilyConfig {
	text?: string;
	showTooltip?: boolean;
}

export const FontFamilyButton = React.forwardRef<HTMLButtonElement, FontFamilyButtonProps>(
	(
		{
			editor: providedEditor,
			fontFamily,
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
		const { isVisible, canToggle, isActive, handleToggle, label } = useFontFamily({
			editor,
			fontFamily,
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
				style={{ fontFamily }}
				{...buttonProps}
				ref={ref}
			>
				{children ?? (text && <span className="tiptap-button-text">{text}</span>)}
			</Button>
		);
	},
);

FontFamilyButton.displayName = "FontFamilyButton";
