#!/usr/bin/env node
import { stdin as input, stdout as output } from "node:process";
import { createInterface } from "node:readline/promises";

// GitHub repository selection is added by the server endpoint.
const defaultServer = process.env.CAREERCRAFT_API_URL ?? "https://careercraft-api.gentlesmoke-3e37c905.centralindia.azurecontainerapps.io";
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
const choose = async (label: string, options: string[]) => {
 output.write(`\n${label}\n`);
 options.forEach((option, index) => output.write(`  ${index + 1}. ${option}\n`));
 while (true) {
  const value = Number((await rl.question("Choose a number: ")).trim());
  if (Number.isInteger(value) && value >= 1 && value <= options.length) return options[value - 1];
  output.write(`Please choose a number from 1 to ${options.length}.\n`);
 }
};
const chooseMany = async (label: string, options: string[]) => {
 output.write(`\n${label}\n`);
 options.forEach((option, index) => output.write(`  ${index + 1}. ${option}\n`));
 while (true) {
  const values = (await rl.question("Choose one or more numbers (comma separated), or press Enter to type your own: ")).trim();
  if (!values) return lines(await ask("Enter your own values (comma separated)"));
  const selected = values.split(",").map(Number);
  if (selected.every((value) => Number.isInteger(value) && value >= 1 && value <= options.length)) return selected.map((value) => options[value - 1]);
  output.write(`Please use numbers from 1 to ${options.length}, separated by commas.\n`);
 }
};
async function collectExperience() { const count = Number((await rl.question("How many experience entries? (0 if none): ")).trim()) || 0; const entries: Array<{ company: string; position: string; location: string; period: string; description: string; bullets: string[] }> = []; for (let i = 0; i < count; i++) { output.write("\\nExperience " + (i + 1) + "\\n"); entries.push({ company: await ask("Company", true), position: await ask("Job title", true), location: await ask("Location"), period: await ask("Dates (for example 2022 - Present)"), description: await ask("What did you work on?"), bullets: lines(await ask("Achievements (comma separated)")) }); } return entries; }
async function collectEducation() { const count = Number((await rl.question("How many education entries? (0 if none): ")).trim()) || 0; const entries: Array<{ school: string; degree: string; area: string; location: string; period: string; description: string }> = []; for (let i = 0; i < count; i++) { output.write("\\nEducation " + (i + 1) + "\\n"); entries.push({ school: await ask("School", true), degree: await ask("Degree"), area: await ask("Field of study"), location: await ask("Location"), period: await ask("Dates"), description: await ask("Academic achievement (optional)") }); } return entries; }
async function selectGithubProjects(username: string) {
  if (!username) return [];
  const repos = await request("/api/careercraft/github/repos?username=" + encodeURIComponent(username));
  if (!Array.isArray(repos) || repos.length === 0) { output.write("No public repositories found." + "\\n"); return []; }
  output.write("\\nGitHub repositories (select numbers):\\n");
  repos.forEach((repo: any, index: number) => {
    const language = repo.language ?? "Other";
    output.write(String(index + 1).padStart(2, " ") + ") " + repo.name + " [" + language + "]\\n");
  });
  output.write("\\nEnter numbers separated by commas (example: 1, 3, 5). Press Enter to skip.\\n");
  const raw = (await rl.question("Projects: ")).trim();
  if (!raw) return [];
  return raw.split(",").map(Number).filter((value) => Number.isInteger(value) && value >= 1 && value <= repos.length).map((value) => repos[value - 1]);
}
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
console.log("\nCareerCraft - create a professional resume\n");
	const resume = {
		name: await ask("Full name", true),
		email: await ask("Email address", true),
		headline: await choose("What role are you targeting?", ["Software Engineer", "Product Manager", "Data Analyst", "Marketing Specialist", "Designer", "Student / Entry level", "Other (type your own)"]).then(async (value) => value.startsWith("Other") ? ask("Target role / headline", true) : value),
		phone: await ask("Phone number"),
		location: await ask("Location"),
		website: await ask("Website or LinkedIn URL"),
		summary: await choose("What kind of professional bio should AI write?", ["Concise and professional", "Achievement-focused", "Career changer", "Student / entry-level", "I will write my own bio"]).then(async (value) => value.startsWith("I will") ? ask("Professional summary", true) : `Write a ${value.toLowerCase()} professional summary.`),
		skills: await chooseMany("Select your strongest skills (you can add your own)", ["Leadership", "Communication", "Problem solving", "Project management", "JavaScript / TypeScript", "Python", "Data analysis", "Customer service"]),
		experience: await collectExperience(),
		education: await collectEducation(),
		projects: [] as Array<{ name: string; url: string; description: string; technologies: string[] }>,
		certifications: lines(await ask("Certifications (comma separated)")),
	};
	const githubUsername = await ask("Public GitHub username (optional)");
	resume.projects = await selectGithubProjects(githubUsername);
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
