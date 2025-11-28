# AI English Lecture (只想看小说)

Professional tool for generating English learning materials from novels, featuring vocabulary grading, AI translation, and PDF export.

## Features
- **Smart Vocabulary Grading**: Analyzes text against Levels 1-6 (CEFR/Local standards).
- **AI Translation**: Full chapter translation using Gemini or OpenAI models.
- **Note Generation**: Automatically creates vocabulary notes with definitions and context meanings.
- **PDF Export**: Generates printable study sheets (A4 format).

## Setup & Deployment

This project uses **Vite** + **React**.

### Local Development
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start dev server:
   ```bash
   npm run dev
   ```

### Deployment to GitHub Pages
This repository is configured with GitHub Actions.

1. Go to your repository **Settings** > **Pages**.
2. Under "Build and deployment", set **Source** to **GitHub Actions**.
3. Push your code to the `main` branch.
4. The Action will automatically build and deploy the app.
