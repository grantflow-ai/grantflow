import { mergeAttributes, Node, ReactNodeViewRenderer } from "@tiptap/react";
import { ImageUploadNode as ImageUploadNodeComponent } from "@/components/node/image-upload-node/image-upload-node";

export type UploadFunction = (
	file: File,
	onProgress?: (event: { progress: number }) => void,
	abortSignal?: AbortSignal,
) => Promise<string>;

export interface ImageUploadNodeOptions {
	accept?: string | undefined;
	limit?: number | undefined;
	maxSize?: number | undefined;
	upload?: UploadFunction | undefined;
	onError?: ((error: Error) => void) | undefined;
	onSuccess?: ((url: string) => void) | undefined;
}

declare module "@tiptap/react" {
	interface Commands<ReturnType> {
		imageUpload: {
			setImageUploadNode: (options?: ImageUploadNodeOptions) => ReturnType;
		};
	}
}

/**
 * A Tiptap node extension that creates an image upload component.
 * @see registry/tiptap-node/image-upload-node/image-upload-node
 */
export const ImageUploadNode = Node.create<ImageUploadNodeOptions>({
	addAttributes() {
		return {
			accept: {
				default: this.options.accept,
			},
			limit: {
				default: this.options.limit,
			},
			maxSize: {
				default: this.options.maxSize,
			},
		};
	},

	addCommands() {
		return {
			setImageUploadNode:
				(options = {}) =>
				({ commands }) => {
					return commands.insertContent({
						attrs: options,
						type: this.name,
					});
				},
		};
	},

	addKeyboardShortcuts() {
		return {
			Enter: ({ editor }) => {
				const { selection } = editor.state;
				const { nodeAfter } = selection.$from;

				if (nodeAfter && nodeAfter.type.name === "imageUpload" && editor.isActive("imageUpload")) {
					const nodeEl = editor.view.nodeDOM(selection.$from.pos);
					if (nodeEl && nodeEl instanceof HTMLElement) {
						const firstChild = nodeEl.firstChild;
						if (firstChild && firstChild instanceof HTMLElement) {
							firstChild.click();
							return true;
						}
					}
				}
				return false;
			},
		};
	},

	addNodeView() {
		return ReactNodeViewRenderer(ImageUploadNodeComponent);
	},

	addOptions() {
		return {
			accept: "image/*",
			limit: 1,
			maxSize: 0,
			onError: undefined,
			onSuccess: undefined,
			upload: undefined,
		};
	},

	atom: true,

	draggable: true,

	group: "block",
	name: "imageUpload",

	parseHTML() {
		return [{ tag: 'div[data-type="image-upload"]' }];
	},

	renderHTML({ HTMLAttributes }) {
		return ["div", mergeAttributes({ "data-type": "image-upload" }, HTMLAttributes)];
	},
});

export default ImageUploadNode;
