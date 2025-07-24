import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Highlight } from "@tiptap/extension-highlight";
import { Image } from "@tiptap/extension-image";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import { TextAlign } from "@tiptap/extension-text-align";
import { Typography } from "@tiptap/extension-typography";
import { Selection } from "@tiptap/extensions";
import { EditorContent, EditorContext, useEditor } from "@tiptap/react";
// --- Tiptap Core Extensions ---
import { StarterKit } from "@tiptap/starter-kit";
import * as React from "react";
import { HorizontalRule } from "@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node-extension";
// --- Tiptap Node ---
import { ImageUploadNode } from "@/components/tiptap-node/image-upload-node/image-upload-node-extension";
// --- UI Primitives ---
import { Button } from "@/components/tiptap-ui-primitive/button";
import { Spacer } from "@/components/tiptap-ui-primitive/spacer";
import { Toolbar, ToolbarGroup, ToolbarSeparator, } from "@/components/tiptap-ui-primitive/toolbar";
import "@/components/tiptap-node/blockquote-node/blockquote-node.scss";
import "@/components/tiptap-node/code-block-node/code-block-node.scss";
import "@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node.scss";
import "@/components/tiptap-node/list-node/list-node.scss";
import "@/components/tiptap-node/image-node/image-node.scss";
import "@/components/tiptap-node/heading-node/heading-node.scss";
import "@/components/tiptap-node/paragraph-node/paragraph-node.scss";
import "@/styles/_keyframe-animations.scss";
import "@/styles/_variables.scss";
// --- Icons ---
import { ArrowLeftIcon } from "@/components/tiptap-icons/arrow-left-icon";
import { HighlighterIcon } from "@/components/tiptap-icons/highlighter-icon";
import { LinkIcon } from "@/components/tiptap-icons/link-icon";
// --- Components ---
import { ThemeToggle } from "@/components/tiptap-templates/simple/theme-toggle";
import { BlockquoteButton } from "@/components/tiptap-ui/blockquote-button";
import { CodeBlockButton } from "@/components/tiptap-ui/code-block-button";
import { ColorHighlightPopover, ColorHighlightPopoverButton, ColorHighlightPopoverContent, } from "@/components/tiptap-ui/color-highlight-popover";
// --- Tiptap UI ---
import { HeadingDropdownMenu } from "@/components/tiptap-ui/heading-dropdown-menu";
import { ImageUploadButton } from "@/components/tiptap-ui/image-upload-button";
import { LinkButton, LinkContent, LinkPopover, } from "@/components/tiptap-ui/link-popover";
import { ListDropdownMenu } from "@/components/tiptap-ui/list-dropdown-menu";
import { MarkButton } from "@/components/tiptap-ui/mark-button";
import { TextAlignButton } from "@/components/tiptap-ui/text-align-button";
import { UndoRedoButton } from "@/components/tiptap-ui/undo-redo-button";
import { useCursorVisibility } from "@/hooks/use-cursor-visibility";
// --- Hooks ---
import { useIsMobile } from "@/hooks/use-mobile";
import { useWindowSize } from "@/hooks/use-window-size";
// --- Lib ---
import { handleImageUpload, MAX_FILE_SIZE } from "@/lib/tiptap-utils";
// --- Styles ---
import "@/components/tiptap-templates/simple/simple-editor.scss";
import content from "@/components/tiptap-templates/simple/data/content.json";
const MainToolbarContent = ({ onHighlighterClick, onLinkClick, isMobile, }) => {
    return (_jsxs(_Fragment, { children: [_jsx(Spacer, {}), _jsxs(ToolbarGroup, { children: [_jsx(UndoRedoButton, { action: "undo" }), _jsx(UndoRedoButton, { action: "redo" })] }), _jsx(ToolbarSeparator, {}), _jsxs(ToolbarGroup, { children: [_jsx(HeadingDropdownMenu, { levels: [1, 2, 3, 4], portal: isMobile }), _jsx(ListDropdownMenu, { types: ["bulletList", "orderedList", "taskList"], portal: isMobile }), _jsx(BlockquoteButton, {}), _jsx(CodeBlockButton, {})] }), _jsx(ToolbarSeparator, {}), _jsxs(ToolbarGroup, { children: [_jsx(MarkButton, { type: "bold" }), _jsx(MarkButton, { type: "italic" }), _jsx(MarkButton, { type: "strike" }), _jsx(MarkButton, { type: "code" }), _jsx(MarkButton, { type: "underline" }), !isMobile ? (_jsx(ColorHighlightPopover, {})) : (_jsx(ColorHighlightPopoverButton, { onClick: onHighlighterClick })), !isMobile ? _jsx(LinkPopover, {}) : _jsx(LinkButton, { onClick: onLinkClick })] }), _jsx(ToolbarSeparator, {}), _jsxs(ToolbarGroup, { children: [_jsx(MarkButton, { type: "superscript" }), _jsx(MarkButton, { type: "subscript" })] }), _jsx(ToolbarSeparator, {}), _jsxs(ToolbarGroup, { children: [_jsx(TextAlignButton, { align: "left" }), _jsx(TextAlignButton, { align: "center" }), _jsx(TextAlignButton, { align: "right" }), _jsx(TextAlignButton, { align: "justify" })] }), _jsx(ToolbarSeparator, {}), _jsx(ToolbarGroup, { children: _jsx(ImageUploadButton, { text: "Add" }) }), _jsx(Spacer, {}), isMobile && _jsx(ToolbarSeparator, {}), _jsx(ToolbarGroup, { children: _jsx(ThemeToggle, {}) })] }));
};
const MobileToolbarContent = ({ type, onBack, }) => (_jsxs(_Fragment, { children: [_jsx(ToolbarGroup, { children: _jsxs(Button, { "data-style": "ghost", onClick: onBack, children: [_jsx(ArrowLeftIcon, { className: "tiptap-button-icon" }), type === "highlighter" ? (_jsx(HighlighterIcon, { className: "tiptap-button-icon" })) : (_jsx(LinkIcon, { className: "tiptap-button-icon" }))] }) }), _jsx(ToolbarSeparator, {}), type === "highlighter" ? (_jsx(ColorHighlightPopoverContent, {})) : (_jsx(LinkContent, {}))] }));
export function SimpleEditor() {
    const isMobile = useIsMobile();
    const windowSize = useWindowSize();
    const [mobileView, setMobileView] = React.useState("main");
    const toolbarRef = React.useRef(null);
    const editor = useEditor({
        immediatelyRender: false,
        shouldRerenderOnTransaction: false,
        editorProps: {
            attributes: {
                autocomplete: "off",
                autocorrect: "off",
                autocapitalize: "off",
                "aria-label": "Main content area, start typing to enter text.",
                class: "simple-editor",
            },
        },
        extensions: [
            StarterKit.configure({
                horizontalRule: false,
                link: {
                    openOnClick: false,
                    enableClickSelection: true,
                },
            }),
            HorizontalRule,
            TextAlign.configure({ types: ["heading", "paragraph"] }),
            TaskList,
            TaskItem.configure({ nested: true }),
            Highlight.configure({ multicolor: true }),
            Image,
            Typography,
            Superscript,
            Subscript,
            Selection,
            ImageUploadNode.configure({
                accept: "image/*",
                maxSize: MAX_FILE_SIZE,
                limit: 3,
                upload: handleImageUpload,
                onError: (error) => console.error("Upload failed:", error),
            }),
        ],
        content,
    });
    const bodyRect = useCursorVisibility({
        editor,
        overlayHeight: toolbarRef.current?.getBoundingClientRect().height ?? 0,
    });
    React.useEffect(() => {
        if (!isMobile && mobileView !== "main") {
            setMobileView("main");
        }
    }, [isMobile, mobileView]);
    return (_jsx("div", { className: "simple-editor-wrapper", children: _jsxs(EditorContext.Provider, { value: { editor }, children: [_jsx(Toolbar, { ref: toolbarRef, style: isMobile
                        ? {
                            bottom: `calc(100% - ${windowSize.height - bodyRect.y}px)`,
                        }
                        : {}, children: mobileView === "main" ? (_jsx(MainToolbarContent, { onHighlighterClick: () => setMobileView("highlighter"), onLinkClick: () => setMobileView("link"), isMobile: isMobile })) : (_jsx(MobileToolbarContent, { type: mobileView === "highlighter" ? "highlighter" : "link", onBack: () => setMobileView("main") })) }), _jsx(EditorContent, { editor: editor, role: "presentation", className: "simple-editor-content" })] }) }));
}
//# sourceMappingURL=simple-editor.js.map