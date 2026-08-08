# Career Crafter CLI

Create a professional resume from your terminal with a guided questionnaire, browser template selection, Azure/OpenAI-powered polishing on the hosted server, PDF generation, and email delivery.

## Quick start

Requirements:

- Node.js 20 or newer
- A running Career Crafter / Reactive Resume server with the CareerCraft API enabled
- SMTP configured on that server for verification codes and PDF delivery

Run without installing permanently:

```bash
CAREERCRAFT_API_URL=https://your-resume-server.example.com npx @careercraft/cli create
```

Windows PowerShell:

```powershell
$env:CAREERCRAFT_API_URL = "https://your-resume-server.example.com"
npx @careercraft/cli create
```

The CLI asks questions first, verifies the email address, opens a template-selection link, waits for the selected template, and submits the completed résumé for PDF generation.

## What it asks

- Full name and email
- Target role or headline
- Phone, location, and website
- Professional summary
- Skills
- Experience
- Education
- Projects
- Certifications

It intentionally does not ask for age or date of birth.

## Development

```bash
npm install
npm run typecheck
npm run build
node dist/index.mjs create
```

Set `CAREERCRAFT_API_URL` when testing against a local server:

```bash
CAREERCRAFT_API_URL=http://localhost:3000 node dist/index.mjs create
```

## Publishing

```bash
npm login
npm publish --access public
```

Then users can run:

```bash
npx @careercraft/cli create
```

## Security and privacy

The CLI does not contain Azure keys, SMTP credentials, or database credentials. Personal data is sent only to the configured CareerCraft server. Configure HTTPS in production and keep API keys on the server.

## License

MIT
