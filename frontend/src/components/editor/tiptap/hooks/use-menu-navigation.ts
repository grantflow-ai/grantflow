import type { Editor } from "@tiptap/react";
import * as React from "react";

interface MenuNavigationOptions<T> {
	autoSelectFirstItem?: boolean;
	containerRef?: React.RefObject<HTMLElement | null>;
	editor?: Editor | null;
	items: T[];
	onClose?: () => void;
	onSelect?: (item: T) => void;
	orientation?: Orientation;
	query?: string;
}

type Orientation = "both" | "horizontal" | "vertical";

export function useMenuNavigation<T>({
	autoSelectFirstItem = true,
	containerRef,
	editor,
	items,
	onClose,
	onSelect,
	orientation = "vertical",
	query,
}: MenuNavigationOptions<T>) {
	const [selectedIndex, setSelectedIndex] = React.useState<number>(autoSelectFirstItem ? 0 : -1);

	React.useEffect(() => {
		const moveNext = () => {
			setSelectedIndex((currentIndex) => {
				if (currentIndex === -1) return 0;
				return (currentIndex + 1) % items.length;
			});
		};

		const movePrev = () => {
			setSelectedIndex((currentIndex) => {
				if (currentIndex === -1) return items.length - 1;
				return (currentIndex - 1 + items.length) % items.length;
			});
		};

		const handleArrowDown = (event: KeyboardEvent) => {
			if (orientation === "horizontal") return false;
			event.preventDefault();
			moveNext();
			return true;
		};

		const handleArrowLeft = (event: KeyboardEvent) => {
			if (orientation === "vertical") return false;
			event.preventDefault();
			movePrev();
			return true;
		};

		const handleArrowRight = (event: KeyboardEvent) => {
			if (orientation === "vertical") return false;
			event.preventDefault();
			moveNext();
			return true;
		};

		const handleArrowUp = (event: KeyboardEvent) => {
			if (orientation === "horizontal") return false;
			event.preventDefault();
			movePrev();
			return true;
		};

		const handleEnd = (event: KeyboardEvent) => {
			event.preventDefault();
			setSelectedIndex(items.length - 1);
			return true;
		};

		const handleEnter = (event: KeyboardEvent) => {
			if (event.isComposing) return false;
			event.preventDefault();
			if (selectedIndex !== -1 && items[selectedIndex]) {
				onSelect?.(items[selectedIndex]);
			}
			return true;
		};

		const handleEscape = (event: KeyboardEvent) => {
			event.preventDefault();
			onClose?.();
			return true;
		};

		const handleHome = (event: KeyboardEvent) => {
			event.preventDefault();
			setSelectedIndex(0);
			return true;
		};

		const handleTab = (event: KeyboardEvent) => {
			event.preventDefault();
			if (event.shiftKey) {
				movePrev();
			} else {
				moveNext();
			}
			return true;
		};

		const keyHandlers: Record<string, (event: KeyboardEvent) => boolean> = {
			ArrowDown: handleArrowDown,
			ArrowLeft: handleArrowLeft,
			ArrowRight: handleArrowRight,
			ArrowUp: handleArrowUp,
			End: handleEnd,
			Enter: handleEnter,
			Escape: handleEscape,
			Home: handleHome,
			Tab: handleTab,
		};

		const handleKeyboardNavigation = (event: KeyboardEvent) => {
			if (!items.length) return false;
			const handler = keyHandlers[event.key];
			return handler ? handler(event) : false;
		};

		let targetElement: HTMLElement | null = null;

		if (editor) {
			targetElement = editor.view.dom;
		} else if (containerRef?.current) {
			targetElement = containerRef.current;
		}

		if (targetElement) {
			targetElement.addEventListener("keydown", handleKeyboardNavigation, true);

			return () => {
				targetElement?.removeEventListener("keydown", handleKeyboardNavigation, true);
			};
		}

		return undefined;
	}, [editor, containerRef, items, selectedIndex, onSelect, onClose, orientation]);

	React.useEffect(() => {
		if (query) {
			setSelectedIndex(autoSelectFirstItem ? 0 : -1);
		}
	}, [query, autoSelectFirstItem]);

	return {
		selectedIndex: items.length ? selectedIndex : undefined,
		setSelectedIndex,
	};
}
