import * as React from "react";

import { ChevronDownIcon } from "@/components/icons/chevron-down-icon";
import type { ButtonProps } from "@/components/ui/button";
import { Button, ButtonGroup } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FontSizeButton } from "@/components/ui/font-size-button";
import { useTiptapEditor } from "@/hooks/use-tiptap-editor";
import type { UseFontSizeDropdownMenuConfig } from "./use-font-size-dropdown-menu";
import { useFontSizeDropdownMenu } from "./use-font-size-dropdown-menu";

export interface FontSizeDropdownMenuProps extends Omit<ButtonProps, "type">, UseFontSizeDropdownMenuConfig {
	portal?: boolean;
	onOpenChange?: (isOpen: boolean) => void;
}

export const FontSizeDropdownMenu = React.forwardRef<HTMLButtonElement, FontSizeDropdownMenuProps>(
	(
		{
			editor: providedEditor,
			fontSizes = ["8px", "10px", "12px", "14px", "16px", "18px", "20px", "24px", "28px", "32px"],
			hideWhenUnavailable = false,
			portal = false,
			onOpenChange,
			...buttonProps
		},
		ref,
	) => {
		const { editor } = useTiptapEditor(providedEditor);
		const [isOpen, setIsOpen] = React.useState(false);
		const { isVisible, isActive, canToggle, Icon } = useFontSizeDropdownMenu({
			editor,
			fontSizes,
			hideWhenUnavailable,
		});

		const handleOpenChange = React.useCallback(
			(open: boolean) => {
				if (!(editor && canToggle)) return;
				setIsOpen(open);
				onOpenChange?.(open);
			},
			[canToggle, editor, onOpenChange],
		);

		if (!isVisible) {
			return null;
		}

		return (
			<DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
				<DropdownMenuTrigger asChild>
					<Button
						type="button"
						data-style="ghost"
						data-active-state={isActive ? "on" : "off"}
						tabIndex={-1}
						disabled={!canToggle}
						data-disabled={!canToggle}
						aria-label="Select font size"
						aria-pressed={isActive}
						tooltip="Font Size"
						{...buttonProps}
						ref={ref}
					>
						<Icon />
						<ChevronDownIcon className="tiptap-button-dropdown-small" />
					</Button>
				</DropdownMenuTrigger>

				<DropdownMenuContent align="start" portal={portal}>
					<Card>
						<CardBody>
							<ButtonGroup>
								{fontSizes.map((fontSize) => (
									<DropdownMenuItem key={`font-size-${fontSize}`} asChild>
										<FontSizeButton
											editor={editor}
											fontSize={fontSize}
											text={fontSize}
											showTooltip={false}
										/>
									</DropdownMenuItem>
								))}
							</ButtonGroup>
						</CardBody>
					</Card>
				</DropdownMenuContent>
			</DropdownMenu>
		);
	},
);

FontSizeDropdownMenu.displayName = "FontSizeDropdownMenu";

export default FontSizeDropdownMenu;
