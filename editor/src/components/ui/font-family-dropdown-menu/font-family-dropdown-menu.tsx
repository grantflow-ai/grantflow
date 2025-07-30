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
import { FontFamilyButton } from "@/components/ui/font-family-button";
import { useTiptapEditor } from "@/hooks/use-tiptap-editor";
import type { UseFontFamilyDropdownMenuConfig } from "./use-font-family-dropdown-menu";
import { useFontFamilyDropdownMenu } from "./use-font-family-dropdown-menu";

export interface FontFamilyDropdownMenuProps extends Omit<ButtonProps, "type">, UseFontFamilyDropdownMenuConfig {
	portal?: boolean;
	onOpenChange?: (isOpen: boolean) => void;
}

export const FontFamilyDropdownMenu = React.forwardRef<HTMLButtonElement, FontFamilyDropdownMenuProps>(
	(
		{
			editor: providedEditor,
			fontFamilies = ["Arial", "Times New Roman", "Courier New", "Georgia", "Verdana"],
			hideWhenUnavailable = false,
			portal = false,
			onOpenChange,
			...buttonProps
		},
		ref,
	) => {
		const { editor } = useTiptapEditor(providedEditor);
		const [isOpen, setIsOpen] = React.useState(false);
		const { isVisible, isActive, canToggle, Icon } = useFontFamilyDropdownMenu({
			editor,
			fontFamilies,
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

		console.log("isVisible", isVisible);

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
						aria-label="Select font family"
						aria-pressed={isActive}
						tooltip="Font Family"
						{...buttonProps}
						ref={ref}
					>
						<Icon />
						<ChevronDownIcon style={{ marginLeft: "0.2rem" }} className="tiptap-button-dropdown-small" />
					</Button>
				</DropdownMenuTrigger>

				<DropdownMenuContent align="start" portal={portal}>
					<Card>
						<CardBody>
							<ButtonGroup>
								{fontFamilies.map((fontFamily) => (
									<DropdownMenuItem key={`font-family-${fontFamily}`} asChild>
										<FontFamilyButton
											editor={editor}
											fontFamily={fontFamily}
											text={fontFamily}
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

FontFamilyDropdownMenu.displayName = "FontFamilyDropdownMenu";

export default FontFamilyDropdownMenu;
