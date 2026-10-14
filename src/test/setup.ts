import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Cleanup after each test
afterEach(() => {
	cleanup();
});

// Mock WebSocket
(global as unknown as { WebSocket?: unknown }).WebSocket = class WebSocket {
	static readonly CONNECTING = 0;
	static readonly OPEN = 1;
	static readonly CLOSING = 2;
	static readonly CLOSED = 3;

	constructor(url: string | URL, _protocols?: string | string[]) {
		console.log(`Mock WebSocket created for ${url}`);
	}
	send() {}
	close() {}
	addEventListener() {}
	removeEventListener() {}
};

// Mock Element.animate for Material Tailwind ripple effects
if (typeof Element !== "undefined") {
	Element.prototype.animate = () =>
		({
			cancel: () => {},
			finish: () => {},
			pause: () => {},
			play: () => {},
			reverse: () => {},
			updatePlaybackRate: () => {},
			persist: () => {},
			commitStyles: () => {},
			effect: null,
			currentTime: null,
			id: "",
			pending: false,
			playState: "finished",
			playbackRate: 1,
			ready: Promise.resolve(),
			replaceState: "active",
			startTime: 0,
			timeline: null,
			addEventListener: () => {},
			removeEventListener: () => {},
			dispatchEvent: () => true,
			oncancel: null,
			onfinish: null,
			onremove: null,
			finished: Promise.resolve(),
		}) as unknown as Animation;
}
