// Main Editor Component

// Editor Types
export type { Editor as TiptapEditor } from "@tiptap/react";
export { AlignCenterIcon } from "./components/tiptap-icons/align-center-icon";
export { AlignJustifyIcon } from "./components/tiptap-icons/align-justify-icon";
export { AlignLeftIcon } from "./components/tiptap-icons/align-left-icon";
export { AlignRightIcon } from "./components/tiptap-icons/align-right-icon";
export { BlockquoteIcon } from "./components/tiptap-icons/blockquote-icon";
// Icons (selective export of commonly used ones)
export { BoldIcon } from "./components/tiptap-icons/bold-icon";
export { Code2Icon } from "./components/tiptap-icons/code2-icon";
export { HeadingIcon } from "./components/tiptap-icons/heading-icon";
export { HighlighterIcon } from "./components/tiptap-icons/highlighter-icon";
export { ImagePlusIcon } from "./components/tiptap-icons/image-plus-icon";
export { ItalicIcon } from "./components/tiptap-icons/italic-icon";
export { LinkIcon } from "./components/tiptap-icons/link-icon";
export { ListIcon } from "./components/tiptap-icons/list-icon";
export { ListOrderedIcon } from "./components/tiptap-icons/list-ordered-icon";
export { ListTodoIcon } from "./components/tiptap-icons/list-todo-icon";
export { Redo2Icon } from "./components/tiptap-icons/redo2-icon";
export { StrikeIcon } from "./components/tiptap-icons/strike-icon";
export { UnderlineIcon } from "./components/tiptap-icons/underline-icon";
export { Undo2Icon } from "./components/tiptap-icons/undo2-icon";
// Custom Extensions
export { HorizontalRule } from "./components/tiptap-node/horizontal-rule-node/horizontal-rule-node-extension";
export { ImageUploadNode } from "./components/tiptap-node/image-upload-node/image-upload-node-extension";
export { Editor } from "./components/tiptap-templates/simple/simple-editor";
export { Badge } from "./components/tiptap-ui-primitive/badge";
// UI Components (if needed by consumers)
export { Button } from "./components/tiptap-ui-primitive/button";
export {
	Card,
	CardBody,
	CardFooter,
	CardGroupLabel,
	CardHeader,
	CardItemGroup,
} from "./components/tiptap-ui-primitive/card";
export {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuPortal,
	DropdownMenuRadioGroup,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "./components/tiptap-ui-primitive/dropdown-menu";
export {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "./components/tiptap-ui-primitive/popover";
export { Separator } from "./components/tiptap-ui-primitive/separator";
export { Spacer } from "./components/tiptap-ui-primitive/spacer";
export {
	Toolbar,
	ToolbarGroup,
	ToolbarSeparator,
} from "./components/tiptap-ui-primitive/toolbar";
export { useCursorVisibility } from "./hooks/use-cursor-visibility";
// Hooks (if consumers need them)
export { useIsMobile } from "./hooks/use-mobile";
export { useWindowSize } from "./hooks/use-window-size";
// Utilities
export { cn, handleImageUpload, MAX_FILE_SIZE } from "./tiptap-utils";
