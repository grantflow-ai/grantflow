/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars, sonarjs/no-identical-functions */
import React from "react";

const SelectContext = React.createContext<{
	displayValue: string;
	onValueChange: (value: string) => void;
	value: string;
}>({
	displayValue: "",
	onValueChange: () => {},
	value: "",
});

// Mock Radix UI Select components to render inline instead of in portals
export const Select = ({ children, onValueChange, value, ...props }: any) => {
	const [isOpen, setIsOpen] = React.useState(false);
	const [displayValue, setDisplayValue] = React.useState("");

	const childrenArray = React.Children.toArray(children);
	const trigger = childrenArray.find((child: any) => child?.type?.displayName === "SelectTrigger");
	const content = childrenArray.find((child: any) => child?.type?.displayName === "SelectContent");

	React.useEffect(() => {
		// Map values to display text on mount/value change
		const displayMap: Record<string, string> = {
			admin: "Admin (can access all research projects)",
			collaborator: "Collaborator - Can edit specific Research Projects.",
		};
		setDisplayValue(value ? displayMap[value] || value : "");
	}, [value]);

	const contextValue = {
		displayValue,
		onValueChange: (newValue: string) => {
			onValueChange(newValue);
			setIsOpen(false);
		},
		value,
	};

	return (
		<SelectContext.Provider value={contextValue}>
			<div data-testid="mocked-select" {...props}>
				{trigger &&
					React.cloneElement(trigger as any, {
						"aria-expanded": isOpen,
						onClick: () => {
							setIsOpen(!isOpen);
						},
					})}
				{isOpen && content}
			</div>
		</SelectContext.Provider>
	);
};
Select.displayName = "Select";

export const SelectTrigger = ({ children, ...props }: any) => {
	return (
		<button type="button" {...props}>
			{children}
		</button>
	);
};
SelectTrigger.displayName = "SelectTrigger";

export const SelectValue = ({ placeholder, ...props }: any) => {
	const context = React.useContext(SelectContext);
	return <span {...props}>{context.displayValue || placeholder}</span>;
};
SelectValue.displayName = "SelectValue";

export const SelectContent = ({ children, ...props }: any) => {
	return <div {...props}>{children}</div>;
};
SelectContent.displayName = "SelectContent";

export const SelectItem = ({ children, value, ...props }: any) => {
	const context = React.useContext(SelectContext);

	return (
		<option
			{...props}
			onClick={() => {
				context.onValueChange(value);
			}}
			onKeyDown={(e: React.KeyboardEvent) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					context.onValueChange(value);
				}
			}}
			style={{ cursor: "pointer" }}
			tabIndex={0}
			value={value}
		>
			{children}
		</option>
	);
};
SelectItem.displayName = "SelectItem";

// Mock Radix UI DropdownMenu components to render inline instead of in portals
export const DropdownMenu = ({ children, onOpenChange, open, ...props }: any) => {
	const childrenArray = React.Children.toArray(children);
	const trigger = childrenArray.find((child: any) => child?.type?.displayName === "DropdownMenuTrigger");
	const content = childrenArray.find((child: any) => child?.type?.displayName === "DropdownMenuContent");

	return (
		<div data-testid="mocked-dropdown-menu" {...props}>
			{trigger &&
				React.cloneElement(trigger as any, {
					onClick: (e: any) => {
						e.preventDefault();
						onOpenChange?.(!open);
					},
				})}
			{open && content}
		</div>
	);
};
DropdownMenu.displayName = "DropdownMenu";

export const DropdownMenuTrigger = React.forwardRef(({ children, ...props }: any, ref: any) => {
	return (
		<button ref={ref} type="button" {...props}>
			{children}
		</button>
	);
});
DropdownMenuTrigger.displayName = "DropdownMenuTrigger";

export const DropdownMenuContent = ({ children, ...props }: any) => {
	return (
		<div role="menu" {...props}>
			{children}
		</div>
	);
};
DropdownMenuContent.displayName = "DropdownMenuContent";

export const DropdownMenuItem = ({ children, disabled, onClick, ...props }: any) => {
	return (
		<div
			aria-disabled={disabled}
			onClick={disabled ? undefined : onClick}
			onKeyDown={(e: React.KeyboardEvent) => {
				if (!disabled && (e.key === "Enter" || e.key === " ")) {
					e.preventDefault();
					onClick?.(e);
				}
			}}
			role="menuitem"
			style={{ cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1 }}
			tabIndex={disabled ? -1 : 0}
			{...props}
		>
			{children}
		</div>
	);
};
DropdownMenuItem.displayName = "DropdownMenuItem";

export const DropdownMenuSeparator = (props: any) => {
	return <hr {...props} />;
};
DropdownMenuSeparator.displayName = "DropdownMenuSeparator";

export const DropdownMenuLabel = ({ children, ...props }: any) => {
	return (
		<div role="none" {...props}>
			{children}
		</div>
	);
};
DropdownMenuLabel.displayName = "DropdownMenuLabel";

export const DropdownMenuCheckboxItem = ({ checked, children, onCheckedChange, ...props }: any) => {
	return (
		<div
			aria-checked={checked}
			onClick={() => onCheckedChange?.(!checked)}
			onKeyDown={(e: React.KeyboardEvent) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					onCheckedChange?.(!checked);
				}
			}}
			role="menuitemcheckbox"
			tabIndex={0}
			{...props}
		>
			{children}
		</div>
	);
};
DropdownMenuCheckboxItem.displayName = "DropdownMenuCheckboxItem";

export const DropdownMenuRadioGroup = ({ children, onValueChange, value, ...props }: any) => {
	return (
		<fieldset {...props}>
			{React.Children.map(children, (child) =>
				React.cloneElement(child, {
					checked: child.props.value === value,
					onSelect: () => onValueChange?.(child.props.value),
				}),
			)}
		</fieldset>
	);
};
DropdownMenuRadioGroup.displayName = "DropdownMenuRadioGroup";

export const DropdownMenuRadioItem = ({ checked, children, onSelect, value, ...props }: any) => {
	return (
		<div
			aria-checked={checked}
			onClick={onSelect}
			onKeyDown={(e: React.KeyboardEvent) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					onSelect?.(e);
				}
			}}
			role="menuitemradio"
			tabIndex={0}
			{...props}
		>
			{children}
		</div>
	);
};
DropdownMenuRadioItem.displayName = "DropdownMenuRadioItem";

export const DropdownMenuShortcut = ({ children, ...props }: any) => {
	return <span {...props}>{children}</span>;
};
DropdownMenuShortcut.displayName = "DropdownMenuShortcut";

export const DropdownMenuGroup = ({ children, ...props }: any) => {
	return <fieldset {...props}>{children}</fieldset>;
};
DropdownMenuGroup.displayName = "DropdownMenuGroup";

export const DropdownMenuSub = ({ children, ...props }: any) => {
	return <div {...props}>{children}</div>;
};
DropdownMenuSub.displayName = "DropdownMenuSub";

export const DropdownMenuSubContent = ({ children, ...props }: any) => {
	return <div {...props}>{children}</div>;
};
DropdownMenuSubContent.displayName = "DropdownMenuSubContent";

export const DropdownMenuSubTrigger = ({ children, ...props }: any) => {
	return (
		<button type="button" {...props}>
			{children}
		</button>
	);
};
DropdownMenuSubTrigger.displayName = "DropdownMenuSubTrigger";
