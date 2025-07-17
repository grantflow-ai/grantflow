import { type Editor, isNodeSelection } from "@tiptap/react";
import * as React from "react";

// --- Hooks ---
import { useTiptapEditor } from "../../../hooks/use-tiptap-editor";

// --- Icons ---
import { CornerDownLeftIcon } from "../../tiptap-icons/corner-down-left-icon";
import { ExternalLinkIcon } from "../../tiptap-icons/external-link-icon";
import { LinkIcon } from "../../tiptap-icons/link-icon";
import { TrashIcon } from "../../tiptap-icons/trash-icon";

// --- Lib ---

// --- UI Primitives ---
import type { ButtonProps } from "../../tiptap-ui-primitive/button";
import { Button } from "../../tiptap-ui-primitive/button";
import { Popover, PopoverContent, PopoverTrigger } from "../../tiptap-ui-primitive/popover";
import { Separator } from "../../tiptap-ui-primitive/separator";

// --- Styles ---
import "./link-popover.css";
import { isMarkInSchema, sanitizeUrl } from "../../../tiptap-utils";

export interface LinkHandlerProps {
	editor: Editor | null;
	onLinkActive?: () => void;
	onSetLink?: () => void;
}

export interface LinkMainProps {
	isActive: boolean;
	removeLink: () => void;
	setLink: () => void;
	setUrl: React.Dispatch<React.SetStateAction<null | string>>;
	url: string;
}

export const useLinkHandler = (props: LinkHandlerProps) => {
	const { editor, onLinkActive, onSetLink } = props;
	const [url, setUrl] = React.useState<null | string>(null);

	React.useEffect(() => {
		if (!editor) return;

		// Get URL immediately on mount
		const { href } = editor.getAttributes("link");

		if (editor.isActive("link") && url === null) {
			setUrl(href || "");
			onLinkActive?.();
		}
	}, [editor, onLinkActive, url]);

	React.useEffect(() => {
		if (!editor) return;

		const updateLinkState = () => {
			const { href } = editor.getAttributes("link");
			setUrl(href || "");

			if (editor.isActive("link") && url !== null) {
				onLinkActive?.();
			}
		};

		editor.on("selectionUpdate", updateLinkState);
		return () => {
			editor.off("selectionUpdate", updateLinkState);
		};
	}, [editor, onLinkActive, url]);

	const setLink = React.useCallback(() => {
		if (!(url && editor)) return;

		editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();

		setUrl(null);

		onSetLink?.();
	}, [editor, onSetLink, url]);

	const removeLink = React.useCallback(() => {
		if (!editor) return;
		editor.chain().focus().extendMarkRange("link").unsetLink().setMeta("preventAutolink", true).run();
		setUrl("");
	}, [editor]);

	return {
		isActive: editor?.isActive("link"),
		removeLink,
		setLink,
		setUrl,
		url: url || "",
	};
};

export const LinkButton = React.forwardRef<HTMLButtonElement, ButtonProps>(({ children, className, ...props }, ref) => {
	return (
		<Button
			aria-label="Link"
			className={className}
			data-style="ghost"
			ref={ref}
			tabIndex={-1}
			tooltip="Link"
			type="button"
			{...props}
		>
			{children || <LinkIcon className="tiptap-button-icon" />}
		</Button>
	);
});

export const LinkContent: React.FC<{
	editor?: Editor | null;
}> = ({ editor: providedEditor }) => {
	const editor = useTiptapEditor(providedEditor);

	const linkHandler = useLinkHandler({
		editor,
	});

	return <LinkMain {...linkHandler} />;
};

const LinkMain: React.FC<LinkMainProps> = ({ isActive, removeLink, setLink, setUrl, url }) => {
	const handleKeyDown = (event: React.KeyboardEvent) => {
		if (event.key === "Enter") {
			event.preventDefault();
			setLink();
		}
	};

	const handleOpenLink = () => {
		if (!url) return;

		const safeUrl = sanitizeUrl(url, globalThis.location.href);
		if (safeUrl !== "#") {
			window.open(safeUrl, "_blank", "noopener,noreferrer");
		}
	};

	return (
		<>
			<input
				autoCapitalize="off"
				autoComplete="off"
				autoCorrect="off"
				className="tiptap-input tiptap-input-clamp"
				onChange={(e) => {
					setUrl(e.target.value);
				}}
				onKeyDown={handleKeyDown}
				placeholder="Paste a link..."
				type="url"
				value={url}
			/>

			<div className="tiptap-button-group" data-orientation="horizontal">
				<Button
					data-style="ghost"
					disabled={!(url || isActive)}
					onClick={setLink}
					title="Apply link"
					type="button"
				>
					<CornerDownLeftIcon className="tiptap-button-icon" />
				</Button>
			</div>

			<Separator />

			<div className="tiptap-button-group" data-orientation="horizontal">
				<Button
					data-style="ghost"
					disabled={!(url || isActive)}
					onClick={handleOpenLink}
					title="Open in new window"
					type="button"
				>
					<ExternalLinkIcon className="tiptap-button-icon" />
				</Button>

				<Button
					data-style="ghost"
					disabled={!(url || isActive)}
					onClick={removeLink}
					title="Remove link"
					type="button"
				>
					<TrashIcon className="tiptap-button-icon" />
				</Button>
			</div>
		</>
	);
};

export interface LinkPopoverProps extends Omit<ButtonProps, "type"> {
	/**
	 * Whether to automatically open the popover when a link is active.
	 * @default true
	 */
	autoOpenOnLinkActive?: boolean;
	/**
	 * The TipTap editor instance.
	 */
	editor?: Editor | null;
	/**
	 * Whether to hide the link popover.
	 * @default false
	 */
	hideWhenUnavailable?: boolean;
	/**
	 * Callback for when the popover opens or closes.
	 */
	onOpenChange?: (isOpen: boolean) => void;
}

export function LinkPopover({
	autoOpenOnLinkActive = true,
	editor: providedEditor,
	hideWhenUnavailable = false,
	onOpenChange,
	...props
}: LinkPopoverProps) {
	const editor = useTiptapEditor(providedEditor);

	const linkInSchema = isMarkInSchema("link", editor);

	const [isOpen, setIsOpen] = React.useState(false);

	const onSetLink = () => {
		setIsOpen(false);
	};

	const onLinkActive = () => {
		setIsOpen(autoOpenOnLinkActive);
	};

	const linkHandler = useLinkHandler({
		editor,
		onLinkActive,
		onSetLink,
	});

	const isDisabled = React.useMemo(() => {
		if (!editor) return true;
		if (editor.isActive("codeBlock")) return true;
		return !editor.can().setLink?.({ href: "" });
	}, [editor]);

	const canSetLink = React.useMemo(() => {
		if (!editor) return false;
		try {
			return editor.can().setMark("link");
		} catch {
			return false;
		}
	}, [editor]);

	const isActive = editor?.isActive("link") ?? false;

	const handleOnOpenChange = React.useCallback(
		(nextIsOpen: boolean) => {
			setIsOpen(nextIsOpen);
			onOpenChange?.(nextIsOpen);
		},
		[onOpenChange],
	);

	const show = React.useMemo(() => {
		if (!(linkInSchema && editor)) {
			return false;
		}

		if (hideWhenUnavailable && (isNodeSelection(editor.state.selection) || !canSetLink)) {
			return false;
		}

		return true;
	}, [linkInSchema, hideWhenUnavailable, editor, canSetLink]);

	if (!(show && editor && editor.isEditable)) {
		return null;
	}

	return (
		<Popover onOpenChange={handleOnOpenChange} open={isOpen}>
			<PopoverTrigger asChild>
				<LinkButton
					data-active-state={isActive ? "on" : "off"}
					data-disabled={isDisabled}
					disabled={isDisabled}
					{...props}
				/>
			</PopoverTrigger>

			<PopoverContent>
				<LinkMain {...linkHandler} />
			</PopoverContent>
		</Popover>
	);
}

LinkButton.displayName = "LinkButton";
