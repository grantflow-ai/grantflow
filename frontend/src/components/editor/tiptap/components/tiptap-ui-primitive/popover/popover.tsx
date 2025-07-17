import type { Placement } from "@floating-ui/react";
import {
	autoUpdate,
	flip,
	FloatingFocusManager,
	FloatingPortal,
	limitShift,
	offset,
	shift,
	useClick,
	useDismiss,
	useFloating,
	useInteractions,
	useMergeRefs,
	useRole,
} from "@floating-ui/react";
import * as React from "react";
import "@/components/editor/tiptap/components/tiptap-ui-primitive/popover/popover.css";

type PopoverContextValue = {
	setDescriptionId: (id: string | undefined) => void;
	setLabelId: (id: string | undefined) => void;
	updatePosition: (
		side: "bottom" | "left" | "right" | "top",
		align: "center" | "end" | "start",
		sideOffset?: number,
		alignOffset?: number,
	) => void;
} & ReturnType<typeof usePopover>;

interface PopoverOptions {
	align?: "center" | "end" | "start";
	alignOffset?: number;
	initialOpen?: boolean;
	modal?: boolean;
	onOpenChange?: (open: boolean) => void;
	open?: boolean;
	side?: "bottom" | "left" | "right" | "top";
	sideOffset?: number;
}

interface PopoverProps extends PopoverOptions {
	children: React.ReactNode;
}

const PopoverContext = React.createContext<null | PopoverContextValue>(null);

interface TriggerElementProps extends React.HTMLProps<HTMLElement> {
	asChild?: boolean;
}

function Popover({ children, modal = false, ...options }: PopoverProps) {
	const popover = usePopover({ modal, ...options });
	return <PopoverContext.Provider value={popover}>{children}</PopoverContext.Provider>;
}

function usePopover({
	align = "center",
	alignOffset = 0,
	initialOpen = false,
	modal,
	onOpenChange: setControlledOpen,
	open: controlledOpen,
	side = "bottom",
	sideOffset = 4,
}: PopoverOptions = {}) {
	const [uncontrolledOpen, setUncontrolledOpen] = React.useState(initialOpen);
	const [labelId, setLabelId] = React.useState<string>();
	const [descriptionId, setDescriptionId] = React.useState<string>();
	const [currentPlacement, setCurrentPlacement] = React.useState<Placement>(`${side}-${align}` as Placement);
	const [offsets, setOffsets] = React.useState({ alignOffset, sideOffset });

	const open = controlledOpen ?? uncontrolledOpen;
	const setOpen = setControlledOpen ?? setUncontrolledOpen;

	const middleware = React.useMemo(
		() => [
			offset({
				crossAxis: offsets.alignOffset,
				mainAxis: offsets.sideOffset,
			}),
			flip({
				crossAxis: false,
				fallbackAxisSideDirection: "end",
			}),
			shift({
				limiter: limitShift({ offset: offsets.sideOffset }),
			}),
		],
		[offsets.sideOffset, offsets.alignOffset],
	);

	const floating = useFloating({
		middleware,
		onOpenChange: setOpen,
		open,
		placement: currentPlacement,
		whileElementsMounted: autoUpdate,
	});

	const interactions = useInteractions([
		useClick(floating.context),
		useDismiss(floating.context),
		useRole(floating.context),
	]);

	const updatePosition = React.useCallback(
		(
			newSide: "bottom" | "left" | "right" | "top",
			newAlign: "center" | "end" | "start",
			newSideOffset?: number,
			newAlignOffset?: number,
		) => {
			setCurrentPlacement(`${newSide}-${newAlign}` as Placement);
			if (newSideOffset !== undefined || newAlignOffset !== undefined) {
				setOffsets({
					alignOffset: newAlignOffset ?? offsets.alignOffset,
					sideOffset: newSideOffset ?? offsets.sideOffset,
				});
			}
		},
		[offsets.sideOffset, offsets.alignOffset],
	);

	return React.useMemo(
		() => ({
			open,
			setOpen,
			...interactions,
			...floating,
			descriptionId,
			labelId,
			modal,
			setDescriptionId,
			setLabelId,
			updatePosition,
		}),
		[open, setOpen, interactions, floating, modal, labelId, descriptionId, updatePosition],
	);
}

function usePopoverContext() {
	const context = React.useContext(PopoverContext);
	if (!context) {
		throw new Error("Popover components must be wrapped in <Popover />");
	}
	return context;
}

const PopoverTrigger = React.forwardRef<HTMLElement, TriggerElementProps>(function PopoverTrigger(
	{ asChild = false, children, ...props },
	propRef,
) {
	const context = usePopoverContext();
	const childrenRef = React.isValidElement(children)
		? Number.parseInt(React.version, 10) >= 19
			? (children.props as any).ref
			: (children as any).ref
		: undefined;
	const ref = useMergeRefs([context.refs.setReference, propRef, childrenRef]);

	if (asChild && React.isValidElement(children)) {
		return React.cloneElement(
			children,
			context.getReferenceProps({
				ref,
				...props,
				...(children.props as any),
				"data-state": context.open ? "open" : "closed",
			}),
		);
	}

	return (
		<button data-state={context.open ? "open" : "closed"} ref={ref} {...context.getReferenceProps(props)}>
			{children}
		</button>
	);
});

interface PopoverContentProps extends React.HTMLProps<HTMLDivElement> {
	align?: "center" | "end" | "start";
	alignOffset?: number;
	asChild?: boolean;
	portal?: boolean;
	portalProps?: Omit<React.ComponentProps<typeof FloatingPortal>, "children">;
	side?: "bottom" | "left" | "right" | "top";
	sideOffset?: number;
}

const PopoverContent = React.forwardRef<HTMLDivElement, PopoverContentProps>(function PopoverContent(
	{
		align = "center",
		alignOffset,
		asChild = false,
		children,
		className,
		portal = true,
		portalProps = {},
		side = "bottom",
		sideOffset,
		style,
		...props
	},
	propRef,
) {
	const context = usePopoverContext();
	const childrenRef = React.isValidElement(children)
		? Number.parseInt(React.version, 10) >= 19
			? (children.props as any).ref
			: (children as any).ref
		: undefined;
	const ref = useMergeRefs([context.refs.setFloating, propRef, childrenRef]);

	React.useEffect(() => {
		context.updatePosition(side, align, sideOffset, alignOffset);
	}, [context, side, align, sideOffset, alignOffset]);

	if (!context.context.open) return null;

	const contentProps = {
		"aria-describedby": context.descriptionId,
		"aria-labelledby": context.labelId,
		className: `tiptap-popover ${className || ""}`,
		"data-align": align,
		"data-side": side,
		"data-state": context.context.open ? "open" : "closed",
		ref,
		style: {
			left: context.x ?? 0,
			position: context.strategy,
			top: context.y ?? 0,
			...style,
		},
		...context.getFloatingProps(props),
	};

	const content =
		asChild && React.isValidElement(children) ? (
			React.cloneElement(children, {
				...contentProps,
				...(children.props as any),
			})
		) : (
			<div {...contentProps}>{children}</div>
		);

	const wrappedContent = (
		<FloatingFocusManager context={context.context} modal={context.modal}>
			{content}
		</FloatingFocusManager>
	);

	if (portal) {
		return <FloatingPortal {...portalProps}>{wrappedContent}</FloatingPortal>;
	}

	return wrappedContent;
});

PopoverTrigger.displayName = "PopoverTrigger";
PopoverContent.displayName = "PopoverContent";

export { Popover, PopoverContent, PopoverTrigger };
