import type { Node as TiptapNode } from "@tiptap/pm/model";
import type { Editor } from "@tiptap/react";
export declare const MAX_FILE_SIZE: number;
export declare const MAC_SYMBOLS: Record<string, string>;
/**
 * Determines if the current platform is macOS
 * @returns boolean indicating if the current platform is Mac
 */
export declare function isMac(): boolean;
/**
 * Formats a shortcut key based on the platform (Mac or non-Mac)
 * @param key - The key to format (e.g., "ctrl", "alt", "shift")
 * @param isMac - Boolean indicating if the platform is Mac
 * @param capitalize - Whether to capitalize the key (default: true)
 * @returns Formatted shortcut key symbol
 */
export declare const formatShortcutKey: (key: string, isMac: boolean, capitalize?: boolean) => string;
/**
 * Parses a shortcut key string into an array of formatted key symbols
 * @param shortcutKeys - The string of shortcut keys (e.g., "ctrl-alt-shift")
 * @param delimiter - The delimiter used to split the keys (default: "-")
 * @param capitalize - Whether to capitalize the keys (default: true)
 * @returns Array of formatted shortcut key symbols
 */
export declare const parseShortcutKeys: (props: {
    shortcutKeys: string | undefined;
    delimiter?: string;
    capitalize?: boolean;
}) => string[];
/**
 * Checks if a mark exists in the editor schema
 * @param markName - The name of the mark to check
 * @param editor - The editor instance
 * @returns boolean indicating if the mark exists in the schema
 */
export declare const isMarkInSchema: (markName: string, editor: Editor | null) => boolean;
/**
 * Checks if a node exists in the editor schema
 * @param nodeName - The name of the node to check
 * @param editor - The editor instance
 * @returns boolean indicating if the node exists in the schema
 */
export declare const isNodeInSchema: (nodeName: string, editor: Editor | null) => boolean;
/**
 * Checks if a value is a valid number (not null, undefined, or NaN)
 * @param value - The value to check
 * @returns boolean indicating if the value is a valid number
 */
export declare function isValidPosition(pos: number | null | undefined): pos is number;
/**
 * Utility function to conditionally join class names into a single string.
 * Filters out falsey values like false, undefined, null, and empty strings.
 *
 * @param classes - List of class name strings or falsey values.
 * @returns A single space-separated string of valid class names.
 */
export declare function cn(...classes: (string | boolean | undefined | null)[]): string;
/**
 * Checks if one or more extensions are registered in the Tiptap editor.
 * @param editor - The Tiptap editor instance
 * @param extensionNames - A single extension name or an array of names to check
 * @returns True if at least one of the extensions is available, false otherwise
 */
export declare function isExtensionAvailable(editor: Editor | null, extensionNames: string | string[]): boolean;
/**
 * Finds a node at the specified position with error handling
 * @param editor The Tiptap editor instance
 * @param position The position in the document to find the node
 * @returns The node at the specified position, or null if not found
 */
export declare function findNodeAtPosition(editor: Editor, position: number): TiptapNode | null;
/**
 * Finds the position and instance of a node in the document
 * @param props Object containing editor, node (optional), and nodePos (optional)
 * @param props.editor The Tiptap editor instance
 * @param props.node The node to find (optional if nodePos is provided)
 * @param props.nodePos The position of the node to find (optional if node is provided)
 * @returns An object with the position and node, or null if not found
 */
export declare function findNodePosition(props: {
    editor: Editor | null;
    node?: TiptapNode | null;
    nodePos?: number | null;
}): {
    pos: number;
    node: TiptapNode;
} | null;
/**
 * Checks if the current selection in the editor is a node selection of specified types
 * @param editor The Tiptap editor instance
 * @param types An array of node type names to check against
 * @returns boolean indicating if the selected node matches any of the specified types
 */
export declare function isNodeTypeSelected(editor: Editor, types?: string[]): boolean;
/**
 * Handles image upload with progress tracking and abort capability
 * @param file The file to upload
 * @param onProgress Optional callback for tracking upload progress
 * @param abortSignal Optional AbortSignal for cancelling the upload
 * @returns Promise resolving to the URL of the uploaded image
 */
export declare const handleImageUpload: (file: File, onProgress?: (event: {
    progress: number;
}) => void, abortSignal?: AbortSignal) => Promise<string>;
/**
 * Converts a File to base64 string
 * @param file The file to convert
 * @param abortSignal Optional AbortSignal for cancelling the conversion
 * @returns Promise resolving to the base64 representation of the file
 */
export declare const convertFileToBase64: (file: File, abortSignal?: AbortSignal) => Promise<string>;
type ProtocolOptions = {
    /**
     * The protocol scheme to be registered.
     * @default '''
     * @example 'ftp'
     * @example 'git'
     */
    scheme: string;
    /**
     * If enabled, it allows optional slashes after the protocol.
     * @default false
     * @example true
     */
    optionalSlashes?: boolean;
};
type ProtocolConfig = Array<ProtocolOptions | string>;
export declare function isAllowedUri(uri: string | undefined, protocols?: ProtocolConfig): true | RegExpMatchArray | null;
export declare function sanitizeUrl(inputUrl: string, baseUrl: string, protocols?: ProtocolConfig): string;
export {};
//# sourceMappingURL=tiptap-utils.d.ts.map