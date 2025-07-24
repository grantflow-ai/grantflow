import * as React from "react";
import type { UseImageUploadConfig } from "@/components/tiptap-ui/image-upload-button";
import type { ButtonProps } from "@/components/tiptap-ui-primitive/button";
export interface ImageUploadButtonProps extends Omit<ButtonProps, "type">, UseImageUploadConfig {
    /**
     * Optional text to display alongside the icon.
     */
    text?: string;
    /**
     * Optional show shortcut keys in the button.
     * @default false
     */
    showShortcut?: boolean;
}
export declare function ImageShortcutBadge({ shortcutKeys, }: {
    shortcutKeys?: string;
}): import("react/jsx-runtime").JSX.Element;
/**
 * Button component for uploading/inserting images in a Tiptap editor.
 *
 * For custom button implementations, use the `useImage` hook instead.
 */
export declare const ImageUploadButton: React.ForwardRefExoticComponent<ImageUploadButtonProps & React.RefAttributes<HTMLButtonElement>>;
//# sourceMappingURL=image-upload-button.d.ts.map