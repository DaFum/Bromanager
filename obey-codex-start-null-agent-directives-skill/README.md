# Brothel Manager Simulation (Web + Pollinations)

This repository includes a browser frontend deployable to GitHub Pages.

Visual direction: editorial luxury dashboard with clear, colorful photorealistic scene rendering.

## Web game features
- Staff management dashboard (morale/trust/stress).
- Role-authentic worker roster (operations supervisor, hospitality mixologist, security lead, client-relations concierge, private-suite steward, housekeeping & hygiene lead).
- Character descriptions for every team member.
- Persistent per-character memory logs that update after interactions and day progression.
- Employee conversation flow with memory-aware scene generation.
- Applicant assessment flow with generated scenes and image prompts.
- Security camera system with camera zapping + low-FPS generated frame streaming.
- Day progression economy updates.
- Dynamic scene generation for every action using Pollinations JSON text output:
  - `scene_text`
  - `image_prompt`
- Static prompt directives are integrated in every generation path and merged with dynamic context.
- Prompt rules enforce role-accurate depictions, strict in-world roleplay narration, and scene-intent fidelity in both narration and generated image prompts.
- Dynamic image URL generation for all scenes and camera frames via Pollinations image endpoint.
- Image prompts are tuned for a clear colorful photorealistic visual style (no noir styling).

## Pollinations integration
Text endpoint:
- `POST https://gen.pollinations.ai/v1/chat/completions`
- Uses `response_format: {"type":"json_object"}`

Image endpoint:
- `GET https://gen.pollinations.ai/image/{prompt}?model=...`

You can enter an API key in the UI (optional). If calls fail, the game falls back to local scene/prompt generation.

## Run locally
Open `index.html` directly in your browser, or serve the folder with a static server.

## GitHub Pages
A workflow is included at `.github/workflows/pages.yml` to deploy the static site.
- Push to `main`, `master`, or `work` branch to trigger deployment.
- Ensure Pages is enabled in repository settings with **GitHub Actions** as the source.
