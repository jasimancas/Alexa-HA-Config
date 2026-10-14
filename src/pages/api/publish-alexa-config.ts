import type { NextApiRequest, NextApiResponse } from "next";
import { updateAlexaConfiguration } from "../../utils/ha-config.util";

type SuccessResponse = {
	success: true;
	message: string;
	entitiesCount: number;
};

type ErrorResponse = {
	success: false;
	error: string;
};

type Response = SuccessResponse | ErrorResponse;

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse<Response>,
) {
	// Only allow POST requests
	if (req.method !== "POST") {
		return res.status(405).json({
			success: false,
			error: "Method not allowed. Use POST.",
		});
	}

	try {
		// Validate request body exists
		if (!req.body) {
			return res.status(400).json({
				success: false,
				error: "Invalid request body. Expected { entityIds: string[] }",
			});
		}

		// Extract entity IDs from request body
		const { entityIds } = req.body;

		// Validate input
		if (!Array.isArray(entityIds)) {
			return res.status(400).json({
				success: false,
				error: "Invalid request body. Expected { entityIds: string[] }",
			});
		}

		// Update configuration
		const result = await updateAlexaConfiguration(entityIds);

		// Return success response
		return res.status(200).json(result);
	} catch (error) {
		console.error("Error updating Alexa configuration:", error);

		// Return error response
		return res.status(500).json({
			success: false,
			error: (error as Error).message || "Failed to update configuration",
		});
	}
}
