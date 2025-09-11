import * as React from "react";
import type { ButtonProps } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import { useTiptapEditor } from "@/hooks/use-tiptap-editor";
import "@/components/ui/table-button/table-styles.scss";

export interface TableButtonProps extends Omit<ButtonProps, "type"> {
	text?: string;
}

function TableIcon({ className }: { className?: string }) {
	return (
		<svg
			width="17"
			height="16"
			viewBox="0 0 17 16"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={className}
		>
			<title>Insert table</title>
			<mask id="mask0_5188_4581" maskUnits="userSpaceOnUse" x="0" y="0" width="17" height="16">
				<rect x="0.5" width="16" height="16" fill="#D9D9D9" />
			</mask>
			<g mask="url(#mask0_5188_4581)">
				<path
					d="M3.16536 13.3334C2.7987 13.3334 2.48481 13.2029 2.2237 12.9417C1.96259 12.6806 1.83203 12.3667 1.83203 12.0001V4.00008C1.83203 3.63341 1.96259 3.31953 2.2237 3.05841C2.48481 2.7973 2.7987 2.66675 3.16536 2.66675H13.832C14.1987 2.66675 14.5126 2.7973 14.7737 3.05841C15.0348 3.31953 15.1654 3.63341 15.1654 4.00008V12.0001C15.1654 12.3667 15.0348 12.6806 14.7737 12.9417C14.5126 13.2029 14.1987 13.3334 13.832 13.3334H3.16536ZM3.16536 7.33342H5.83203V4.00008H3.16536V7.33342ZM7.16536 7.33342H9.83203V4.00008H7.16536V7.33342ZM11.1654 7.33342H13.832V4.00008H11.1654V7.33342ZM5.83203 12.0001V8.66675H3.16536V12.0001H5.83203ZM7.16536 12.0001H9.83203V8.66675H7.16536V12.0001ZM11.1654 12.0001H13.832V8.66675H11.1654V12.0001Z"
					fill="#4A4855"
				/>
			</g>
		</svg>
	);
}

export const TableButton = React.forwardRef<HTMLButtonElement, TableButtonProps>(
	({ text, onClick, children, ...buttonProps }, ref) => {
		const { editor } = useTiptapEditor();

		const handleClick = React.useCallback(
			(event: React.MouseEvent<HTMLButtonElement>) => {
				onClick?.(event);
				if (event.defaultPrevented) return;

				if (editor) {
					if (editor.isActive("table")) {
						return;
					}

					editor.chain().focus().insertTable({ cols: 3, rows: 3, withHeaderRow: true }).run();
				}
			},
			[editor, onClick],
		);

		return (
			<Button
				type="button"
				data-style="ghost"
				tabIndex={-1}
				aria-label="Insert table"
				tooltip="Insert table"
				onClick={handleClick}
				{...buttonProps}
				ref={ref}
			>
				{children ?? (
					<>
						<TableIcon className="tiptap-button-icon" />
						{text && <span className="tiptap-button-text">{text}</span>}
					</>
				)}
			</Button>
		);
	},
);

TableButton.displayName = "TableButton";
