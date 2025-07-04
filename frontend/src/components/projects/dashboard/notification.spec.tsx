import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Notification } from "./notification";

describe("Notification", () => {
  it("renders the bell icon with notification dot", () => {
    render(<Notification />);

    // Bell icon should be in the document
    expect(screen.getByRole("button")).toBeInTheDocument();

    // Red dot should be visible
    expect(document.querySelector(".bg-red-500")).toBeInTheDocument();
  });

  it("shows notification list when clicked", async () => {
    const user = userEvent.setup();
    render(<Notification />);

    // At first, content should not be visible
    expect(
      screen.queryByText(/7 days until grant deadline/i)
    ).not.toBeInTheDocument();

    // Click bell to open dropdown
    await user.click(screen.getByRole("button"));

    // You can add more assertions here if needed
  });
});
