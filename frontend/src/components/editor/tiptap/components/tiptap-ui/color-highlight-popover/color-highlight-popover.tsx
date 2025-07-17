import { type Editor, isNodeSelection } from "@tiptap/react";
import * as React from "react";

// --- Hooks ---
import { useMenuNavigation } from "../../../hooks/use-menu-navigation";
import { useTiptapEditor } from "../../../hooks/use-tiptap-editor";

// --- Icons ---
import { BanIcon } from "../../tiptap-icons/ban-icon";
import { HighlighterIcon } from "../../tiptap-icons/highlighter-icon";

// --- UI Primitives ---
import type { ButtonProps } from "../../tiptap-ui-primitive/button";
import { Button } from "../../tiptap-ui-primitive/button";
import { Popover, PopoverContent, PopoverTrigger } from "../../tiptap-ui-primitive/popover";
import { Separator } from "../../tiptap-ui-primitive/separator";

// --- Tiptap UI ---
import { canToggleHighlight, ColorHighlightButton } from "../color-highlight-button";

// --- Styles ---
import "./color-highlight-popover.css";
import { isMarkInSchema } from "../../../tiptap-utils";

export interface ColorHighlightPopoverColor {
	border?: string;
	label: string;
	value: string;
}

export interface ColorHighlightPopoverContentProps {
	colors?: ColorHighlightPopoverColor[];
	editor?: Editor | null;
	onClose?: () => void;
}

export interface ColorHighlightPopoverProps extends Omit<ButtonProps, "type"> {
	/** The highlight colors to display in the popover. */
	colors?: ColorHighlightPopoverColor[];
	/** The TipTap editor instance. */
	editor?: Editor | null;
	/** Whether to hide the highlight popover when unavailable. */
	hideWhenUnavailable?: boolean;
}

export const DEFAULT_HIGHLIGHT_COLORS: ColorHighlightPopoverColor[] = [
	{
		border: "var(--tt-color-highlight-green-contrast)",
		label: "Green",
		value: "var(--tt-color-highlight-green)",
	},
	{
		border: "var(--tt-color-highlight-blue-contrast)",
		label: "Blue",
		value: "var(--tt-color-highlight-blue)",
	},
	{
		border: "var(--tt-color-highlight-red-contrast)",
		label: "Red",
		value: "var(--tt-color-highlight-red)",
	},
	{
		border: "var(--tt-color-highlight-purple-contrast)",
		label: "Purple",
		value: "var(--tt-color-highlight-purple)",
	},
	{
		border: "var(--tt-color-highlight-yellow-contrast)",
		label: "Yellow",
		value: "var(--tt-color-highlight-yellow)",
	},
];

export const ColorHighlightPopoverButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
	({ children, className, ...props }, ref) => (
		<Button
			aria-label="Highlight text"
			className={className}
			data-appearance="default"
			data-style="ghost"
			ref={ref}
			tooltip="Highlight"
			type="button"
			{...props}
		>
			{children || <HighlighterIcon className="tiptap-button-icon" />}
		</Button>
	),
);

ColorHighlightPopoverButton.displayName = "ColorHighlightPopoverButton";

export function ColorHighlightPopover({
	colors = DEFAULT_HIGHLIGHT_COLORS,
	editor: providedEditor,
	hideWhenUnavailable = false,
	...props
}: ColorHighlightPopoverProps) {
	const editor = useTiptapEditor(providedEditor);
	const [isOpen, setIsOpen] = React.useState(false);
	const [isDisabled, setIsDisabled] = React.useState(false);

	const markAvailable = isMarkInSchema("highlight", editor);

	React.useEffect(() => {
		if (!editor) return;

		const updateIsDisabled = () => {
			let isDisabled = false;

			if (!(markAvailable && editor)) {
				isDisabled = true;
			}

			const isInCompatibleContext =
				editor.isActive("code") || editor.isActive("codeBlock") || editor.isActive("imageUpload");

			if (isInCompatibleContext) {
				isDisabled = true;
			}

			setIsDisabled(isDisabled);
		};

		editor.on("selectionUpdate", updateIsDisabled);
		editor.on("update", updateIsDisabled);

		return () => {
			editor.off("selectionUpdate", updateIsDisabled);
			editor.off("update", updateIsDisabled);
		};
	}, [editor, markAvailable]);

	const isActive = editor?.isActive("highlight") ?? false;

	const shouldShow = React.useMemo(() => {
		if (!(hideWhenUnavailable && editor)) return true;

		return !(isNodeSelection(editor.state.selection) || !canToggleHighlight(editor));
	}, [hideWhenUnavailable, editor]);

	if (!(shouldShow && editor && editor.isEditable)) {
		return null;
	}

	return (
		<Popover onOpenChange={setIsOpen} open={isOpen}>
			<PopoverTrigger asChild>
				<ColorHighlightPopoverButton
					aria-pressed={isActive}
					data-active-state={isActive ? "on" : "off"}
					data-disabled={isDisabled}
					disabled={isDisabled}
					{...props}
				/>
			</PopoverTrigger>

			<PopoverContent aria-label="Highlight colors">
				<ColorHighlightPopoverContent
					colors={colors}
					editor={editor}
					onClose={() => {
						setIsOpen(false);
					}}
				/>
			</PopoverContent>
		</Popover>
	);
}

export function ColorHighlightPopoverContent({
	colors = DEFAULT_HIGHLIGHT_COLORS,
	editor: providedEditor,
	onClose,
}: ColorHighlightPopoverContentProps) {
	const editor = useTiptapEditor(providedEditor);
	const containerRef = React.useRef<HTMLDivElement>(null);

	const removeHighlight = React.useCallback(() => {
		if (!editor) return;
		editor.chain().focus().unsetMark("highlight").run();
		onClose?.();
	}, [editor, onClose]);

	const menuItems = React.useMemo(() => [...colors, { label: "Remove highlight", value: "none" }], [colors]);

	const { selectedIndex } = useMenuNavigation({
		autoSelectFirstItem: false,
		containerRef,
		items: menuItems,
		onClose,
		onSelect: (item) => {
			if (item.value === "none") {
				removeHighlight();
			}
			onClose?.();
		},
		orientation: "both",
	});

	return (
		<div className="tiptap-color-highlight-content" ref={containerRef}>
			<div className="tiptap-button-group" data-orientation="horizontal">
				{colors.map((color, index) => (
					<ColorHighlightButton
						aria-label={`${color.label} highlight color`}
						color={color.value}
						data-highlighted={selectedIndex === index}
						editor={editor}
						key={color.value}
						onClick={onClose}
						tabIndex={index === selectedIndex ? 0 : -1}
					/>
				))}
			</div>

			<Separator />

			<div className="tiptap-button-group">
				<Button
					aria-label="Remove highlight"
					data-highlighted={selectedIndex === colors.length}
					data-style="ghost"
					onClick={removeHighlight}
					role="menuitem"
					tabIndex={selectedIndex === colors.length ? 0 : -1}
					type="button"
				>
					<BanIcon className="tiptap-button-icon" />
				</Button>
			</div>
		</div>
	);
}

export default ColorHighlightPopover;
