# Mel Character Demo

This project showcases a demo featuring the animated character **Mel**, including support for UI and API testing with Playwright, and public exposure through a Cloudflare Tunnel.

---

## 📦 Installation

```bash

# Install dependencies

npm  install

```

---

## 🚀 Usage

This project supports local development and testing, including Cloudflare-based tunneling and automated tests with Playwright.

---

### 🧪 Testing with Playwright

### ⚠️ OpenAI Transcription API Limit

OpenAI's transcription API **only supports one active request at a time**. To prevent concurrency issues, make sure to:

-   **Limit Playwright workers to `1`** (already configured in Playwright settings).
-   **Start the development server before running API tests**.

---

### ▶️ Step-by-Step Commands

#### 🛠 Optional: Build the project

```bash
npm run build
```

#### 🚀 Start the development server

Choose one:

**Using a [Cloudflare tunnel](#using-cloudflare-tunnel):**

```bash
npm run dev:tunnel
```

**Or running locally:**

```bash
npm run dev
```

#### 🧪 Run API tests in watch mode

```bash
npm run test:api
```

> 🔁 API tests run across multiple browsers. Note: Firefox and mobile devices had\* known issues with audio file compatibility.

#### UI Testing

> No API calls are made during UI testing, so worker count can be more lenient. 
> TBD

```bash

# Run UI tests in watch mode

npm  run  test:ui

```

---

## 🌐 Configuration

### Using Cloudflare Tunnel

To expose your local server through Cloudflare Tunnel:

1. [Create a Cloudflare Tunnel](https://developers.cloudflare.com/learning-paths/clientless-access/connect-private-applications/create-tunnel/)

2. Update your `package.json` script with the tunnel ID:

```json

"dev:webhook": "cloudflared tunnel run [your-tunnel-id]"

```

3. Start the tunnel and development server:

```bash

npm  run  dev:tunnel

```

Your site will now be accessible on both `localhost` and the Cloudflare tunnel URL.

---

### 🎤 OpenAI Prompt Configuration

Prompt configuration for Mel is located in `/lib/constants.ts` and includes the following fields:

-   `personality`: Personality traits of Mel

-   `backStory`: Background context

-   `responseLanguage`: Desired output language

-   `responseLanguageInstruction`: Reinforces the language use

-   `openaiModel`: [OpenAI chat model](https://platform.openai.com/docs/models)

-   `ttsModel`: [Text-to-speech model](https://platform.openai.com/docs/models#tts)

-   `ttsVoice`: [Voice options](https://platform.openai.com/docs/guides/text-to-speech#voice-options)

-   `systemContent` and `testSystemPrompt`: Used to control system-level behavior

Additionally:

-   `MIN_ENERGY_THRESHOLD` is configured to ignore accidental or silent inputs. Adjust this threshold as needed.

---

## ✅ Summary

-   Mel demo project with animated SVG morphing

-   Supports UI/API testing via Playwright

-   Uses Cloudflare Tunnel for public access during development

-   Prompt and voice configurations are centralized in `constants.ts`
