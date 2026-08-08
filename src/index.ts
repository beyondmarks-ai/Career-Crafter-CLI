#!/usr/bin/env node
import { stdin as input, stdout as output } from "node:process";
import { createInterface } from "node:readline/promises";

const defaultServer = process.env.CAREERCRAFT_API_URL ?? "http://localhost:3000";
const rl = createInterface({ input, output });
const ask = async (label: string, required = false) => {
	let answer = "";
	while (!answer && required) {
		answer = (await rl.question(`${label}: `)).trim();
		if (!answer) output.write("This answer is required.\n");
	}
	return answer || (await rl.question(`${label}: `)).trim();
};
const lines = (value: string) =>
	value
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean);
async function request(path: string, init?: RequestInit) {
	const response = await fetch(`${defaultServer}${path}`, {
		...init,
		headers: { "content-type": "application/json", ...init?.headers },
	});
	const body = await response.json().catch(() => ({}));
	if (!response.ok) throw new Error(body.error ?? "CareerCraft is unavailable");
	return body;
}
async function main() {
	if (process.argv[2] !== "create") {
		console.log("Usage: npx @careercraft/cli create");
		return;
	}
	console.log("\nCareerCraft � create a professional resume\n");
	const resume = {
		name: await ask("Full name", true),
		email: await ask("Email address", true),
		headline: await ask("Target role / headline"),
		phone: await ask("Phone number"),
		location: await ask("Location"),
		website: await ask("Website or LinkedIn URL"),
		summary: await ask("Professional summary"),
		skills: lines(await ask("Skills (comma separated)")),
		experience: lines(await ask("Employers or experience entries (comma separated)")),
		education: lines(await ask("Education entries (comma separated)")),
		projects: lines(await ask("Projects (comma separated)")),
		certifications: lines(await ask("Certifications (comma separated)")),
	};
	const verification = await request("/api/careercraft/verifications", {
		method: "POST",
		body: JSON.stringify({ email: resume.email }),
	});
	const code = await ask("Enter the six-digit code sent to your email", true);
	await request(`/api/careercraft/verifications/${verification.id}`, {
		method: "POST",
		body: JSON.stringify({ code }),
	});
	const session = await request("/api/careercraft/template-sessions", { method: "POST" });
	const gallery = `${defaultServer}/career-craft/templates/${session.id}`;
	console.log(`\nOpen this link and choose a template:\n${gallery}\n`);
	let template: string | null = null;
	while (!template) {
		await new Promise((resolve) => setTimeout(resolve, 2000));
		template = (await request(`/api/careercraft/template-sessions/${session.id}`)).template;
	}
	const result = await request("/api/careercraft/generate", {
		method: "POST",
		body: JSON.stringify({ id: verification.id, input: resume, template }),
	});
	console.log(`\nYour ${result.filename} has been emailed. The secure download link expires in 24 hours.\n`);
}
main()
	.catch((error) => {
		console.error(`CareerCraft failed: ${error instanceof Error ? error.message : "Unknown error"}`);
		process.exitCode = 1;
	})
	.finally(() => rl.close());
