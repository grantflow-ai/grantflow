import type { Placement } from "@floating-ui/react";
import {
	autoUpdate,
	flip,
	FloatingFocusManager,
	FloatingList,
	FloatingPortal,
	offset,
	shift,
	useClick,
	useDismiss,
	useFloating,
	useInteractions,
	useListItem,
	useListNavigation,
	useMergeRefs,
	useRole,
	useTypeahead,
} from "@floating-ui/react";
import * as React from "react";
import "@/components/editor/tiptap/components/tiptap-ui-primitive/dropdown-menu/dropdown-menu.css";
import { Separator } from "@/components/editor/tiptap/components/tiptap-ui-primitive/separator";

type ContextType = {
	updatePosition: (side: "bottom" | "left" | "right" | "top", align: "center" | "end" | "start") => void;
} & ReturnType<typeof useDropdownMenu>;

interface DropdownMenuOptions {
	align?: "center" | "end" | "start";
	initialOpen?: boolean;
	onOpenChange?: (open: boolean) => void;
	open?: boolean;
	side?: "bottom" | "left" | "right" | "top";
}

interface DropdownMenuProps extends DropdownMenuOptions {
	children: React.ReactNode;
}

const DropdownMenuContext = React.createContext<ContextType | null>(null);

interface DropdownMenuTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	asChild?: boolean;
}

export function DropdownMenu({ children, ...options }: DropdownMenuProps) {
	const dropdown = useDropdownMenu(options);
	return (
		<DropdownMenuContext.Provider value={dropdown}>
			<FloatingList elementsRef={dropdown.elementsRef} labelsRef={dropdown.labelsRef}>
				{children}
			</FloatingList>
		</DropdownMenuContext.Provider>
	);
}

function useDropdownMenu({
	align = "start",
	initialOpen = false,
	onOpenChange: setControlledOpen,
	open: controlledOpen,
	side = "bottom",
}: DropdownMenuOptions) {
	const [uncontrolledOpen, setUncontrolledOpen] = React.useState(initialOpen);
	const [currentPlacement, setCurrentPlacement] = React.useState<Placement>(`${side}-${align}` as Placement);
	const [activeIndex, setActiveIndex] = React.useState<null | number>(null);

	const open = controlledOpen ?? uncontrolledOpen;
	const setOpen = setControlledOpen ?? setUncontrolledOpen;

	const elementsRef = React.useRef<(HTMLElement | null)[]>([]);
	const labelsRef = React.useRef<(null | string)[]>([]);

	const floating = useFloating({
		middleware: [offset({ mainAxis: 4 }), flip(), shift({ padding: 4 })],
		onOpenChange: setOpen,
		open,
		placement: currentPlacement,
		whileElementsMounted: autoUpdate,
	});

	const { context } = floating;

	const interactions = useInteractions([
		useClick(context, {
			event: "mousedown",
			ignoreMouse: false,
			toggle: true,
		}),
		useRole(context, { role: "menu" }),
		useDismiss(context, {
			outsidePress: true,
			outsidePressEvent: "mousedown",
		}),
		useListNavigation(context, {
			activeIndex,
			listRef: elementsRef,
			loop: true,
			onNavigate: setActiveIndex,
		}),
		useTypeahead(context, {
			activeIndex,
			listRef: labelsRef,
			onMatch: open ? setActiveIndex : undefined,
		}),
	]);

	const updatePosition = React.useCallback(
		(newSide: "bottom" | "left" | "right" | "top", newAlign: "center" | "end" | "start") => {
			setCurrentPlacement(`${newSide}-${newAlign}` as Placement);
		},
		[],
	);

	return React.useMemo(
		() => ({
			activeIndex,
			elementsRef,
			labelsRef,
			open,
			setActiveIndex,
			setOpen,
			updatePosition,
			...interactions,
			...floating,
		}),
		[open, setOpen, activeIndex, interactions, floating, updatePosition],
	);
}

function useDropdownMenuContext() {
	const context = React.useContext(DropdownMenuContext);
	if (!context) {
		throw new Error("DropdownMenu components must be wrapped in <DropdownMenu />");
	}
	return context;
}

export const DropdownMenuTrigger = React.forwardRef<HTMLButtonElement, DropdownMenuTriggerProps>(
	({ asChild = false, children, ...props }, propRef) => {
		const context = useDropdownMenuContext();
		const childrenRef = React.isValidElement(children)
			? Number.parseInt(React.version, 10) >= 19
				? (children as { props: { ref?: React.Ref<any> } }).props.ref
				: (children as any).ref
			: undefined;
		const ref = useMergeRefs([context.refs.setReference, propRef, childrenRef]);

		if (asChild && React.isValidElement(children)) {
			const dataAttributes = {
				"data-state": context.open ? "open" : "closed",
			};

			return React.cloneElement(
				children,
				context.getReferenceProps({
					ref,
					...props,
					...(typeof children.props === "object" ? children.props : {}),
					"aria-expanded": context.open,
					"aria-haspopup": "menu" as const,
					...dataAttributes,
				}),
			);
		}

		return (
			<button
				aria-expanded={context.open}
				aria-haspopup="menu"
				data-state={context.open ? "open" : "closed"}
				ref={ref}
				{...context.getReferenceProps(props)}
			>
				{children}
			</button>
		);
	},
);

DropdownMenuTrigger.displayName = "DropdownMenuTrigger";

interface DropdownMenuContentProps extends React.HTMLAttributes<HTMLDivElement> {
	align?: "center" | "end" | "start";
	orientation?: "horizontal" | "vertical";
	portal?: boolean;
	portalProps?: Omit<React.ComponentProps<typeof FloatingPortal>, "children">;
	side?: "bottom" | "left" | "right" | "top";
}

export const DropdownMenuContent = React.forwardRef<HTMLDivElement, DropdownMenuContentProps>(
	(
		{
			align = "start",
			className,
			orientation = "vertical",
			portal = true,
			portalProps = {},
			side = "bottom",
			style,
			...props
		},
		propRef,
	) => {
		const context = useDropdownMenuContext();
		const ref = useMergeRefs([context.refs.setFloating, propRef]);

		React.useEffect(() => {
			context.updatePosition(side, align);
		}, [context, side, align]);

		if (!context.open) return null;

		const content = (
			<FloatingFocusManager context={context.context} initialFocus={0} modal={false} returnFocus={true}>
				<div
					className={`tiptap-dropdown-menu ${className || ""}`}
					ref={ref}
					style={{
						left: context.x ?? 0,
						outline: "none",
						position: context.strategy,
						top: context.y ?? 0,
						...style,
					}}
					{...context.getFloatingProps(props)}
				>
					{props.children}
				</div>
			</FloatingFocusManager>
		);

		if (portal) {
			return <FloatingPortal {...portalProps}>{content}</FloatingPortal>;
		}

		return content;
	},
);

DropdownMenuContent.displayName = "DropdownMenuContent";

interface DropdownMenuItemProps extends React.HTMLAttributes<HTMLDivElement> {
	asChild?: boolean;
	disabled?: boolean;
	onSelect?: () => void;
}

export const DropdownMenuItem = React.forwardRef<HTMLDivElement, DropdownMenuItemProps>(
	({ asChild = false, children, className, disabled, onSelect, ...props }, ref) => {
		const context = useDropdownMenuContext();
		const item = useListItem({ label: disabled ? null : children?.toString() });
		const isActive = context.activeIndex === item.index;

		const handleSelect = React.useCallback(
			(event: React.MouseEvent<HTMLDivElement>) => {
				if (disabled) return;
				onSelect?.();
				props.onClick?.(event);
				context.setOpen(false);
			},
			// biome-ignore lint/correctness/useExhaustiveDependencies: tiptap source code, check this later
			[context, disabled, onSelect, props],
		);

		const itemProps: {
			"aria-disabled"?: boolean;
			"data-highlighted"?: boolean;
			ref: React.Ref<HTMLDivElement>;
			role: string;
			tabIndex: number;
		} & React.HTMLAttributes<HTMLDivElement> = {
			"aria-disabled": disabled,
			className,
			"data-highlighted": isActive,
			ref: useMergeRefs([item.ref, ref]),
			role: "menuitem",
			tabIndex: isActive ? 0 : -1,
			...context.getItemProps({
				...props,
				onClick: handleSelect,
			}),
		};

		if (asChild && React.isValidElement(children)) {
			const childProps = children.props as {
				onClick?: (event: React.MouseEvent<HTMLElement>) => void;
			};

			// Create merged props without adding onClick directly to the props object
			const mergedProps = {
				...itemProps,
				...(typeof children.props === "object" ? children.props : {}),
			};

			// Handle onClick separately based on the element type
			const eventHandlers = {
				onClick: (event: React.MouseEvent<HTMLElement>) => {
					// Cast the event to make it compatible with handleSelect
					handleSelect(event as unknown as React.MouseEvent<HTMLDivElement>);
					childProps.onClick?.(event);
				},
			};

			return React.cloneElement(children, {
				...mergedProps,
				...eventHandlers,
			});
		}

		return <div {...itemProps}>{children}</div>;
	},
);

DropdownMenuItem.displayName = "DropdownMenuItem";

interface DropdownMenuGroupProps extends React.HTMLAttributes<HTMLDivElement> {
	label?: string;
}

export const DropdownMenuGroup = React.forwardRef<HTMLDivElement, DropdownMenuGroupProps>(
	({ children, className, label, ...props }, ref) => {
		return (
			<div {...props} className={`tiptap-button-group ${className || ""}`} ref={ref}>
				{children}
			</div>
		);
	},
);

DropdownMenuGroup.displayName = "DropdownMenuGroup";

export const DropdownMenuSeparator = React.forwardRef<
	React.ElementRef<typeof Separator>,
	React.ComponentPropsWithoutRef<typeof Separator>
>(({ className, ...props }, ref) => (
	<Separator className={`tiptap-dropdown-menu-separator ${className || ""}`} ref={ref} {...props} />
));
DropdownMenuSeparator.displayName = Separator.displayName;
