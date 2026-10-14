import type { NextApiRequest, NextApiResponse } from "next";

const SUPERVISOR_URL = process.env.SUPERVISOR_URL ?? "http://supervisor";

type Action = "check" | "restart";

const ENDPOINTS: Record<Action, string> = {
	check: "/core/check",
	restart: "/core/restart",
};

type SupervisorResponse = {
	result: "ok" | "error";
	message?: string;
};

/**
 * Proxies Home Assistant Core config check / restart through the Supervisor.
 * The Alexa `smart_home` YAML is only read at startup, so a restart is needed
 * for a new entity filter to take effect.
 */
export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse,
) {
	if (req.method !== "POST") {
		return res
			.status(405)
			.json({ success: false, error: "Method not allowed. Use POST." });
	}

	const action = req.body?.action as Action;
	if (!Object.hasOwn(ENDPOINTS, action)) {
		return res.status(400).json({
			success: false,
			error: 'Invalid action. Expected "check" or "restart".',
		});
	}

	const token = process.env.SUPERVISOR_TOKEN;
	if (!token) {
		return res.status(503).json({
			success: false,
			error: "Supervisor API not available (SUPERVISOR_TOKEN missing)",
		});
	}

	try {
		const response = await fetch(`${SUPERVISOR_URL}${ENDPOINTS[action]}`, {
			method: "POST",
			headers: { Authorization: `Bearer ${token}` },
		});
		const body = (await response
			.json()
			.catch(() => ({}))) as Partial<SupervisorResponse>;

		if (!response.ok || body.result === "error") {
			return res.status(action === "check" ? 422 : 502).json({
				success: false,
				error:
					body.message ??
					`Supervisor returned ${response.status} for ${action}`,
			});
		}

		return res.status(200).json({ success: true });
	} catch (error) {
		// A restart can drop the connection before the Supervisor answers
		if (action === "restart") {
			return res.status(202).json({ success: true });
		}
		return res
			.status(502)
			.json({ success: false, error: (error as Error).message });
	}
}
