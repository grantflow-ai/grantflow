import { render, screen } from "@testing-library/react";

import {
	AppCard,
	AppCardAction,
	AppCardContent,
	AppCardDescription,
	AppCardFooter,
	AppCardHeader,
	AppCardTitle,
	InfoCard,
} from "./app-card";

describe("AppCard", () => {
	it("renders basic card with testid", () => {
		render(<AppCard>Card content</AppCard>);

		expect(screen.getByTestId("app-card")).toBeInTheDocument();
		expect(screen.getByText("Card content")).toBeInTheDocument();
	});

	it("forwards props to underlying Card component", () => {
		render(<AppCard className="custom-class">Content</AppCard>);

		expect(screen.getByTestId("app-card")).toHaveClass("custom-class");
	});
});

describe("AppCardHeader", () => {
	it("renders with correct testid and grid classes", () => {
		render(<AppCardHeader>Header content</AppCardHeader>);

		const header = screen.getByTestId("app-card-header");
		expect(header).toBeInTheDocument();
		expect(header).toHaveClass(
			"@container/card-header",
			"grid",
			"auto-rows-min",
			"grid-rows-[auto_auto]",
			"items-start",
			"gap-1.5",
		);
	});

	it("applies custom className", () => {
		render(<AppCardHeader className="custom-header">Content</AppCardHeader>);

		expect(screen.getByTestId("app-card-header")).toHaveClass("custom-header");
	});

	it("adds grid columns class when card action is present", () => {
		render(
			<AppCardHeader>
				<div>Title</div>
				<div data-slot="card-action">Action</div>
			</AppCardHeader>,
		);

		expect(screen.getByTestId("app-card-header")).toHaveClass("has-data-[slot=card-action]:grid-cols-[1fr_auto]");
	});
});

describe("AppCardTitle", () => {
	it("renders with testid", () => {
		render(<AppCardTitle>Card Title</AppCardTitle>);

		expect(screen.getByTestId("app-card-title")).toBeInTheDocument();
		expect(screen.getByText("Card Title")).toBeInTheDocument();
	});
});

describe("AppCardDescription", () => {
	it("renders with testid", () => {
		render(<AppCardDescription>Card description</AppCardDescription>);

		expect(screen.getByTestId("app-card-description")).toBeInTheDocument();
		expect(screen.getByText("Card description")).toBeInTheDocument();
	});
});

describe("AppCardContent", () => {
	it("renders with testid", () => {
		render(<AppCardContent>Card content</AppCardContent>);

		expect(screen.getByTestId("app-card-content")).toBeInTheDocument();
		expect(screen.getByText("Card content")).toBeInTheDocument();
	});
});

describe("AppCardFooter", () => {
	it("renders with testid", () => {
		render(<AppCardFooter>Footer content</AppCardFooter>);

		expect(screen.getByTestId("app-card-footer")).toBeInTheDocument();
		expect(screen.getByText("Footer content")).toBeInTheDocument();
	});
});

describe("AppCardAction", () => {
	it("renders with correct testid and classes", () => {
		render(<AppCardAction>Action button</AppCardAction>);

		const action = screen.getByTestId("app-card-action");
		expect(action).toBeInTheDocument();
		expect(action).toHaveClass("col-start-2", "row-span-2", "row-start-1", "self-start", "justify-self-end");
		expect(action).toHaveAttribute("data-slot", "card-action");
	});

	it("applies custom className", () => {
		render(<AppCardAction className="custom-action">Action</AppCardAction>);

		expect(screen.getByTestId("app-card-action")).toHaveClass("custom-action");
	});
});

describe("InfoCard", () => {
	it("renders with title only", () => {
		render(<InfoCard title="Test Title" />);

		expect(screen.getByTestId("info-card")).toBeInTheDocument();
		expect(screen.getByTestId("app-card-title")).toHaveTextContent("Test Title");
	});

	it("renders with title and description", () => {
		render(<InfoCard description="Test description" title="Test Title" />);

		expect(screen.getByTestId("app-card-title")).toHaveTextContent("Test Title");
		expect(screen.getByTestId("app-card-description")).toHaveTextContent("Test description");
	});

	it("renders with all props", () => {
		const action = <button type="button">Action</button>;
		const footer = <div>Footer content</div>;

		render(
			<InfoCard action={action} description="Test description" footer={footer} title="Test Title">
				<div>Children content</div>
			</InfoCard>,
		);

		expect(screen.getByTestId("app-card-title")).toHaveTextContent("Test Title");
		expect(screen.getByTestId("app-card-description")).toHaveTextContent("Test description");
		expect(screen.getByTestId("app-card-action")).toContainElement(screen.getByRole("button", { name: "Action" }));
		expect(screen.getByTestId("app-card-content")).toHaveTextContent("Children content");
		expect(screen.getByTestId("app-card-footer")).toHaveTextContent("Footer content");
	});

	it("conditionally renders description", () => {
		render(<InfoCard title="Test Title" />);

		expect(screen.getByTestId("app-card-title")).toBeInTheDocument();
		expect(screen.queryByTestId("app-card-description")).not.toBeInTheDocument();
	});

	it("conditionally renders action", () => {
		render(<InfoCard title="Test Title" />);

		expect(screen.queryByTestId("app-card-action")).not.toBeInTheDocument();
	});

	it("conditionally renders children content", () => {
		render(<InfoCard title="Test Title" />);

		expect(screen.queryByTestId("app-card-content")).not.toBeInTheDocument();
	});

	it("conditionally renders footer", () => {
		render(<InfoCard title="Test Title" />);

		expect(screen.queryByTestId("app-card-footer")).not.toBeInTheDocument();
	});

	it("applies custom className to card", () => {
		render(<InfoCard className="custom-info-card" title="Test Title" />);

		expect(screen.getByTestId("info-card")).toHaveClass("custom-info-card");
	});

	it("renders complex action element", () => {
		const complexAction = (
			<div>
				<button type="button">Edit</button>
				<button type="button">Delete</button>
			</div>
		);

		render(<InfoCard action={complexAction} title="Test Title" />);

		const actionContainer = screen.getByTestId("app-card-action");
		expect(actionContainer).toContainElement(screen.getByRole("button", { name: "Edit" }));
		expect(actionContainer).toContainElement(screen.getByRole("button", { name: "Delete" }));
	});

	it("renders complex children content", () => {
		render(
			<InfoCard title="Test Title">
				<div>
					<p>Paragraph 1</p>
					<p>Paragraph 2</p>
					<ul>
						<li>Item 1</li>
						<li>Item 2</li>
					</ul>
				</div>
			</InfoCard>,
		);

		const content = screen.getByTestId("app-card-content");
		expect(content).toHaveTextContent("Paragraph 1");
		expect(content).toHaveTextContent("Paragraph 2");
		expect(content).toHaveTextContent("Item 1");
		expect(content).toHaveTextContent("Item 2");
	});
});
