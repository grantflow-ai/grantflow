import * as React from "react";
import { useHotkeys } from "react-hotkeys-hook";
// --- Icons ---
import { HighlighterIcon } from "@/components/tiptap-icons/highlighter-icon";
// --- Hooks ---
import { useTiptapEditor } from "@/hooks/use-tiptap-editor";
// --- Lib ---
import { isMarkInSchema, isNodeTypeSelected } from "@/lib/tiptap-utils";
export const COLOR_HIGHLIGHT_SHORTCUT_KEY = "mod+shift+h";
export const HIGHLIGHT_COLORS = [
    {
        label: "Default background",
        value: "var(--tt-bg-color)",
        border: "var(--tt-bg-color-contrast)",
    },
    {
        label: "Gray background",
        value: "var(--tt-color-highlight-gray)",
        border: "var(--tt-color-highlight-gray-contrast)",
    },
    {
        label: "Brown background",
        value: "var(--tt-color-highlight-brown)",
        border: "var(--tt-color-highlight-brown-contrast)",
    },
    {
        label: "Orange background",
        value: "var(--tt-color-highlight-orange)",
        border: "var(--tt-color-highlight-orange-contrast)",
    },
    {
        label: "Yellow background",
        value: "var(--tt-color-highlight-yellow)",
        border: "var(--tt-color-highlight-yellow-contrast)",
    },
    {
        label: "Green background",
        value: "var(--tt-color-highlight-green)",
        border: "var(--tt-color-highlight-green-contrast)",
    },
    {
        label: "Blue background",
        value: "var(--tt-color-highlight-blue)",
        border: "var(--tt-color-highlight-blue-contrast)",
    },
    {
        label: "Purple background",
        value: "var(--tt-color-highlight-purple)",
        border: "var(--tt-color-highlight-purple-contrast)",
    },
    {
        label: "Pink background",
        value: "var(--tt-color-highlight-pink)",
        border: "var(--tt-color-highlight-pink-contrast)",
    },
    {
        label: "Red background",
        value: "var(--tt-color-highlight-red)",
        border: "var(--tt-color-highlight-red-contrast)",
    },
];
export function pickHighlightColorsByValue(values) {
    const colorMap = new Map(HIGHLIGHT_COLORS.map((color) => [color.value, color]));
    return values
        .map((value) => colorMap.get(value))
        .filter((color) => !!color);
}
export function canColorHighlight(editor) {
    if (!editor?.isEditable)
        return false;
    if (!isMarkInSchema("highlight", editor) ||
        isNodeTypeSelected(editor, ["image"]))
        return false;
    return editor.can().setMark("highlight");
}
export function isColorHighlightActive(editor, highlightColor) {
    if (!editor?.isEditable)
        return false;
    return highlightColor
        ? editor.isActive("highlight", { color: highlightColor })
        : editor.isActive("highlight");
}
export function removeHighlight(editor) {
    if (!editor?.isEditable)
        return false;
    if (!canColorHighlight(editor))
        return false;
    return editor.chain().focus().unsetMark("highlight").run();
}
export function shouldShowButton(props) {
    const { editor, hideWhenUnavailable } = props;
    if (!editor?.isEditable)
        return false;
    if (!isMarkInSchema("highlight", editor))
        return false;
    if (hideWhenUnavailable && !editor.isActive("code")) {
        return canColorHighlight(editor);
    }
    return true;
}
export function useColorHighlight(config) {
    const { editor: providedEditor, label, highlightColor, hideWhenUnavailable = false, onApplied, } = config;
    const { editor } = useTiptapEditor(providedEditor);
    const [isVisible, setIsVisible] = React.useState(true);
    const canColorHighlightState = canColorHighlight(editor);
    const isActive = isColorHighlightActive(editor, highlightColor);
    React.useEffect(() => {
        if (!editor)
            return;
        const handleSelectionUpdate = () => {
            setIsVisible(shouldShowButton({ editor, hideWhenUnavailable }));
        };
        handleSelectionUpdate();
        editor.on("selectionUpdate", handleSelectionUpdate);
        return () => {
            editor.off("selectionUpdate", handleSelectionUpdate);
        };
    }, [editor, hideWhenUnavailable]);
    const handleColorHighlight = React.useCallback(() => {
        if (!(editor && canColorHighlightState && highlightColor && label))
            return false;
        const success = editor
            .chain()
            .focus()
            .toggleMark("highlight", { color: highlightColor })
            .run();
        if (success) {
            onApplied?.({ color: highlightColor, label });
        }
        return success;
    }, [canColorHighlightState, highlightColor, editor, label, onApplied]);
    const handleRemoveHighlight = React.useCallback(() => {
        const success = removeHighlight(editor);
        if (success) {
            onApplied?.({ color: "", label: "Remove highlight" });
        }
        return success;
    }, [editor, onApplied]);
    useHotkeys(COLOR_HIGHLIGHT_SHORTCUT_KEY, (event) => {
        event.preventDefault();
        handleColorHighlight();
    }, {
        enabled: isVisible && canColorHighlightState,
        enableOnContentEditable: true,
        enableOnFormTags: true,
    });
    return {
        isVisible,
        isActive,
        handleColorHighlight,
        handleRemoveHighlight,
        canColorHighlight: canColorHighlightState,
        label: label || "Highlight",
        shortcutKeys: COLOR_HIGHLIGHT_SHORTCUT_KEY,
        Icon: HighlighterIcon,
    };
}
//# sourceMappingURL=use-color-highlight.js.map