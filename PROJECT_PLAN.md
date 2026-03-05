# Universal Developer Toolbox - Project Plan

## Vision
A comprehensive, beautifully designed mobile application that puts 20+ essential developer tools in one place. Available on iOS (App Store) and Android (Play Store) with a consistent, professional experience.

## Tech Stack
- **Framework**: React Native + Expo SDK 52 (managed workflow)
- **Language**: TypeScript (strict mode)
- **Navigation**: Expo Router (file-based routing)
- **State Management**: Zustand (lightweight, performant)
- **Storage**: AsyncStorage (favorites, history, settings)
- **UI**: Custom component library with dark/light theme
- **Animations**: React Native Reanimated 3
- **Icons**: @expo/vector-icons (MaterialCommunityIcons)

## Architecture

```
src/
  app/                    # Expo Router file-based routes
    (tabs)/               # Tab navigator
      index.tsx           # Home (tool grid)
      favorites.tsx       # Favorites tab
      history.tsx         # History tab
      settings.tsx        # Settings tab
    tool/                 # Individual tool screens
      jwt-decoder.tsx
      api-tester.tsx
      json-formatter.tsx
      ...
  components/
    ui/                   # Base UI components
      Button.tsx
      Card.tsx
      Input.tsx
      CodeEditor.tsx
      SegmentedControl.tsx
      CopyButton.tsx
      ToolHeader.tsx
    layout/
      ToolContainer.tsx   # Standard tool layout wrapper
      SearchBar.tsx
  hooks/
    useTheme.ts
    useClipboard.ts
    useHistory.ts
    useFavorites.ts
  stores/
    themeStore.ts
    historyStore.ts
    favoritesStore.ts
  utils/
    tools.ts              # Tool registry & metadata
    jwt.ts
    hash.ts
    sql.ts
    ...
  constants/
    colors.ts
    tools.ts              # Tool definitions, icons, categories
    httpStatusCodes.ts
  types/
    index.ts
```

## Tools (20+ Total)

### Encoding/Decoding
1. **JWT Decoder/Encoder** - Decode, verify, and create JWT tokens
2. **Base64 Encoder/Decoder** - Encode/decode Base64 strings and files
3. **URL Encoder/Decoder** - Encode/decode URL components

### Formatting
4. **JSON Formatter/Validator** - Format, validate, minify JSON with tree view
5. **SQL Formatter** - Format and beautify SQL queries
6. **HTML/CSS/JS Beautifier** - Beautify and minify web code

### Testing
7. **API Tester** - Send HTTP requests (GET/POST/PUT/DELETE) with headers/body
8. **Webhook Tester** - Generate webhook URLs and inspect payloads
9. **Regex Tester** - Test regex patterns with real-time matching

### Generators
10. **UUID Generator** - Generate UUID v4 with batch support
11. **Hash Generator** - MD5, SHA-1, SHA-256, SHA-512 hashing
12. **Lorem Ipsum Generator** - Generate placeholder text (words/sentences/paragraphs)
13. **QR Code Generator** - Generate QR codes from text/URLs

### Converters
14. **Color Converter** - Convert between HEX, RGB, HSL with visual picker
15. **Unix Timestamp Converter** - Convert between Unix timestamps and dates
16. **Number Base Converter** - Convert between decimal, hex, octal, binary

### Reference & Analysis
17. **HTTP Status Codes** - Searchable reference with descriptions
18. **Cron Expression Parser** - Parse and build cron expressions with human-readable output
19. **Markdown Preview** - Live markdown rendering
20. **Diff Checker** - Compare two texts and highlight differences

## Features

### Core UX
- Dark/Light theme with system detection
- Tool search with fuzzy matching
- Favorites system (pin frequently used tools)
- History tracking (recent inputs/outputs per tool)
- Copy to clipboard with haptic feedback
- Share output via system share sheet
- Category-based organization on home screen

### Design Principles
- Clean, minimal interface
- Consistent tool layout (input -> action -> output)
- Syntax-highlighted code display
- Responsive for all screen sizes
- Smooth animations and transitions
- Accessible (proper labels, contrast ratios)

### Monetization Potential
- Free tier: All tools, basic features
- Pro tier: Ad-free, cloud sync, custom themes, export history
- (AdMob integration ready but not intrusive)

## Color Palette

### Dark Theme
- Background: #0D1117
- Surface: #161B22
- Card: #1C2333
- Primary: #58A6FF
- Secondary: #3FB950
- Accent: #F78166
- Text: #E6EDF3
- TextSecondary: #8B949E

### Light Theme
- Background: #FFFFFF
- Surface: #F6F8FA
- Card: #FFFFFF
- Primary: #0969DA
- Secondary: #1A7F37
- Accent: #CF222E
- Text: #1F2328
- TextSecondary: #656D76

## Screens

### Home Screen
- Search bar at top
- Category chips (horizontal scroll)
- Tool grid (2 columns) with icon, name, description
- Recent tools section

### Tool Screen (Standard Layout)
- Header with tool name and info button
- Input area (TextInput or CodeEditor)
- Action button(s)
- Output area with copy/share buttons
- History drawer (slide up)

### Settings Screen
- Theme toggle (System/Dark/Light)
- Default copy behavior
- Clear history
- Clear favorites
- About / Rate app / Share app
- Version info
