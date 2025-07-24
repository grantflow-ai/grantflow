import type { Editor } from "@tiptap/react";
import * as React from "react";
/**
 * Configuration for the link popover functionality
 */
export interface UseLinkPopoverConfig {
    /**
     * The Tiptap editor instance.
     */
    editor?: Editor | null;
    /**
     * Whether to hide the link popover when not available.
     * @default false
     */
    hideWhenUnavailable?: boolean;
    /**
     * Callback function called when the link is set.
     */
    onSetLink?: () => void;
}
/**
 * Configuration for the link handler functionality
 */
export interface LinkHandlerProps {
    /**
     * The Tiptap editor instance.
     */
    editor: Editor | null;
    /**
     * Callback function called when the link is set.
     */
    onSetLink?: () => void;
}
/**
 * Checks if a link can be set in the current editor state
 */
export declare function canSetLink(editor: Editor | null): boolean;
/**
 * Checks if a link is currently active in the editor
 */
export declare function isLinkActive(editor: Editor | null): boolean;
/**
 * Determines if the link button should be shown
 */
export declare function shouldShowLinkButton(props: {
    editor: Editor | null;
    hideWhenUnavailable: boolean;
}): boolean;
/**
 * Custom hook for handling link operations in a Tiptap editor
 */
export declare function useLinkHandler(props: LinkHandlerProps): {
    url: string;
    setUrl: React.Dispatch<React.SetStateAction<string | null>>;
    setLink: () => void;
    removeLink: () => void;
    openLink: (target?: string, features?: string) => void;
};
/**
 * Custom hook for link popover state management
 */
export declare function useLinkState(props: {
    editor: Editor | null;
    hideWhenUnavailable: boolean;
}): {
    isVisible: boolean;
    canSet: boolean;
    isActive: boolean;
};
/**
 * Main hook that provides link popover functionality for Tiptap editor
 *
 * @example
 * ```tsx
 * // Simple usage
 * function MyLinkButton() {
 *   const { isVisible, canSet, isActive, Icon, label } = useLinkPopover()
 *
 *   if (!isVisible) return null
 *
 *   return <button disabled={!canSet}>Link</button>
 * }
 *
 * // Advanced usage with configuration
 * function MyAdvancedLinkButton() {
 *   const { isVisible, canSet, isActive, Icon, label } = useLinkPopover({
 *     editor: myEditor,
 *     hideWhenUnavailable: true,
 *     onSetLink: () => console.log('Link set!')
 *   })
 *
 *   if (!isVisible) return null
 *
 *   return (
 *     <MyButton
 *       disabled={!canSet}
 *       aria-label={label}
 *       aria-pressed={isActive}
 *     >
 *       <Icon />
 *       {label}
 *     </MyButton>
 *   )
 * }
 * ```
 */
export declare function useLinkPopover(config?: UseLinkPopoverConfig): {
    url: string;
    setUrl: React.Dispatch<React.SetStateAction<string | null>>;
    setLink: () => void;
    removeLink: () => void;
    openLink: (target?: string, features?: string) => void;
    isVisible: boolean;
    canSet: boolean;
    isActive: boolean;
    label: string;
    Icon: React.MemoExoticComponent<({ className, ...props }: React.SVGProps<SVGSVGElement>) => import("react/jsx-runtime").JSX.Element>;
};
//# sourceMappingURL=use-link-popover.d.ts.map