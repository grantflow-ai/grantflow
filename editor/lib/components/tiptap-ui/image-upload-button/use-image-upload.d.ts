import type { Editor } from "@tiptap/react";
import * as React from "react";
export declare const IMAGE_UPLOAD_SHORTCUT_KEY = "mod+shift+i";
/**
 * Configuration for the image upload functionality
 */
export interface UseImageUploadConfig {
    /**
     * The Tiptap editor instance.
     */
    editor?: Editor | null;
    /**
     * Whether the button should hide when insertion is not available.
     * @default false
     */
    hideWhenUnavailable?: boolean;
    /**
     * Callback function called after a successful image insertion.
     */
    onInserted?: () => void;
}
/**
 * Checks if image can be inserted in the current editor state
 */
export declare function canInsertImage(editor: Editor | null): boolean;
/**
 * Checks if image is currently active
 */
export declare function isImageActive(editor: Editor | null): boolean;
/**
 * Inserts an image in the editor
 */
export declare function insertImage(editor: Editor | null): boolean;
/**
 * Determines if the image button should be shown
 */
export declare function shouldShowButton(props: {
    editor: Editor | null;
    hideWhenUnavailable: boolean;
}): boolean;
/**
 * Custom hook that provides image functionality for Tiptap editor
 *
 * @example
 * ```tsx
 * // Simple usage - no params needed
 * function MySimpleImageButton() {
 *   const { isVisible, handleImage } = useImage()
 *
 *   if (!isVisible) return null
 *
 *   return <button onClick={handleImage}>Add Image</button>
 * }
 *
 * // Advanced usage with configuration
 * function MyAdvancedImageButton() {
 *   const { isVisible, handleImage, label, isActive } = useImage({
 *     editor: myEditor,
 *     hideWhenUnavailable: true,
 *     onInserted: () => console.log('Image inserted!')
 *   })
 *
 *   if (!isVisible) return null
 *
 *   return (
 *     <MyButton
 *       onClick={handleImage}
 *       aria-pressed={isActive}
 *       aria-label={label}
 *     >
 *       Add Image
 *     </MyButton>
 *   )
 * }
 * ```
 */
export declare function useImageUpload(config?: UseImageUploadConfig): {
    isVisible: boolean;
    isActive: boolean;
    handleImage: () => boolean;
    canInsert: boolean;
    label: string;
    shortcutKeys: string;
    Icon: React.MemoExoticComponent<({ className, ...props }: React.SVGProps<SVGSVGElement>) => import("react/jsx-runtime").JSX.Element>;
};
//# sourceMappingURL=use-image-upload.d.ts.map