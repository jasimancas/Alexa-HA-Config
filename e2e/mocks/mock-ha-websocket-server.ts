import { WebSocketServer, WebSocket } from "ws";
import {
	MessageType,
	RequestTypeId,
} from "../../src/types/home-assistant.types";
import { mockAreas, mockDevices, mockEntities } from "../fixtures/home-assistant";

export interface MockServerOptions {
	port?: number;
	authToken?: string;
}

export class MockHAWebSocketServer {
	private wss: WebSocketServer | null = null;
	private port: number;
	private authToken: string;

	constructor(options: MockServerOptions = {}) {
		this.port = options.port ?? 8765;
		this.authToken = options.authToken ?? "test-token";
	}

	start(): Promise<void> {
		return new Promise((resolve, reject) => {
			try {
				this.wss = new WebSocketServer({ port: this.port });

				this.wss.on("connection", (ws: WebSocket) => {
					console.log("[Mock HA] Client connected");

					// Send auth_required immediately on connection
					this.sendMessage(ws, { type: MessageType.AUTH_REQUIRED });

					ws.on("message", (data: Buffer) => {
						const message = JSON.parse(data.toString());
						this.handleMessage(ws, message);
					});

					ws.on("close", () => {
						console.log("[Mock HA] Client disconnected");
					});

					ws.on("error", (error) => {
						console.error("[Mock HA] WebSocket error:", error);
					});
				});

				this.wss.on("listening", () => {
					console.log(`[Mock HA] Server started on port ${this.port}`);
					resolve();
				});

				this.wss.on("error", (error) => {
					console.error("[Mock HA] Server error:", error);
					reject(error);
				});
			} catch (error) {
				reject(error);
			}
		});
	}

	stop(): Promise<void> {
		return new Promise((resolve) => {
			if (this.wss) {
				// Close all connections
				this.wss.clients.forEach((client) => {
					client.close();
				});

				this.wss.close(() => {
					console.log("[Mock HA] Server stopped");
					this.wss = null;
					resolve();
				});
			} else {
				resolve();
			}
		});
	}

	private sendMessage(ws: WebSocket, message: Record<string, unknown>): void {
		if (ws.readyState === WebSocket.OPEN) {
			ws.send(JSON.stringify(message));
		}
	}

	private handleMessage(ws: WebSocket, message: Record<string, unknown>): void {
		console.log("[Mock HA] Received:", message.type);

		switch (message.type) {
			case "auth":
				this.handleAuth(ws, message);
				break;

			case MessageType.GET_DEVICES:
				this.handleGetDevices(ws, message);
				break;

			case MessageType.GET_ENTITIES:
				this.handleGetEntities(ws, message);
				break;

			case MessageType.GET_AREAS:
				this.handleGetAreas(ws, message);
				break;

			default:
				console.log("[Mock HA] Unknown message type:", message.type);
		}
	}

	private handleAuth(ws: WebSocket, message: Record<string, unknown>): void {
		const token = message.access_token;

		if (token === this.authToken) {
			this.sendMessage(ws, { type: MessageType.AUTH_OK });
			console.log("[Mock HA] Auth successful");
		} else {
			this.sendMessage(ws, {
				type: "auth_invalid",
				message: "Invalid access token",
			});
			console.log("[Mock HA] Auth failed - invalid token");
		}
	}

	private handleGetDevices(
		ws: WebSocket,
		message: Record<string, unknown>,
	): void {
		this.sendMessage(ws, {
			type: MessageType.RESULT,
			id: message.id ?? RequestTypeId.GET_DEVICES,
			success: true,
			result: mockDevices,
		});
		console.log("[Mock HA] Sent devices:", mockDevices.length);
	}

	private handleGetEntities(
		ws: WebSocket,
		message: Record<string, unknown>,
	): void {
		this.sendMessage(ws, {
			type: MessageType.RESULT,
			id: message.id ?? RequestTypeId.GET_ENTITIES,
			success: true,
			result: mockEntities,
		});
		console.log("[Mock HA] Sent entities:", mockEntities.length);
	}

	private handleGetAreas(
		ws: WebSocket,
		message: Record<string, unknown>,
	): void {
		this.sendMessage(ws, {
			type: MessageType.RESULT,
			id: message.id ?? RequestTypeId.GET_AREAS,
			success: true,
			result: mockAreas,
		});
		console.log("[Mock HA] Sent areas:", mockAreas.length);
	}
}

// Allow running as standalone script
if (require.main === module) {
	const server = new MockHAWebSocketServer({ port: 8765 });
	server.start().then(() => {
		console.log("Mock Home Assistant WebSocket server running...");
		console.log("Press Ctrl+C to stop");
	});

	process.on("SIGINT", () => {
		server.stop().then(() => {
			process.exit(0);
		});
	});
}
