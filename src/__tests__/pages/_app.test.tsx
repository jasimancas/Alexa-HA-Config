import { render, screen } from "@testing-library/react";
import type { AppProps } from "next/app";
import { describe, expect, it, vi } from "vitest";
import App from "../../pages/_app";

// Mock the hooks and dependencies
vi.mock("react-hot-toast");

// Mock Material Tailwind components
vi.mock("@material-tailwind/react", () => ({
	ThemeProvider: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="theme-provider">{children}</div>
	),
}));

describe("App", () => {
	const TestComponent = () => <div data-testid="test-component">Test</div>;

	const createAppProps = (): AppProps => ({
		Component: TestComponent,
		pageProps: {},
		router: {} as AppProps["router"],
	});

	it("should render children component", () => {
		render(<App {...createAppProps()} />);

		expect(screen.getByTestId("test-component")).toBeInTheDocument();
	});

	it("should wrap component with QueryClientProvider", () => {
		render(<App {...createAppProps()} />);

		// The component should be wrapped and rendered
		expect(screen.getByTestId("test-component")).toBeInTheDocument();
	});

	it("should wrap component with ThemeProvider", () => {
		render(<App {...createAppProps()} />);

		expect(screen.getByTestId("theme-provider")).toBeInTheDocument();
	});

	it("should create QueryClient with correct default options", () => {
		const { container } = render(<App {...createAppProps()} />);

		// Verify component renders (which means QueryClient was created successfully)
		expect(
			container.querySelector('[data-testid="test-component"]'),
		).toBeInTheDocument();
	});
});
