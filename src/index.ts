#!/usr/bin/env node
import { stdin as input, stdout as output } from "node:process";
import { emitKeypressEvents } from "node:readline";
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
const fallbackChoose = async (label: string, options: string[]) => {
  output.write("\n" + label + "\n");
  options.forEach((option, index) => output.write("  " + (index + 1) + ". " + option + "\n"));
  const value = Number((await rl.question("Choose a number: ")).trim());
  return options[Number.isInteger(value) && value >= 1 && value <= options.length ? value - 1 : 0];
};
const choose = async (label: string, options: string[]) => {
  if (!input.isTTY || !output.isTTY) return fallbackChoose(label, options);
  emitKeypressEvents(input);
  const stream = input as typeof input & { setRawMode?: (mode: boolean) => void };
  return new Promise<string>((resolve) => {
    let cursor = 0;
    const render = () => { output.write("\u001b[2J\u001b[H" + label + "\n\n" + options.map((option, index) => (index === cursor ? "❯ " : "  ") + option).join("\n") + "\n\nUse Up/Down and Enter."); };
    const finish = (value: string) => { input.off("keypress", onKey); stream.setRawMode?.(false); output.write("\n"); resolve(value); };
    const onKey = (_: string, key: { name?: string }) => { if (key.name === "up") cursor = (cursor + options.length - 1) % options.length; else if (key.name === "down") cursor = (cursor + 1) % options.length; else if (key.name === "return" || key.name === "escape") return finish(options[cursor]); else return; render(); };
    input.on("keypress", onKey); stream.setRawMode?.(true); render();
  });
};
const chooseMany = async (label: string, options: string[]) => {
  if (!input.isTTY || !output.isTTY) return lines(await ask(label + " (comma separated)"));
  emitKeypressEvents(input);
  const stream = input as typeof input & { setRawMode?: (mode: boolean) => void };
  return new Promise<string[]>((resolve) => {
    let cursor = 0; const selected = new Set<number>();
    const render = () => { output.write("\u001b[2J\u001b[H" + label + "\n\n" + options.map((option, index) => (index === cursor ? "❯ " : "  ") + (selected.has(index) ? "[x] " : "[ ] ") + option).join("\n") + "\n\nUse Up/Down, Space, Enter."); };
    const finish = () => { input.off("keypress", onKey); stream.setRawMode?.(false); output.write("\n"); resolve([...selected].sort((a, b) => a - b).map((index) => options[index])); };
    const onKey = (_: string, key: { name?: string }) => { if (key.name === "up") cursor = (cursor + options.length - 1) % options.length; else if (key.name === "down") cursor = (cursor + 1) % options.length; else if (key.name === "space") selected.has(cursor) ? selected.delete(cursor) : selected.add(cursor); else if (key.name === "return") return finish(); else return; render(); };
    input.on("keypress", onKey); stream.setRawMode?.(true); render();
  });
};
async function collectExperience() { const count = Number((await rl.question("How many experience entries? (0 if none): ")).trim()) || 0; const entries: Array<{ company: string; position: string; location: string; period: string; description: string; bullets: string[] }> = []; for (let i = 0; i < count; i++) { output.write("\nExperience " + (i + 1) + "\n"); entries.push({ company: await ask("Company", true), position: await ask("Job title", true), location: await ask("Location"), period: await ask("Dates (for example 2022 - Present)"), description: await ask("What did you work on?"), bullets: lines(await ask("Achievements (comma separated)")) }); } return entries; }
async function collectEducation() { const count = Number((await rl.question("How many education entries? (0 if none): ")).trim()) || 0; const entries: Array<{ school: string; degree: string; area: string; location: string; period: string; description: string }> = []; for (let i = 0; i < count; i++) { output.write("\nEducation " + (i + 1) + "\n"); entries.push({ school: await ask("School", true), degree: await ask("Degree"), area: await ask("Field of study"), location: await ask("Location"), period: await ask("Dates"), description: await ask("Academic achievement (optional)") }); } return entries; }
async function selectGithubProjects(username: string) {
  if (!username) return [];
  const repos = await request("/api/careercraft/github/repos?username=" + encodeURIComponent(username));
  if (!Array.isArray(repos) || repos.length === 0) { output.write("No public repositories found." + "\n"); return []; }
  output.write("\nGitHub repositories (select numbers):\n");
  repos.forEach((repo: any, index: number) => {
    const language = repo.language || repo.technologies?.[0] || "Other";
    output.write(String(index + 1).padStart(2, " ") + ") " + repo.name + " [" + language + "]\n");
  });
  output.write("\nEnter numbers separated by commas (example: 1, 3, 5). Press Enter to skip.\n");
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
	const selectedProjects = await selectGithubProjects(githubUsername);
resume.projects = selectedProjects;
const languages = lines(await ask("Programming languages (comma separated)"));
const tools = lines(await ask("IDEs and developer tools (comma separated)"));
const platforms = lines(await ask("Platforms, cloud, databases, and frameworks (comma separated)"));
const keywords = lines(await ask("Important job keywords for this target role (comma separated)"));
resume.skills = Array.from(new Set([...resume.skills, ...languages, ...tools, ...platforms, ...keywords, ...selectedProjects.flatMap((project) => project.technologies)]));
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
