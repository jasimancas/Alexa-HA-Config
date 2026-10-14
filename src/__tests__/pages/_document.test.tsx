import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Suppress expected DOM nesting warning when testing Document component
// (render() creates a <div> container, but <html> cannot be a child of <div>)
beforeEach(() => {
	vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
	vi.restoreAllMocks();
});

// Override Next.js imports before importing the component
vi.mock("next/document", () => ({
	Head: () => <head data-testid="mock-head" />,
	Html: ({
		children,
		...props
	}: {
		children: React.ReactNode;
		[key: string]: unknown;
	}) => (
		<html {...props} data-testid="mock-html">
			{children}
		</html>
	),
	Main: () => <main data-testid="mock-main" />,
	NextScript: () => <script data-testid="mock-next-script" />,
}));

import Document from "../../pages/_document";

describe("Document", () => {
	it("should render Html component with lang='en'", () => {
		const { container } = render(<Document />);
		const html = container.querySelector('[data-testid="mock-html"]');
		expect(html).toBeInTheDocument();
		expect(html).toHaveAttribute("lang", "en");
	});

	it("should render Head component", () => {
		const { container } = render(<Document />);
		expect(
			container.querySelector('[data-testid="mock-head"]'),
		).toBeInTheDocument();
	});

	it("should render body element", () => {
		const { container } = render(<Document />);
		expect(container.querySelector("body")).toBeInTheDocument();
	});

	it("should render Main component inside body", () => {
		const { container } = render(<Document />);
		const body = container.querySelector("body");
		const main = container.querySelector('[data-testid="mock-main"]');
		expect(main).toBeInTheDocument();
		expect(body?.contains(main)).toBe(true);
	});

	it("should render NextScript component inside body", () => {
		const { container } = render(<Document />);
		const body = container.querySelector("body");
		const script = container.querySelector('[data-testid="mock-next-script"]');
		expect(script).toBeInTheDocument();
		expect(body?.contains(script)).toBe(true);
	});

	it("should have correct document structure", () => {
		const { container } = render(<Document />);

		// Check hierarchy: Html > Head + body > (Main + NextScript)
		const html = container.querySelector('[data-testid="mock-html"]');
		const head = container.querySelector('[data-testid="mock-head"]');
		const body = container.querySelector("body");
		const main = container.querySelector('[data-testid="mock-main"]');
		const script = container.querySelector('[data-testid="mock-next-script"]');

		expect(html).toBeInTheDocument();
		expect(html?.contains(head)).toBe(true);
		expect(html?.contains(body)).toBe(true);
		expect(body?.contains(main)).toBe(true);
		expect(body?.contains(script)).toBe(true);
	});
});
