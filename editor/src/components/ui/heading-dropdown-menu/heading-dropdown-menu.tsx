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
import { HeadingButton } from "@/components/ui/heading-button";
import type { UseHeadingDropdownMenuConfig } from "@/components/ui/heading-dropdown-menu";
import { useHeadingDropdownMenu } from "@/components/ui/heading-dropdown-menu";

import { useTiptapEditor } from "@/hooks/use-tiptap-editor";

export interface HeadingDropdownMenuProps extends Omit<ButtonProps, "type">, UseHeadingDropdownMenuConfig {
	portal?: boolean;
	onOpenChange?: (isOpen: boolean) => void;
}

export const HeadingDropdownMenu = React.forwardRef<HTMLButtonElement, HeadingDropdownMenuProps>(
	(
		{
			editor: providedEditor,
			levels = [1, 2, 3, 4, 5, 6],
			hideWhenUnavailable = false,
			portal = false,
			onOpenChange,
			...buttonProps
		},
		ref,
	) => {
		const { editor } = useTiptapEditor(providedEditor);
		const [isOpen, setIsOpen] = React.useState(false);
		const { isVisible, isActive, canToggle, Icon } = useHeadingDropdownMenu({
			editor,
			hideWhenUnavailable,
			levels,
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
						aria-label="Format text as heading"
						aria-pressed={isActive}
						tooltip="Heading"
						{...buttonProps}
						ref={ref}
					>
						<Icon className="tiptap-button-icon" />
						<ChevronDownIcon className="tiptap-button-dropdown-small" />
					</Button>
				</DropdownMenuTrigger>

				<DropdownMenuContent align="start" portal={portal}>
					<Card>
						<CardBody>
							<ButtonGroup>
								{levels.map((level) => (
									<DropdownMenuItem key={`heading-${level}`} asChild>
										<HeadingButton
											editor={editor}
											level={level}
											text={`Heading ${level}`}
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

HeadingDropdownMenu.displayName = "HeadingDropdownMenu";

export default HeadingDropdownMenu;
