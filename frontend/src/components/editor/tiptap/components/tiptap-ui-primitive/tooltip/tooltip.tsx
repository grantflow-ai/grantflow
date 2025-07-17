import {
	autoUpdate,
	flip,
	FloatingDelayGroup,
	FloatingPortal,
	offset,
	type Placement,
	type ReferenceType,
	shift,
	useDismiss,
	useFloating,
	type UseFloatingReturn,
	useFocus,
	useHover,
	useInteractions,
	useMergeRefs,
	useRole,
} from "@floating-ui/react";
import * as React from "react";
import "@/components/editor/tiptap/components/tiptap-ui-primitive/tooltip/tooltip.css";

interface TooltipContentProps extends Omit<React.HTMLProps<HTMLDivElement>, "ref"> {
	children?: React.ReactNode;
	portal?: boolean;
	portalProps?: Omit<React.ComponentProps<typeof FloatingPortal>, "children">;
}

interface TooltipContextValue extends UseFloatingReturn<ReferenceType> {
	getFloatingProps: (userProps?: React.HTMLProps<HTMLDivElement>) => Record<string, unknown>;
	getReferenceProps: (userProps?: React.HTMLProps<HTMLElement>) => Record<string, unknown>;
	open: boolean;
	setOpen: (open: boolean) => void;
}

interface TooltipProviderProps {
	children: React.ReactNode;
	closeDelay?: number;
	delay?: number;
	initialOpen?: boolean;
	onOpenChange?: (open: boolean) => void;
	open?: boolean;
	placement?: Placement;
	timeout?: number;
	useDelayGroup?: boolean;
}

interface TooltipTriggerProps extends Omit<React.HTMLProps<HTMLElement>, "ref"> {
	asChild?: boolean;
	children: React.ReactNode;
}

function useTooltip({
	closeDelay = 0,
	delay = 600,
	initialOpen = false,
	onOpenChange: setControlledOpen,
	open: controlledOpen,
	placement = "top",
}: Omit<TooltipProviderProps, "children"> = {}) {
	const [uncontrolledOpen, setUncontrolledOpen] = React.useState<boolean>(initialOpen);

	const open = controlledOpen ?? uncontrolledOpen;
	const setOpen = setControlledOpen ?? setUncontrolledOpen;

	const data = useFloating({
		middleware: [
			offset(4),
			flip({
				crossAxis: placement.includes("-"),
				fallbackAxisSideDirection: "start",
				padding: 4,
			}),
			shift({ padding: 4 }),
		],
		onOpenChange: setOpen,
		open,
		placement,
		whileElementsMounted: autoUpdate,
	});

	const { context } = data;

	const hover = useHover(context, {
		delay: {
			close: closeDelay,
		},
		enabled: controlledOpen == null,
		mouseOnly: true,
		move: false,
		restMs: delay,
	});
	const focus = useFocus(context, {
		enabled: controlledOpen == null,
	});
	const dismiss = useDismiss(context);
	const role = useRole(context, { role: "tooltip" });

	const interactions = useInteractions([hover, focus, dismiss, role]);

	return React.useMemo(
		() => ({
			open,
			setOpen,
			...interactions,
			...data,
		}),
		[open, setOpen, interactions, data],
	);
}

const TooltipContext = React.createContext<null | TooltipContextValue>(null);

export function Tooltip({ children, ...props }: TooltipProviderProps) {
	const tooltip = useTooltip(props);

	if (!props.useDelayGroup) {
		return <TooltipContext.Provider value={tooltip}>{children}</TooltipContext.Provider>;
	}

	return (
		<FloatingDelayGroup delay={{ close: props.closeDelay ?? 0, open: props.delay ?? 0 }} timeoutMs={props.timeout}>
			<TooltipContext.Provider value={tooltip}>{children}</TooltipContext.Provider>
		</FloatingDelayGroup>
	);
}

function useTooltipContext() {
	const context = React.useContext(TooltipContext);

	if (context == null) {
		throw new Error("Tooltip components must be wrapped in <TooltipProvider />");
	}

	return context;
}

export const TooltipTrigger = React.forwardRef<HTMLElement, TooltipTriggerProps>(function TooltipTrigger(
	{ asChild = false, children, ...props },
	propRef,
) {
	const context = useTooltipContext();
	const childrenRef = React.isValidElement(children)
		? Number.parseInt(React.version, 10) >= 19
			? (children as { props: { ref?: React.Ref<any> } }).props.ref
			: (children as any).ref
		: undefined;
	const ref = useMergeRefs([context.refs.setReference, propRef, childrenRef]);

	if (asChild && React.isValidElement(children)) {
		const dataAttributes = {
			"data-tooltip-state": context.open ? "open" : "closed",
		};

		return React.cloneElement(
			children,
			context.getReferenceProps({
				ref,
				...props,
				...(typeof children.props === "object" ? children.props : {}),
				...dataAttributes,
			}),
		);
	}

	return (
		<button data-tooltip-state={context.open ? "open" : "closed"} ref={ref} {...context.getReferenceProps(props)}>
			{children}
		</button>
	);
});

export const TooltipContent = React.forwardRef<HTMLDivElement, TooltipContentProps>(function TooltipContent(
	{ children, portal = true, portalProps = {}, style, ...props },
	propRef,
) {
	const context = useTooltipContext();
	const ref = useMergeRefs([context.refs.setFloating, propRef]);

	if (!context.open) return null;

	const content = (
		<div
			ref={ref}
			style={{
				...context.floatingStyles,
				...style,
			}}
			{...context.getFloatingProps(props)}
			className="tiptap-tooltip"
		>
			{children}
		</div>
	);

	if (portal) {
		return <FloatingPortal {...portalProps}>{content}</FloatingPortal>;
	}

	return content;
});

Tooltip.displayName = "Tooltip";
TooltipTrigger.displayName = "TooltipTrigger";
TooltipContent.displayName = "TooltipContent";
