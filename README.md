# Fetchlab

**The most powerful mobile-first API development & testing platform.**

Built with React Native + Expo, Fetchlab brings the full power of desktop API tools like Postman — and then some — right to your phone.

![React Native](https://img.shields.io/badge/React_Native-0.81-61DAFB?logo=react)
![Expo](https://img.shields.io/badge/Expo_SDK-54-000020?logo=expo)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)
![License](https://img.shields.io/badge/License-MIT-green)
![Platform](https://img.shields.io/badge/Platform-iOS%20%7C%20Android-lightgrey)

---

## Why Fetchlab?

Every API tool out there is desktop-only. Fetchlab is the **first mobile-native API platform** that doesn't compromise on features. Debug a production issue from bed, test an endpoint on the bus, share a collection via QR at a coffee shop.

**No desktop required. No browser tabs. Just your phone.**

---

## Features

### Core API Testing
- **REST Client** — Full HTTP method support with headers, body, auth, query params
- **GraphQL Explorer** — Schema introspection, query builder, visual response viewer
- **WebSocket** — Real-time bidirectional messaging with message history
- **gRPC** — Protocol buffer support with streaming
- **MQTT** — IoT protocol testing with topic subscription
- **SOAP** — XML-based web service testing
- **SSE** — Server-Sent Events listener

### AI-Powered Analysis
- **Claude AI Integration** — Error analysis, fix suggestions, docs generation, optimization tips
- **Smart Model Selection** — Automatically picks cost-efficient model per query type
- **Response Caching** — Identical queries served from cache, saving API costs
- **Daily Rate Limiting** — Built-in cost protection per plan tier

### Testing & Automation
- **Collection Runner** — Run entire collections sequentially or in parallel
- **Request Chaining** — Pass response data between requests automatically
- **Data-Driven Testing** — Run endpoints with CSV/JSON datasets
- **Contract Testing** — Validate responses against expected schemas
- **Load Testing** — Simulate concurrent users with configurable ramp-up
- **Scheduled Runs** — Cron-based automated test execution
- **Test Reports** — Exportable HTML/JSON test result reports

### Monitoring & Analytics
- **Cloud Monitor** — Uptime monitoring with configurable intervals and alerts
- **Trend Analytics** — Response time trends, error rate tracking, performance graphs
- **Response Diff** — Compare two API responses side by side
- **Visual Diff** — Highlighted JSON diff viewer
- **Waterfall Chart** — Request timing breakdown visualization

### Security
- **Security Scanner** — OWASP-based API vulnerability detection
- **Certificate Pinning** — SSL/TLS certificate validation
- **Rate Limit Simulator** — Test API rate limiting behavior
- **Variable Encryption** — AES-encrypted sensitive variables
- **Lock Screen** — App-level PIN/biometric protection

### Developer Tools
- **Mock Server** — Create fake API endpoints for frontend development
- **Code Snippets** — Auto-generate code in 10+ languages (cURL, Python, JS, Go, etc.)
- **OpenAPI Validator** — Validate collections against OpenAPI/Swagger specs
- **JSON Path Query** — Query JSON responses with JSONPath expressions
- **Dynamic Variables** — Built-in generators (UUID, timestamp, random data, Faker)
- **Interceptor/Proxy** — Inspect and modify requests in flight
- **Response Transformer** — JMESPath/JSONPath response transformation

### Mobile-First Features
- **cURL Import & Run** — Paste any cURL command, parse, execute, save
- **QR Collection Sharing** — Share entire collections via QR code
- **Scan & Detect** — Auto-detect API keys, JWT tokens, URLs from clipboard
- **Quick Actions** — One-tap GET requests, Base64/URL encode, JWT decode, UUID gen
- **Haptic Feedback** — Native tactile feedback on interactions

### Collaboration
- **Team Workspaces** — Shared collections with role-based access
- **Git Sync** — Sync collections to GitHub/GitLab repositories
- **Team Sync** — Real-time collaboration on shared endpoints
- **Changelog** — Track all changes across collections

### Organization
- **Collections** — Organize endpoints into logical groups
- **Environments** — Switch between dev/staging/prod with variable sets
- **Search** — Full-text search across all endpoints and collections
- **Bulk Operations** — Mass edit headers, URLs, methods across endpoints
- **Import/Export** — Postman, Insomnia, OpenAPI, HAR file support
- **Endpoint History** — Version tracking with rollback support
- **Annotations** — Add notes and tags to any endpoint

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React Native 0.81 + Expo SDK 54 |
| Language | TypeScript 5.9 |
| Navigation | Expo Router (file-based) |
| State Management | Zustand |
| Storage | AsyncStorage |
| Auth | Supabase |
| AI | Claude API (Anthropic) |
| Icons | MaterialCommunityIcons |
| Haptics | expo-haptics |
| Notifications | expo-notifications |

---

## Project Structure

```
src/
├── app/                    # Screens (file-based routing)
│   ├── (tabs)/             # Tab navigation
│   │   ├── index.tsx       # Dashboard
│   │   ├── apis.tsx        # Collections & Endpoints
│   │   ├── tools.tsx       # Developer Tools
│   │   ├── monitor.tsx     # API Monitoring
│   │   └── settings.tsx    # Settings & Usage
│   ├── endpoint/[id].tsx   # Endpoint detail & testing
│   ├── aianalysis.tsx      # AI-powered analysis
│   ├── graphqlexplorer.tsx # GraphQL IDE
│   ├── websocket.tsx       # WebSocket client
│   ├── loadtest.tsx        # Load testing
│   ├── mockserver.tsx      # Mock server
│   └── ...                 # 60+ screens
├── components/             # Reusable UI components
├── constants/              # Theme colors, translations
├── hooks/                  # Custom hooks (useTheme, etc.)
├── stores/                 # Zustand state stores
│   ├── apiStore.ts         # Core API data
│   ├── authStore.ts        # Authentication
│   ├── costGuardStore.ts   # AI cost protection
│   ├── subscriptionStore.ts # Plan & feature gates
│   └── ...
├── types/                  # TypeScript type definitions
└── utils/                  # Helpers (code gen, export, haptics)
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Mac) or Android Emulator

### Installation

```bash
# Clone the repository
git clone https://github.com/Burqk1/fetchlab.git
cd fetchlab

# Install dependencies
npm install

# Start the dev server
npx expo start
```

### Running on Device

```bash
# iOS
npx expo start --ios

# Android
npx expo start --android

# Web (limited support)
npx expo start --web
```

---

## Pricing

| | Free | Pro | Team |
|---|---|---|---|
| **Price** | $0 | $4.99/mo | $8.99/user/mo |
| Collections | 3 | Unlimited | Unlimited |
| Endpoints/Collection | 20 | Unlimited | Unlimited |
| Daily Requests | 50 | Unlimited | Unlimited |
| AI Analysis | - | 10/day | 30/day |
| Cloud Sync | - | Yes | Yes |
| Team Sharing | - | - | Yes |
| Load Test Users | 5 | 100 | 500 |
| Log Retention | 7 days | 90 days | 365 days |

---

## Roadmap

- [ ] iOS Widget for API status monitoring
- [ ] Share Extension (import from browser)
- [ ] Apple Watch companion app
- [ ] Offline-first with background sync
- [ ] Plugin marketplace
- [ ] CI/CD integrations (GitHub Actions, GitLab CI)

---

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting a PR.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  <strong>Fetchlab</strong> — API testing, reimagined for mobile.
</p>
