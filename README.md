# Fetchlab

A mobile API testing app built with React Native and Expo. You can organize endpoints into collections, send requests, inspect responses, monitor uptime and use a large set of developer tools from your phone. Plans and purchases are handled through Supabase and RevenueCat.

The marketing site and web dashboard live in the separate [api-management-website](https://github.com/Burqk1/api-management-website) repo. It reads and writes the same Supabase sync data.

> Naming: the product is called Fetchlab. Some config still carries older names: the package name is `dev-toolbox`, the Expo app name is "API Manager", and the bundle ID and URL scheme are `com.devtoolbox.app` and `devtoolbox`.

---

## Features

The app has 5 tabs (Dashboard, APIs, Monitor, Tools, Settings) and about 90 screens under `src/app/`. Many of the tools are fully working. Some are interface-only or simulated; those are listed in the [Status](#status-of-individual-tools) section.

### Core requests
- **REST client**: method, headers, query params, body and auth (Bearer, Basic, API key, OAuth2)
- **Collections and environments**: group endpoints, switch between variable sets
- **History and call logs**: per-request log detail screen (`log/[id]`)
- **Collection runner**: `runner/[collectionId]`
- **Pre/post request scripts**: Postman-style `pm.environment`, `pm.test` and `pm.expect` helpers (`src/utils/scriptEngine.ts`). Scripts run through `new Function` with globals like `fetch`, `eval` and `process` blocked.
- **Assertions, request chaining, data-driven runs, contract testing, response diff and visual diff**

### Other protocols
- **GraphQL**: explorer, plus subscriptions over `graphql-ws` WebSocket or SSE
- **WebSocket** client
- **SSE**: reads a streaming `fetch` body
- **MQTT** over WebSocket (`mqtt` subprotocol)
- **SOAP** over HTTP
- **gRPC-Web**: sends `application/grpc-web+proto` requests through `fetch`, so it needs a gRPC-Web-capable server or proxy. Native gRPC is not supported.

### Import / export and code generation
- Import from Postman, Insomnia, OpenAPI, cURL and HAR
- Export to Postman collection and OpenAPI (`src/utils/exportFormats.ts`)
- Code snippets for cURL, JavaScript, Python, Swift, Kotlin, Go, PHP, C#, Ruby, Dart, Java and Rust (`src/utils/codeGen.ts`)
- API docs generation, OpenAPI validation and JSONPath queries

### Testing and performance
- Load testing (concurrent users capped per plan), benchmark, waterfall timing view and trend analytics
- Test reports (`src/utils/testReport.ts`)
- **Security scan**: a set of header-based checks against a URL (HTTPS, security headers, CORS, auth, `Server`/`X-Powered-By` leaks, cookie flags, rate-limit headers, Content-Type)

### Monitoring
- **Monitor tab**: health checks, with an optional auto-check interval that runs while the app is open
- Local notifications through `expo-notifications` when a check fails
- Cloud monitor and scheduled runs screens use in-app timers (`setInterval`). Nothing runs in the background or on a server.

### AI analysis
- Sends a request/response context to the Anthropic Messages API (`https://api.anthropic.com/v1/messages`) to analyze an error, suggest a fix, explain a response, write docs, suggest optimizations, or answer a custom question
- **The user supplies their own Anthropic API key.** The app looks for a saved API key whose service or name contains "anthropic" or "claude".
- `src/stores/costGuardStore.ts` picks the model by prompt type (Claude Haiku 4.5 or Claude Sonnet 4), caches answers for 24 hours (up to 50 entries) and enforces a daily request limit per plan
- AI type generation screen (`aitypegen`)

### Security and storage
- App lock screen with biometrics (`expo-local-authentication`) and a PIN fallback
- Saved API keys are stored with `expo-secure-store`. Other app data goes to AsyncStorage.

### Accounts, plans and sync
- Supabase auth. The user's plan is mirrored in a `profiles` table.
- In-app purchases through RevenueCat (`react-native-purchases`). The `pro` and `team` entitlements map to plans.
- **Cloud sync** (Pro/Team): pushes and pulls collections, endpoints, logs, environments, monitor checks, API keys and settings to a Supabase `user_data` table. The payload goes through `src/utils/encryption.ts`, which by its own comment is "a lightweight obfuscation layer": a XOR with a key derived from the user ID, plus Base64. It is not real encryption.
- Route guard (`src/hooks/useRouteGuard.ts`) sends users without the required plan to the paywall
- English and Turkish UI (`src/constants/translations.ts`), plus light and dark themes

### Status of individual tools

Several screens exist mostly as UI, or simulate their result:

| Screen | Current behavior |
|---|---|
| Git Sync | Push and pull are simulated with a delay. Nothing reaches GitHub or GitLab. |
| Interceptor / Proxy | The intercept is simulated |
| Certificate Pinning | `fetch` exposes no TLS info, so certificate details are simulated |
| Variable Encryption | Uses XOR-based "encryption" (marked as a demo in code), not AES |
| QR Share | Draws a hash-based pattern that looks like a QR code. It is not a scannable QR code. |
| Camera Scan / Scan & Detect | Clipboard-based. No camera library is installed. |
| iOS Widget, Watch Companion, Share Extension | Configuration screens only. There are no native widget, watchOS or share extension targets. |
| Team Sync / Workspaces | Local UI state. No real-time backend. |
| Mock Server | Routes are defined and stored on the device (`mockStore`). No HTTP server is started. |

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Framework | React Native 0.81, Expo SDK 54, React 19.1 |
| Language | TypeScript 5.9 |
| Navigation | Expo Router 6 (file-based, typed routes) |
| State | Zustand 5 |
| Storage | AsyncStorage, Expo SecureStore |
| Auth / backend | Supabase (`@supabase/supabase-js`) |
| Payments | RevenueCat (`react-native-purchases`) |
| AI | Anthropic Messages API (user-provided key) |
| Native modules | expo-haptics, expo-notifications, expo-local-authentication, expo-clipboard, expo-document-picker, @react-native-community/netinfo |
| Animation | react-native-reanimated 4 |
| Icons | @expo/vector-icons (MaterialCommunityIcons) |

---

## Project structure

```
src/
├── app/                      # Expo Router screens
│   ├── _layout.tsx           # root stack, store init, plan guard
│   ├── (tabs)/               # index (Dashboard), apis, monitor, tools, settings
│   ├── endpoint/[id].tsx     # endpoint editor + request sender
│   ├── endpoint/new.tsx
│   ├── collection/new.tsx
│   ├── runner/[collectionId].tsx
│   ├── log/[id].tsx
│   ├── paywall.tsx, auth.tsx, onboarding.tsx, lockscreen.tsx
│   └── ...                   # one file per tool (graphqlexplorer, websocket, loadtest, ...)
├── components/               # JsonHighlight, SwipeableRow, layout/, ui/
├── constants/                # colors, translations (en/tr)
├── hooks/                    # useTheme, useRouteGuard
├── lib/                      # supabase.ts, revenueCat.ts
├── stores/                   # Zustand stores (api, auth, subscription, costGuard, sync, monitor, mock, ...)
├── types/                    # api.ts
└── utils/                    # codeGen, curl, harParser, exportFormats, scriptEngine, encryption, ...
```

`PROJECT_PLAN.md` is an early plan for the project's previous form, a general "Universal Developer Toolbox". It no longer matches the current structure.

---

## Getting started

### Prerequisites

- Node.js (a version supported by Expo SDK 54)
- npm
- For devices: Expo Go, or a development build. `react-native-purchases` is a native module, so in-app purchases need a development build and do not work in Expo Go.
- Xcode / iOS Simulator or Android Studio / emulator, if you want to run on a simulator

### Installation

```bash
git clone https://github.com/Burqk1/Api-Management.git
cd Api-Management
npm install
```

### Environment variables

Create a `.env` file in the project root. It is listed in `.gitignore`. Expo exposes `EXPO_PUBLIC_*` variables to the app.

```env
EXPO_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
EXPO_PUBLIC_REVENUECAT_APPLE_KEY=<your-revenuecat-apple-api-key>
```

The Supabase project needs a `profiles` table (`id`, `plan`) and a `user_data` table, one row per `user_id`, with columns `collections`, `endpoints`, `call_logs`, `environments`, `monitor_checks`, `api_keys`, `settings` and `updated_at`. The repo has no schema or migrations.

RevenueCat is set up with an Apple key only. The paywall expects packages `pro_monthly`, `pro_yearly`, `team_monthly` and `team_yearly`, and entitlements `pro` and `team`.

### Running

```bash
npm start          # expo start
npm run ios        # expo start --ios
npm run android    # expo start --android
npm run web        # expo start --web (native modules limit what works here)
```

---

## Plans

The limits come from `src/stores/subscriptionStore.ts` and `src/stores/costGuardStore.ts`. The prices are the paywall's fallback values. Real prices come from RevenueCat offerings.

| | Free | Pro | Team |
|---|---|---|---|
| Price (fallback) | $0 | $9.99/mo or $95.99/yr | $19.99/mo or $191.99/yr |
| Collections | 3 | Unlimited | Unlimited |
| Endpoints per collection | 20 | Unlimited | Unlimited |
| Requests per day | 50 | Unlimited | Unlimited |
| Stored call logs | 100 | 5,000 | 20,000 |
| Log retention | 7 days | 90 days | 365 days |
| AI requests per day | - | 10 | 30 |
| Load test max users | 5 | 100 | 500 |
| Mock server routes | 3 | Unlimited | Unlimited |
| Cloud sync | - | Yes | Yes |
| Request chaining / advanced tools | - | Yes | Yes |
| Team sharing | - | - | Yes |

---

## License

No license is specified.
