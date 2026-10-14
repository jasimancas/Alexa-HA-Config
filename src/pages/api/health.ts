import type { NextApiRequest, NextApiResponse } from "next";

type HealthCheckResponse = {
	status: "ok" | "degraded" | "error";
	timestamp: string;
	uptime: number;
	version?: string;
	services?: {
		database?: string;
		cache?: string;
	};
};

export default function handler(
	_req: NextApiRequest,
	res: NextApiResponse<HealthCheckResponse>,
) {
	const healthCheck: HealthCheckResponse = {
		status: "ok",
		timestamp: new Date().toISOString(),
		uptime: process.uptime(),
		version: process.env.npm_package_version || "1.0.0",
	};

	res.status(200).json(healthCheck);
}
