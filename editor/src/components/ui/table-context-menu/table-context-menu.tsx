import * as React from "react";
import { ButtonGroup } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTiptapEditor } from "@/hooks/use-tiptap-editor";
import "./table-context-menu.scss";

export interface TableContextMenuProps {
	children: React.ReactNode;
}

export const TableContextMenu = React.forwardRef<HTMLDivElement, TableContextMenuProps>(({ children }, ref) => {
	const { editor } = useTiptapEditor();
	const [isOpen, setIsOpen] = React.useState(false);
	const [position, setPosition] = React.useState({ x: 0, y: 0 });

	const handleContextMenu = React.useCallback(
		(event: React.MouseEvent) => {
			const target = event.target as HTMLElement;
			const tableElement = target.closest("table");

			if (!(tableElement && editor)) {
				return;
			}

			event.preventDefault();
			setPosition({ x: event.clientX, y: event.clientY });
			setIsOpen(true);
		},
		[editor],
	);

	const handleAddRowAbove = React.useCallback(() => {
		if (editor) {
			editor.chain().focus().addRowBefore().run();
		}
		setIsOpen(false);
	}, [editor]);

	const handleAddRowBelow = React.useCallback(() => {
		if (editor) {
			editor.chain().focus().addRowAfter().run();
		}
		setIsOpen(false);
	}, [editor]);

	const handleAddColumnLeft = React.useCallback(() => {
		if (editor) {
			editor.chain().focus().addColumnBefore().run();
		}
		setIsOpen(false);
	}, [editor]);

	const handleAddColumnRight = React.useCallback(() => {
		if (editor) {
			editor.chain().focus().addColumnAfter().run();
		}
		setIsOpen(false);
	}, [editor]);

	const handleDeleteRow = React.useCallback(() => {
		if (editor) {
			editor.chain().focus().deleteRow().run();
		}
		setIsOpen(false);
	}, [editor]);

	const handleDeleteColumn = React.useCallback(() => {
		if (editor) {
			editor.chain().focus().deleteColumn().run();
		}
		setIsOpen(false);
	}, [editor]);

	const handleDeleteTable = React.useCallback(() => {
		if (editor) {
			editor.chain().focus().deleteTable().run();
		}
		setIsOpen(false);
	}, [editor]);

	const handleToggleHeaderRow = React.useCallback(() => {
		if (editor) {
			editor.chain().focus().toggleHeaderRow().run();
		}
		setIsOpen(false);
	}, [editor]);

	const handleToggleHeaderColumn = React.useCallback(() => {
		if (editor) {
			editor.chain().focus().toggleHeaderColumn().run();
		}
		setIsOpen(false);
	}, [editor]);

	return (
		<div className="simple-editor-content" ref={ref} onContextMenu={handleContextMenu}>
			{children}
			<DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
				<DropdownMenuTrigger asChild>
					<span
						style={{
							height: 1,
							left: position.x,
							opacity: 0,
							pointerEvents: "none",
							position: "fixed",
							top: position.y,
							width: 1,
						}}
					/>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="start" className="table-context-menu">
					<Card>
						<CardBody>
							<ButtonGroup>
								<DropdownMenuItem onClick={handleAddRowAbove} className="dropdown-menu-item">
									Add row above
								</DropdownMenuItem>
								<DropdownMenuItem onClick={handleAddRowBelow} className="dropdown-menu-item">
									Add row below
								</DropdownMenuItem>

								<div className="menu-separator" />

								<DropdownMenuItem onClick={handleAddColumnLeft} className="dropdown-menu-item">
									Add column left
								</DropdownMenuItem>
								<DropdownMenuItem onClick={handleAddColumnRight} className="dropdown-menu-item">
									Add column right
								</DropdownMenuItem>

								<div className="menu-separator" />

								<DropdownMenuItem onClick={handleDeleteRow} className="dropdown-menu-item">
									Delete row
								</DropdownMenuItem>
								<DropdownMenuItem onClick={handleDeleteColumn} className="dropdown-menu-item">
									Delete column
								</DropdownMenuItem>

								<div className="menu-separator" />

								<DropdownMenuItem onClick={handleToggleHeaderRow} className="dropdown-menu-item">
									Toggle header row
								</DropdownMenuItem>
								<DropdownMenuItem onClick={handleToggleHeaderColumn} className="dropdown-menu-item">
									Toggle header column
								</DropdownMenuItem>

								<div className="menu-separator" />

								<DropdownMenuItem onClick={handleDeleteTable} className="dropdown-menu-item danger">
									Delete table
								</DropdownMenuItem>
							</ButtonGroup>
						</CardBody>
					</Card>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
});

TableContextMenu.displayName = "TableContextMenu";
