"use client";
import * as React from "react";
// --- Icons ---
import { HeadingIcon } from "@/components/tiptap-icons/heading-icon";
// --- Tiptap UI ---
import { canToggle, headingIcons, isHeadingActive, shouldShowButton, } from "@/components/tiptap-ui/heading-button";
// --- Hooks ---
import { useTiptapEditor } from "@/hooks/use-tiptap-editor";
/**
 * Gets the currently active heading level from the available levels
 */
export function getActiveHeadingLevel(editor, levels = [1, 2, 3, 4, 5, 6]) {
    if (!editor?.isEditable)
        return undefined;
    return levels.find((level) => isHeadingActive(editor, level));
}
/**
 * Custom hook that provides heading dropdown menu functionality for Tiptap editor
 *
 * @example
 * ```tsx
 * // Simple usage
 * function MyHeadingDropdown() {
 *   const {
 *     isVisible,
 *     activeLevel,
 *     isAnyHeadingActive,
 *     canToggle,
 *     levels,
 *   } = useHeadingDropdownMenu()
 *
 *   if (!isVisible) return null
 *
 *   return (
 *     <DropdownMenu>
 *       // dropdown content
 *     </DropdownMenu>
 *   )
 * }
 *
 * // Advanced usage with configuration
 * function MyAdvancedHeadingDropdown() {
 *   const {
 *     isVisible,
 *     activeLevel,
 *   } = useHeadingDropdownMenu({
 *     editor: myEditor,
 *     levels: [1, 2, 3],
 *     hideWhenUnavailable: true,
 *   })
 *
 *   // component implementation
 * }
 * ```
 */
export function useHeadingDropdownMenu(config) {
    const { editor: providedEditor, levels = [1, 2, 3, 4, 5, 6], hideWhenUnavailable = false, } = config || {};
    const { editor } = useTiptapEditor(providedEditor);
    const [isVisible, setIsVisible] = React.useState(true);
    const activeLevel = getActiveHeadingLevel(editor, levels);
    const isActive = isHeadingActive(editor);
    const canToggleState = canToggle(editor);
    React.useEffect(() => {
        if (!editor)
            return;
        const handleSelectionUpdate = () => {
            setIsVisible(shouldShowButton({ editor, hideWhenUnavailable, level: levels }));
        };
        handleSelectionUpdate();
        editor.on("selectionUpdate", handleSelectionUpdate);
        return () => {
            editor.off("selectionUpdate", handleSelectionUpdate);
        };
    }, [editor, hideWhenUnavailable, levels]);
    return {
        isVisible,
        activeLevel,
        isActive,
        canToggle: canToggleState,
        levels,
        label: "Heading",
        Icon: activeLevel ? headingIcons[activeLevel] : HeadingIcon,
    };
}
//# sourceMappingURL=use-heading-dropdown-menu.js.map