import type { Editor } from "@tiptap/react";
import * as React from "react";
import { BanIcon } from "@/components/icons/ban-icon";
import { HighlighterIcon } from "@/components/icons/highlighter-icon";
import type { ButtonProps } from "@/components/ui/button";
import { Button, ButtonGroup } from "@/components/ui/button";
import { Card, CardBody, CardItemGroup } from "@/components/ui/card";
import type { HighlightColor, UseColorHighlightConfig } from "@/components/ui/color-highlight-button";
import {
	ColorHighlightButton,
	pickHighlightColorsByValue,
	useColorHighlight,
} from "@/components/ui/color-highlight-button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";

import { useMenuNavigation } from "@/hooks/use-menu-navigation";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTiptapEditor } from "@/hooks/use-tiptap-editor";

export interface ColorHighlightPopoverContentProps {
	/**
	 * The Tiptap editor instance.
	 */
	editor?: Editor | null;
	/**
	 * Optional colors to use in the highlight popover.
	 * If not provided, defaults to a predefined set of colors.
	 */
	colors?: HighlightColor[];
}

export interface ColorHighlightPopoverProps
	extends Omit<ButtonProps, "type">,
		Pick<UseColorHighlightConfig, "editor" | "hideWhenUnavailable" | "onApplied"> {
	/**
	 * Optional colors to use in the highlight popover.
	 * If not provided, defaults to a predefined set of colors.
	 */
	colors?: HighlightColor[];
}

export const ColorHighlightPopoverButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
	({ className, children, ...props }, ref) => (
		<Button
			type="button"
			className={className}
			data-style="ghost"
			data-appearance="default"
			tabIndex={-1}
			aria-label="Highlight text"
			tooltip="Highlight"
			ref={ref}
			{...props}
		>
			{children ?? <HighlighterIcon className="tiptap-button-icon" />}
		</Button>
	),
);

ColorHighlightPopoverButton.displayName = "ColorHighlightPopoverButton";

export function ColorHighlightPopoverContent({
	editor,
	colors = pickHighlightColorsByValue([
		"var(--tt-color-highlight-green)",
		"var(--tt-color-highlight-blue)",
		"var(--tt-color-highlight-red)",
		"var(--tt-color-highlight-purple)",
		"var(--tt-color-highlight-yellow)",
	]),
}: ColorHighlightPopoverContentProps) {
	const { handleRemoveHighlight } = useColorHighlight({ editor });
	const isMobile = useIsMobile();
	const containerRef = React.useRef<HTMLDivElement>(null);

	const menuItems = React.useMemo(() => [...colors, { label: "Remove highlight", value: "none" }], [colors]);

	const { selectedIndex } = useMenuNavigation({
		autoSelectFirstItem: false,
		containerRef,
		items: menuItems,
		onSelect: (item) => {
			if (!containerRef.current) return false;
			const highlightedElement = containerRef.current.querySelector('[data-highlighted="true"]') as HTMLElement;
			if (highlightedElement) highlightedElement.click();
			if (item.value === "none") handleRemoveHighlight();
		},
		orientation: "both",
	});

	return (
		<Card ref={containerRef} tabIndex={0} style={isMobile ? { border: 0, boxShadow: "none" } : {}}>
			<CardBody style={isMobile ? { padding: 0 } : {}}>
				<CardItemGroup orientation="horizontal">
					<ButtonGroup orientation="horizontal">
						{colors.map((color, index) => (
							<ColorHighlightButton
								key={color.value}
								editor={editor}
								highlightColor={color.value}
								tooltip={color.label}
								aria-label={`${color.label} highlight color`}
								tabIndex={index === selectedIndex ? 0 : -1}
								data-highlighted={selectedIndex === index}
							/>
						))}
					</ButtonGroup>
					<Separator />
					<ButtonGroup orientation="horizontal">
						<Button
							onClick={handleRemoveHighlight}
							aria-label="Remove highlight"
							tooltip="Remove highlight"
							tabIndex={selectedIndex === colors.length ? 0 : -1}
							type="button"
							role="menuitem"
							data-style="ghost"
							data-highlighted={selectedIndex === colors.length}
						>
							<BanIcon className="tiptap-button-icon" />
						</Button>
					</ButtonGroup>
				</CardItemGroup>
			</CardBody>
		</Card>
	);
}

export function ColorHighlightPopover({
	editor: providedEditor,
	colors = pickHighlightColorsByValue([
		"var(--tt-color-highlight-green)",
		"var(--tt-color-highlight-blue)",
		"var(--tt-color-highlight-red)",
		"var(--tt-color-highlight-purple)",
		"var(--tt-color-highlight-yellow)",
	]),
	hideWhenUnavailable = false,
	onApplied,
	...props
}: ColorHighlightPopoverProps) {
	const { editor } = useTiptapEditor(providedEditor);
	const [isOpen, setIsOpen] = React.useState(false);
	const { isVisible, canColorHighlight, isActive, label, Icon } = useColorHighlight({
		editor,
		hideWhenUnavailable,
		onApplied,
	});

	if (!isVisible) return null;

	return (
		<Popover open={isOpen} onOpenChange={setIsOpen}>
			<PopoverTrigger asChild>
				<ColorHighlightPopoverButton
					disabled={!canColorHighlight}
					data-active-state={isActive ? "on" : "off"}
					data-disabled={!canColorHighlight}
					aria-pressed={isActive}
					aria-label={label}
					tooltip={label}
					{...props}
				>
					<Icon className="tiptap-button-icon" />
				</ColorHighlightPopoverButton>
			</PopoverTrigger>
			<PopoverContent aria-label="Highlight colors">
				<ColorHighlightPopoverContent editor={editor} colors={colors} />
			</PopoverContent>
		</Popover>
	);
}

export default ColorHighlightPopover;
