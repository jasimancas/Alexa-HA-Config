/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: true,
	// Self-contained server in .next/standalone: no pnpm or dev deps in the image
	output: "standalone",
	poweredByHeader: false,
};

module.exports = nextConfig;
