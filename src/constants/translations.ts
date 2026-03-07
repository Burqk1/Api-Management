export type Language = 'en' | 'tr';

export const translations: Record<Language, Record<string, string>> = {
  en: {
    // Dashboard
    dashboard: 'Dashboard',
    apiManagementOverview: 'API Management Overview',
    totalCalls: 'Total Calls',
    avgResponse: 'Avg Response',
    successRate: 'Success Rate',
    today: 'Today',
    monitorStatus: 'Monitor Status',
    up: 'Up',
    down: 'Down',
    collections: 'Collections',
    endpoints: 'Endpoints',
    responseTimes: 'Response Times',
    oldest: 'Oldest',
    latest: 'Latest',
    quickActions: 'Quick Actions',
    newCollection: 'New Collection',
    newEndpoint: 'New Endpoint',
    analytics: 'Analytics',
    environments: 'Environments',
    recentActivity: 'Recent Activity',
    noApiCallsYet: 'No API calls yet. Send your first request!',
    justNow: 'Just now',
    mAgo: 'm ago',
    hAgo: 'h ago',
    noEnvironment: 'No Environment',
    vars: 'vars',
    tapToConfigure: 'Tap to configure',

    // APIs
    apis: 'APIs',
    collectionsCount: 'collections',
    endpointsCount: 'endpoints',
    noCollections: 'No Collections',
    createFirstCollection: 'Create your first API collection to get started',
    noEndpointsYet: 'No endpoints yet',
    addEndpoint: 'Add Endpoint',
    runAll: 'Run All',
    deleteCollection: 'Delete Collection',
    deleteCollectionConfirm: 'Are you sure you want to delete "{name}" and all its endpoints?',
    cancel: 'Cancel',
    delete: 'Delete',

    // Monitor
    monitor: 'Monitor',
    healthChecksUptime: 'Health checks & uptime',
    checkAll: 'Check All',
    healthy: 'Healthy',
    pending: 'Pending',
    autoHealthCheck: 'Auto Health Check',
    interval: 'Interval',
    last: 'Last',
    never: 'Never',
    noHealthChecks: 'No Health Checks',
    enableMonitoring: 'Enable monitoring from any endpoint detail screen.',
    uptime: 'Uptime',
    avg: 'Avg',
    status: 'Status',
    pings: 'Pings',
    incidents: 'Incidents',
    resolved: 'Resolved',
    ongoing: 'Ongoing',
    removeMonitor: 'Remove Monitor',
    removeHealthCheck: 'Remove this health check?',
    remove: 'Remove',

    // Settings
    settings: 'Settings',
    appearance: 'APPEARANCE',
    system: 'System',
    dark: 'Dark',
    light: 'Light',
    language: 'LANGUAGE',
    english: 'English',
    turkish: 'Turkish',
    apiKeys: 'API KEYS',
    noApiKeysStored: 'No API keys stored',
    addApiKey: 'Add API Key',
    keyName: 'Key Name',
    service: 'Service (e.g. OpenAI)',
    apiKeyValue: 'API Key Value',
    save: 'Save',
    data: 'DATA',
    clearCallLogs: 'Clear Call Logs',
    clearCallLogsConfirm: 'Are you sure? This will remove all API call history.',
    clear: 'Clear',
    about: 'ABOUT',
    version: 'Version',

    // Endpoint
    testEndpoint: 'Test Endpoint',
    send: 'Send',
    headers: 'Headers',
    body: 'Body',
    assertions: 'Assertions',
    response: 'Response',
    diff: 'Diff',
    noResponse: 'No response yet',
    sendRequest: 'Send a request to see the response',
    monitoring: 'Monitoring',
    deleteEndpoint: 'Delete Endpoint',
    deleteEndpointConfirm: 'Delete this endpoint?',

    // Collection New
    collectionName: 'COLLECTION NAME',
    description: 'DESCRIPTION',
    baseUrl: 'BASE URL',
    color: 'COLOR',
    icon: 'ICON',
    preview: 'PREVIEW',
    createCollection: 'Create Collection',

    // Endpoint New
    endpointName: 'ENDPOINT NAME',
    method: 'METHOD',
    url: 'URL',
    collection: 'COLLECTION',
    createFirstCollectionHint: 'Create a collection first from the APIs tab.',
    bodyJson: 'BODY (JSON)',
    createEndpoint: 'Create Endpoint',

    // Runner
    collectionRunner: 'Collection Runner',
    requestDelay: 'Request Delay',
    none: 'None',
    environment: 'Environment',
    delay: 'Delay',
    runAllEndpoints: 'Run All Endpoints',
    running: 'Running',
    passed: 'Passed',
    failed: 'Failed',
    totalTime: 'Total Time',
    testing: 'Testing',

    // Analytics
    timeRange: 'Time Range',
    totalRequests: 'Total Requests',
    successful: 'Successful',
    avgTime: 'Avg Time',
    p95Time: 'P95 Time',
    fastest: 'Fastest',
    dailyActivity: 'Daily Activity',
    statusCodes: 'Status Codes',
    methodBreakdown: 'Method Breakdown',
    topEndpoints: 'Top Endpoints',
    calls: 'calls',

    // Environments
    activeEnvironment: 'Active Environment',
    noActiveEnv: 'No Active Environment',
    addEnvironment: 'Add Environment',
    editEnvironment: 'Edit Environment',
    envName: 'Environment Name',
    variables: 'Variables',
    addVariable: 'Add Variable',
    key: 'Key',
    value: 'Value',
    usage: 'Usage',
    usageHint: 'Use {{VARIABLE_NAME}} in URLs, headers, and body to reference variables.',

    // Log Detail
    requestDetail: 'Request Detail',
    request: 'Request',
    responseTimeLabel: 'Response Time',
    size: 'Size',
    logNotFound: 'Log not found',
    noRequestBody: 'No request body',
    noResponseBody: 'No response body',

    // Auth
    auth: 'Auth',
    bearerTokenPlaceholder: 'Enter bearer token...',
    username: 'Username',
    password: 'Password',
    addToHeader: 'Header',
    addToQuery: 'Query Param',

    // Pre-Request Script
    preReq: 'Pre-Req',
    preReqHint: 'JavaScript runs before each request',

    // GraphQL
    graphqlQuery: 'Query',
    graphqlVariables: 'Variables',
    graphqlExplorer: 'GraphQL Explorer',
    introspect: 'Introspect',
    schemaTypes: 'Schema Types',
    queryBuilder: 'Query Builder',
    executeQuery: 'Execute Query',
    graphqlHeaders: 'Headers',
    graphqlResponse: 'Response',
    noSchema: 'No schema loaded. Enter a GraphQL endpoint and run introspection.',
    introspecting: 'Introspecting...',
    schemaLoaded: 'Schema loaded successfully',

    // Export/Import
    exported: 'Exported',
    exportedToClipboard: 'Collection JSON copied to clipboard',
    imported: 'Imported',
    collectionImported: 'Collection imported successfully',
    importCollection: 'Import Collection',
    pasteJsonHint: 'Paste the exported collection JSON below',
    error: 'Error',
    invalidJsonFormat: 'Invalid JSON format',

    // WebSocket
    websocketTesting: 'WebSocket Testing',
    wsConnected: 'Connected',
    wsDisconnected: 'Disconnected',
    wsError: 'Connection Error',
    wsStatusConnected: 'Connected',
    wsStatusConnecting: 'Connecting...',
    wsStatusDisconnected: 'Disconnected',
    wsMessages: 'messages',
    wsEmptyHint: 'Connect to a WebSocket server to start',
    wsTypePlaceholder: 'Type a message...',

    // Push Notifications
    pushNotifications: 'Push Notifications',
    pushNotificationsHint: 'Get notified when a monitored endpoint goes down',

    // cURL & Code Gen
    importCurl: 'Import cURL',
    invalidCurl: 'Invalid cURL command',
    codeGen: 'Code Gen',
    copyCode: 'Copy Code',

    // Favorites
    favorites: 'Favorites',

    // Global Search
    globalSearch: 'Search',
    searchPlaceholder: 'Search endpoints, collections, logs...',
    resultsFound: 'results found',
    noResults: 'No results found',

    // Accent Color
    accentColor: 'ACCENT COLOR',

    // Mock Server
    mockServer: 'Mock Server',
    mockServerRunning: 'Mock Server Running',
    mockServerStopped: 'Mock Server Stopped',
    activeRoutes: 'active routes',
    mockRoutes: 'Routes',
    addRoute: 'Add Route',
    noMockRoutes: 'No mock routes configured',
    removeRouteConfirm: 'Remove this mock route?',

    // Compare
    compareRequests: 'Compare Requests',
    selectLeft: 'Select Left',
    selectRight: 'Select Right',

    // Offline Queue
    offlineQueue: 'Offline Queue',
    queuedRequests: 'Queued Requests',
    processQueue: 'Process Queue',
    clearQueue: 'Clear Queue',
    noQueuedRequests: 'No queued requests',
    online: 'Online',
    offline: 'Offline',

    // Tools Hub
    tools: 'Tools',
    allToolsDesc: 'All features in one place',
    requestTools: 'Request Tools',
    analysisTools: 'Analysis Tools',
    configTools: 'Configuration',
    networkTools: 'Network',
    newCollectionDesc: 'Create a new API collection',
    newEndpointDesc: 'Add a new API endpoint',
    websocketTestingDesc: 'Test WebSocket connections',
    mockServerDesc: 'Configure mock API responses',
    analyticsDesc: 'View request statistics & charts',
    compareRequestsDesc: 'Compare two API responses side by side',
    globalSearchDesc: 'Search across all collections & logs',
    environmentsDesc: 'Manage environment variables',
    importCollectionDesc: 'Import a collection from JSON',
    offlineQueueDesc: 'Manage queued offline requests',
    templatesDesc: 'Start from pre-built API templates',

    // Templates
    templates: 'Templates',

    // Quick Send
    quickSend: 'Quick Send',
    quickSendDesc: 'Send a quick HTTP request without saving',

    // Onboarding
    onboardWelcomeTitle: 'API Developer Toolbox',
    onboardWelcomeDesc: 'Your all-in-one mobile API testing and management platform. Test, monitor, and debug APIs on the go.',
    onboardRequestTitle: 'Send Requests',
    onboardRequestDesc: 'Test any API endpoint with full control over methods, headers, body, auth, and environment variables.',
    onboardMonitorTitle: 'Monitor Uptime',
    onboardMonitorDesc: 'Set up health checks for your APIs and get notified when endpoints go down.',
    onboardAnalyticsTitle: 'Analyze Performance',
    onboardAnalyticsDesc: 'Track response times, success rates, and usage patterns with detailed analytics.',
    onboardToolsTitle: 'Power Tools',
    onboardToolsDesc: 'WebSocket testing, mock servers, request templates, code generation, cURL import/export, and more.',
    skip: 'Skip',
    next: 'Next',
    getStarted: 'Get Started',

    // Swipe hints
    duplicate: 'Duplicate',
    swipeHint: 'Swipe endpoints for quick actions',

    // Auth & Account
    signIn: 'Sign In',
    signUp: 'Sign Up',
    signOut: 'Sign Out',
    signOutConfirm: 'Are you sure you want to sign out?',
    signInSignUp: 'Sign In / Sign Up',
    welcomeBack: 'Welcome Back',
    createAccount: 'Create Account',
    authSubtitle: 'Sync your data across devices and unlock Pro features',
    fillAllFields: 'Please fill all fields',
    passwordsNoMatch: 'Passwords do not match',
    confirmPassword: 'Confirm Password',
    noAccount: "Don't have an account?",
    haveAccount: 'Already have an account?',
    whySignUp: 'Why create an account?',
    benefitSync: 'Sync collections & endpoints across all your devices',
    benefitAI: 'AI-powered API analysis and debugging',
    benefitChaining: 'Chain multiple requests with variable extraction',
    benefitTeam: 'Share workspaces with your team',
    account: 'Account',
    profile: 'Profile',

    // Cloud Sync
    cloudSync: 'Cloud Sync',
    syncNow: 'Sync Now',
    lastSync: 'Last Synced',
    autoSync: 'Auto Sync',

    // Subscription
    upgradeToPro: 'Upgrade to Pro',
    upgradeDesc: 'Unlimited requests, cloud sync, AI & more',
    goPro: 'Go Pro',
    unlockFullPower: 'Unlock Full Power',
    paywallDesc: 'Get unlimited access to all premium features',
    unlimitedRequests: 'Unlimited Requests',
    unlimitedCollections: 'Unlimited Collections',
    postmanImport: 'Postman/Insomnia/OpenAPI Import',
    month: 'month',
    perUser: 'user',
    startFreeTrial: 'Start 7-Day Free Trial',
    trialHint: 'Cancel anytime. No charge until trial ends.',
    subscriptionActivated: 'Subscription Activated',
    enjoyPro: 'Enjoy all Pro features!',

    // AI Analysis
    aiAnalysis: 'AI Analysis',
    aiAnalysisDesc: 'Analyze API responses with AI',
    context: 'Context',
    quickPrompts: 'Quick Prompts',
    analyzeError: 'Analyze Error',
    suggestFix: 'Suggest Fix',
    explainResponse: 'Explain Response',
    generateDocs: 'Generate Documentation',
    optimizeSuggestion: 'Optimize Suggestions',
    askAnything: 'Ask Anything',
    aiCustomPlaceholder: 'Ask about this API response...',
    analyze: 'Analyze',
    aiResult: 'AI Analysis',
    analyzing: 'Analyzing...',
    addClaudeKeyHint: 'Add an Anthropic/Claude API key in Settings > API Keys to use AI features.',

    // Request Chaining
    requestChaining: 'Request Chaining',
    requestChainingDesc: 'Chain requests with variable extraction',
    chainingHint: 'Chain multiple API requests. Extract values from responses using JSONPath and pass them to next steps via {{chain.varName}}.',
    extract: 'Extract',
    as: 'as',
    addStep: 'Add Step',
    runChain: 'Run Chain',

    // Import
    importData: 'Import Data',
    importDataDesc: 'Import from Postman, Insomnia, OpenAPI, cURL, HAR',
    selectFormat: 'Select Format',
    pasteJson: 'Paste JSON',
    pasteCurl: 'Paste cURL Command(s)',

    // SSE
    sseTesting: 'SSE Testing',
    sseTestingDesc: 'Test Server-Sent Events streams',
    sseConnected: 'Connected',
    sseConnecting: 'Connecting...',
    sseDisconnected: 'Disconnected',
    sseError: 'Error',
    sseEmptyHint: 'Connect to an SSE endpoint to start receiving events',
    events: 'events',
    filterEvents: 'Filter events...',
    copyAll: 'Copy All',

    // Cookie Manager
    cookieManager: 'Cookie Manager',
    cookieManagerDesc: 'Manage cookies across requests',
    autoCaptureCookies: 'Auto Capture Cookies',
    autoCaptureDesc: 'Automatically capture Set-Cookie headers from responses',
    totalCookies: 'Cookies',
    domains: 'Domains',
    addCookie: 'Add Cookie',
    cookieName: 'Cookie Name',
    cookieValue: 'Cookie Value',
    searchCookies: 'Search cookies...',
    noCookies: 'No cookies stored',
    clearAllCookies: 'Clear All Cookies',
    clearAllCookiesConfirm: 'Remove all stored cookies?',

    // API Documentation
    apiDocs: 'API Docs',
    apiDocsDesc: 'Generate API documentation from collections',
    selectCollection: 'Select Collection',
    docFormat: 'Output Format',
    generateDocumentation: 'Generate Documentation',
    output: 'Output',
    copied: 'Copied',
    share: 'Share',

    // Proxy
    proxySettings: 'Proxy Settings',
    proxySettingsDesc: 'Route requests through a proxy server',
    enableProxy: 'Enable Proxy',
    proxyDesc: 'Route all API requests through a proxy for debugging',
    proxyHost: 'PROXY HOST',
    proxyPort: 'PROXY PORT',
    proxyAuth: 'PROXY AUTHENTICATION (Optional)',
    proxyInfo: 'Configure a proxy to inspect API traffic with tools like Charles, Fiddler, mitmproxy, or Proxyman.',
    commonProxies: 'Quick Presets',

    // Schema Validation
    schemaValidation: 'Schema Validation',
    schemaValid: 'Schema Valid',
    schemaInvalid: 'Schema Invalid',

    // Performance Benchmark
    benchmark: 'Performance Benchmark',
    benchmarkDesc: 'Load test endpoints with N requests',
    selectEndpoint: 'Select Endpoint',
    benchmarkConfig: 'Configuration',
    concurrency: 'Concurrency',
    runBenchmark: 'Run Benchmark',
    benchmarkResults: 'Benchmark Results',
    responseTimeDistribution: 'Response Time Distribution',
    errors: 'errors',
    in: 'in',

    // SSL/Certificate
    sslCertificates: 'SSL / Certificates',
    sslCertificatesDesc: 'Client certificates and SSL settings',
    sslInfoDesc: 'Configure client certificates for mutual TLS (mTLS) authentication. Paste PEM-encoded certificates and keys.',
    addSslProfile: 'Add SSL Profile',
    editSslProfile: 'Edit SSL Profile',
    profileName: 'Profile Name',
    rejectUnauthorized: 'Reject Unauthorized',
    clientCertPEM: 'CLIENT CERTIFICATE (PEM)',
    clientKeyPEM: 'CLIENT KEY (PEM)',
    caCertPEM: 'CA CERTIFICATE (PEM)',
    passphrase: 'Passphrase',
    optional: 'Optional',
    noSslProfiles: 'No SSL profiles configured',
    certAttached: 'Certificate attached',
    noCert: 'No certificate',
    insecureMode: 'Insecure mode',
    clientCert: 'Client Cert',
    privateKey: 'Private Key',
    deleteConfirmGeneric: 'Are you sure you want to delete this?',

    // WebSocket Reconnect & Ping/Pong
    connectionSettings: 'Connection Settings',
    autoReconnect: 'Auto Reconnect',
    autoReconnectDesc: 'Automatically reconnect on disconnect',
    reconnectDelay: 'Delay',
    maxAttempts: 'Max Attempts',
    pingPong: 'Heartbeat (Ping/Pong)',
    pingPongDesc: 'Send periodic ping messages to keep alive',
    pingPayload: 'Payload',
    wsReconnected: 'Reconnected',
    wsReconnecting: 'Reconnecting',
    wsMaxReconnects: 'Max reconnect attempts reached',

    // Endpoint History & Versioning
    endpointHistory: 'Endpoint History',
    endpointHistoryDesc: 'Track changes to endpoints over time',
    versionHistory: 'Version History',
    versions: 'versions',
    currentVersion: 'CURRENT VERSION',
    restoreVersion: 'Restore Version',
    restoreVersionConfirm: 'Restore this version? The current endpoint will be overwritten.',
    restore: 'Restore',
    clearHistory: 'Clear History',
    clearHistoryConfirm: 'Delete all version history for this endpoint?',
    noVersionHistory: 'No version history yet',
    noVersionHistoryHint: 'Versions are automatically saved when you send requests.',
    showDiff: 'Show Diff',
    hideDiff: 'Hide Diff',
    noChanges: 'No changes from current version',

    // Post-Request Script
    postReq: 'Post-Req',
    postReqHint: 'JavaScript runs after each response',
    postReqVars: 'Available variables:',

    // Data-Driven Testing
    dataDrivenTesting: 'Data-Driven Testing',
    loadData: 'Load Data',
    loadTestData: 'Load Test Data',
    load: 'Load',
    iterations: 'iterations',
    dataFields: 'Fields',
    dataDrivenHint: 'Load CSV or JSON data to run tests with multiple data sets. Use {{data.fieldName}} in URLs, headers, and body.',
    dataDrivenUsage: 'Use {{data.fieldName}} in your endpoint URLs, headers, and body to reference data columns. Each row/item runs all endpoints once.',

    // Script Editor
    scriptEditor: 'Script Editor',
    snippets: 'Snippets',
    insertSnippet: 'Insert Snippet',
    console: 'Console',
    clearConsole: 'Clear Console',
    saveScript: 'Save Script',
    availableVars: 'Available Variables',
    preRequestScript: 'Pre-Request Script',
    postRequestScript: 'Post-Request Script',
    scriptSaved: 'Script saved successfully',

    // Response Viewer
    responseViewer: 'Response Viewer',
    responseViewerDesc: 'Visualize API responses with tree view and formatting',
    bodyTab: 'Body',
    headersTab: 'Headers',
    previewTab: 'Preview',
    searchInResponse: 'Search in response...',
    formattedView: 'Formatted',
    rawView: 'Raw',
    copyResponse: 'Copy',
    noResponseData: 'No response data',
    responseStats: 'Response Stats',
    treeView: 'Tree View',

    // Environment Inheritance
    globalVariables: 'Global Variables',
    globalVariablesDesc: 'Variables available across all environments',
    globalVariablesHint: 'Global variables are overridden by environment-specific variables with the same key.',

    // GraphQL Explorer (tool desc)
    graphqlExplorerDesc: 'Explore GraphQL schemas and run queries',

    // Script Editor (tool desc)
    scriptEditorDesc: 'Edit pre/post request scripts with snippets',

    // Collection Auth
    collectionAuth: 'COLLECTION AUTH',
    collectionAuthHint: 'Auth applied to all endpoints in this collection (can be overridden per endpoint)',
    inheritedFromCollection: 'Inherited from collection',

    // File Upload
    pickFile: 'Pick File',

    // Request History
    requestHistory: 'Request History',
    requestHistoryDesc: 'View all sent API requests',
    allMethods: 'All',
    clearAll: 'Clear All',
    noRequestHistory: 'No request history',
    noRequestHistoryHint: 'Send API requests to see them here.',

    // Export
    exportFormat: 'Export Format',
    selectExportFormat: 'Choose export format',
    exportPostman: 'Postman v2.1',
    exportOpenAPI: 'OpenAPI 3.0',

    // Script Engine
    scriptTests: 'Tests',
    scriptConsole: 'Console',
    scriptTestsPassed: 'passed',
    scriptTestsFailed: 'failed',

    // JSON Path Evaluator
    jsonPathEvaluator: 'JSONPath Evaluator',
    evaluate: 'Evaluate',
    jsonPathEvaluatorDesc: 'Test JSONPath expressions on JSON data',

    // gRPC
    grpcClient: 'gRPC Client',
    grpcClientDesc: 'Test gRPC services via gRPC-Web',

    // Data-Driven Testing
    dataDrivenTestingDesc: 'Run tests with CSV/JSON data sets',

    // Test Report
    testReport: 'Test Report',
    testReportDesc: 'Export test results as HTML or JUnit',

    // Workspace
    workspaces: 'Workspaces',
    workspacesDesc: 'Organize collections into workspaces',

    // Security
    biometricLock: 'Biometric Lock',
    biometricLockDesc: 'Secure app with fingerprint or face',
    autoLockTimeout: 'Auto Lock After',
    immediately: 'Immediately',
    minutes: 'minutes',

    // Dynamic Variables
    dynamicVariables: 'Dynamic Variables',
    dynamicVariablesDesc: 'Auto-generated values like $timestamp, $guid',

    // Request Settings
    requestTimeout: 'Timeout',
    followRedirects: 'Follow Redirects',
    maxRedirects: 'Max Redirects',
    requestSettingsTitle: 'Request Settings',

    // Endpoint Notes
    endpointNotes: 'Notes',
    endpointNotesPlaceholder: 'Add notes or documentation for this endpoint...',
    notesPlaceholder: 'Add notes about this endpoint...',

    // MQTT
    mqttClient: 'MQTT Client',
    mqttClientDesc: 'Connect to MQTT brokers, publish & subscribe',

    // Scheduled Runs
    scheduledRuns: 'Scheduled Runs',
    scheduledRunsDesc: 'Automated testing at set intervals',

    // Contract Testing
    contractTesting: 'Contract Testing',
    contractTestingDesc: 'Validate API responses against schemas',

    // Variable Quick Look
    variableQuickLook: 'Variable Quick Look',
    variableQuickLookDesc: 'Browse and test all variables',
    searchVariables: 'Search variables...',

    // Response Diff
    responseDiff: 'Response Diff',
    responseDiffDesc: 'Line-by-line response comparison',

    // Keyboard Shortcuts
    keyboardShortcuts: 'Keyboard Shortcuts',
    keyboardShortcutsDesc: 'View all keyboard shortcuts for web',

    // Folders
    addFolder: 'Add Folder',
    newFolder: 'New Folder',
    folderName: 'Folder name',
    create: 'Create',

    // Webhook Testing
    webhookTesting: 'Webhook Testing',
    webhookTestingDesc: 'Receive and inspect incoming webhooks',

    // Snippet Library
    snippetLibrary: 'Snippet Library',
    snippetLibraryDesc: 'Reusable code, header and body snippets',

    // Team Sync
    teamSync: 'Team Sync',
    teamSyncDesc: 'Share collections with team members',

    // Git Sync
    gitSync: 'Git Sync',
    gitSyncDesc: 'Version control collections with Git',

    // Cloud Monitoring
    cloudMonitoring: 'Cloud Monitoring',
    cloudMonitoringDesc: 'Monitor API uptime and response times',

    // API Gateway / Rate Limit
    apiGateway: 'API Gateway / Rate Limit',
    apiGatewayDesc: 'Test rate limiting and gateway behavior',

    // Load Testing
    loadTesting: 'Load Testing',
    loadTestingDesc: 'Simulate concurrent users and traffic',

    // SOAP Client
    soapClient: 'SOAP Client',
    soapClientDesc: 'Test SOAP/XML web services with WSDL',

    // Certificate Pinning
    certPinning: 'Certificate Pinning',
    certPinningDesc: 'Pin and verify SSL certificate fingerprints',

    // API Changelog
    apiChangelog: 'API Changelog',
    apiChangelogDesc: 'Track endpoint changes over time',

    // New features - Wave 2
    performanceWaterfall: 'Performance Waterfall',
    performanceWaterfallDesc: 'DNS, TLS, TTFB timing breakdown',
    fakeDataGenerator: 'Fake Data Generator',
    fakeDataGeneratorDesc: 'Generate mock data for testing',
    securityScanning: 'Security Scanner',
    securityScanningDesc: 'Scan APIs for security issues',
    apiGovernance: 'API Governance',
    apiGovernanceDesc: 'Lint & audit REST best practices',
    openApiValidation: 'OpenAPI Validation',
    openApiValidationDesc: 'Validate OpenAPI/Swagger schemas',
    graphqlSubscriptions: 'GraphQL Subscriptions',
    graphqlSubscriptionsDesc: 'Real-time GraphQL subscription client',
    annotations: 'Annotations',
    annotationsDesc: 'Add comments & notes to endpoints',
    trendAnalytics: 'Trend Analytics',
    trendAnalyticsDesc: 'API health score & performance trends',
    visualDiff: 'Visual Diff',
    visualDiffDesc: 'Compare request history visually',
    variableEncryption: 'Variable Encryption',
    variableEncryptionDesc: 'Encrypt sensitive variables',
    bulkOperations: 'Bulk Operations',
    bulkOperationsDesc: 'Find & replace across endpoints',
    plugins: 'Plugins',
    pluginsDesc: 'Custom pre/post request plugins',
    smartSuggestions: 'Smart Suggestions',
    smartSuggestionsDesc: 'Common headers, params & status codes',
    responseTransform: 'Response Transform',
    responseTransformDesc: 'Convert between JSON, XML, YAML, CSV',
    cloudAuth: 'Cloud Auth',
    cloudAuthDesc: 'AWS Sig v4, Azure AD, GCP auth',
    requestInterceptor: 'Request Interceptor',
    requestInterceptorDesc: 'Intercept & modify requests/responses',
    testExecution: 'Test Execution',
    testExecutionDesc: 'Advanced test runner with breakpoints',
  },

  tr: {
    // Dashboard
    dashboard: 'Kontrol Paneli',
    apiManagementOverview: 'API Yonetim Genel Bakisi',
    totalCalls: 'Toplam Cagri',
    avgResponse: 'Ort. Yanit',
    successRate: 'Basari Orani',
    today: 'Bugun',
    monitorStatus: 'Monitor Durumu',
    up: 'Aktif',
    down: 'Dusuk',
    collections: 'Koleksiyonlar',
    endpoints: 'Endpointler',
    responseTimes: 'Yanit Sureleri',
    oldest: 'En Eski',
    latest: 'En Yeni',
    quickActions: 'Hizli Islemler',
    newCollection: 'Yeni Koleksiyon',
    newEndpoint: 'Yeni Endpoint',
    analytics: 'Analitik',
    environments: 'Ortamlar',
    recentActivity: 'Son Aktiviteler',
    noApiCallsYet: 'Henuz API cagrisi yok. Ilk istegini gonder!',
    justNow: 'Az once',
    mAgo: 'dk once',
    hAgo: 'sa once',
    noEnvironment: 'Ortam Yok',
    vars: 'degisken',
    tapToConfigure: 'Yapilandirmak icin dokun',

    // APIs
    apis: 'API\'ler',
    collectionsCount: 'koleksiyon',
    endpointsCount: 'endpoint',
    noCollections: 'Koleksiyon Yok',
    createFirstCollection: 'Baslamak icin ilk API koleksiyonunuzu olusturun',
    noEndpointsYet: 'Henuz endpoint yok',
    addEndpoint: 'Endpoint Ekle',
    runAll: 'Hepsini Calistir',
    deleteCollection: 'Koleksiyonu Sil',
    deleteCollectionConfirm: '"{name}" ve tum endpointlerini silmek istediginize emin misiniz?',
    cancel: 'Iptal',
    delete: 'Sil',

    // Monitor
    monitor: 'Monitor',
    healthChecksUptime: 'Saglik kontrolleri ve calisma suresi',
    checkAll: 'Hepsini Kontrol Et',
    healthy: 'Saglikli',
    pending: 'Beklemede',
    autoHealthCheck: 'Otomatik Saglik Kontrolu',
    interval: 'Aralik',
    last: 'Son',
    never: 'Hic',
    noHealthChecks: 'Saglik Kontrolu Yok',
    enableMonitoring: 'Herhangi bir endpoint detay ekranindan izlemeyi etkinlestirin.',
    uptime: 'Calisma Suresi',
    avg: 'Ort.',
    status: 'Durum',
    pings: 'Pingler',
    incidents: 'Olaylar',
    resolved: 'Cozuldu',
    ongoing: 'Devam Ediyor',
    removeMonitor: 'Monitoru Kaldir',
    removeHealthCheck: 'Bu saglik kontrolunu kaldirmak istiyor musunuz?',
    remove: 'Kaldir',

    // Settings
    settings: 'Ayarlar',
    appearance: 'GORUNUM',
    system: 'Sistem',
    dark: 'Karanlik',
    light: 'Aydinlik',
    language: 'DIL',
    english: 'English',
    turkish: 'Turkce',
    apiKeys: 'API ANAHTARLARI',
    noApiKeysStored: 'Kayitli API anahtari yok',
    addApiKey: 'API Anahtari Ekle',
    keyName: 'Anahtar Adi',
    service: 'Servis (orn. OpenAI)',
    apiKeyValue: 'API Anahtar Degeri',
    save: 'Kaydet',
    data: 'VERI',
    clearCallLogs: 'Cagri Kayitlarini Temizle',
    clearCallLogsConfirm: 'Emin misiniz? Bu tum API cagri gecmisini silecektir.',
    clear: 'Temizle',
    about: 'HAKKINDA',
    version: 'Surum',

    // Endpoint
    testEndpoint: 'Endpoint Test',
    send: 'Gonder',
    headers: 'Basliklar',
    body: 'Govde',
    assertions: 'Dogrulamalar',
    response: 'Yanit',
    diff: 'Fark',
    noResponse: 'Henuz yanit yok',
    sendRequest: 'Yaniti gormek icin istek gonderin',
    monitoring: 'Izleme',
    deleteEndpoint: 'Endpoint Sil',
    deleteEndpointConfirm: 'Bu endpoint silinsin mi?',

    // Collection New
    collectionName: 'KOLEKSIYON ADI',
    description: 'ACIKLAMA',
    baseUrl: 'TEMEL URL',
    color: 'RENK',
    icon: 'IKON',
    preview: 'ONIZLEME',
    createCollection: 'Koleksiyon Olustur',

    // Endpoint New
    endpointName: 'ENDPOINT ADI',
    method: 'METOD',
    url: 'URL',
    collection: 'KOLEKSIYON',
    createFirstCollectionHint: 'Once API\'ler sekmesinden bir koleksiyon olusturun.',
    bodyJson: 'GOVDE (JSON)',
    createEndpoint: 'Endpoint Olustur',

    // Runner
    collectionRunner: 'Koleksiyon Calistiricisi',
    requestDelay: 'Istek Gecikmesi',
    none: 'Yok',
    environment: 'Ortam',
    delay: 'Gecikme',
    runAllEndpoints: 'Tum Endpointleri Calistir',
    running: 'Calisiyor',
    passed: 'Basarili',
    failed: 'Basarisiz',
    totalTime: 'Toplam Sure',
    testing: 'Test ediliyor',

    // Analytics
    timeRange: 'Zaman Araligi',
    totalRequests: 'Toplam Istek',
    successful: 'Basarili',
    avgTime: 'Ort. Sure',
    p95Time: 'P95 Sure',
    fastest: 'En Hizli',
    dailyActivity: 'Gunluk Aktivite',
    statusCodes: 'Durum Kodlari',
    methodBreakdown: 'Metod Dagilimi',
    topEndpoints: 'En Cok Kullanilan Endpointler',
    calls: 'cagri',

    // Environments
    activeEnvironment: 'Aktif Ortam',
    noActiveEnv: 'Aktif Ortam Yok',
    addEnvironment: 'Ortam Ekle',
    editEnvironment: 'Ortami Duzenle',
    envName: 'Ortam Adi',
    variables: 'Degiskenler',
    addVariable: 'Degisken Ekle',
    key: 'Anahtar',
    value: 'Deger',
    usage: 'Kullanim',
    usageHint: 'URL, baslik ve govdede degiskenlere referans vermek icin {{DEGISKEN_ADI}} kullanin.',

    // Log Detail
    requestDetail: 'Istek Detayi',
    request: 'Istek',
    responseTimeLabel: 'Yanit Suresi',
    size: 'Boyut',
    logNotFound: 'Kayit bulunamadi',
    noRequestBody: 'Istek govdesi yok',
    noResponseBody: 'Yanit govdesi yok',

    // Auth
    auth: 'Kimlik',
    bearerTokenPlaceholder: 'Bearer token girin...',
    username: 'Kullanici Adi',
    password: 'Sifre',
    addToHeader: 'Header',
    addToQuery: 'Query Param',

    // Pre-Request Script
    preReq: 'On-Istek',
    preReqHint: 'Her istekten once JavaScript calistirilir',

    // GraphQL
    graphqlQuery: 'Sorgu',
    graphqlVariables: 'Degiskenler',
    graphqlExplorer: 'GraphQL Gezgini',
    introspect: 'Sema Kesfet',
    schemaTypes: 'Sema Turleri',
    queryBuilder: 'Sorgu Olusturucu',
    executeQuery: 'Sorguyu Calistir',
    graphqlHeaders: 'Basliklar',
    graphqlResponse: 'Yanit',
    noSchema: 'Sema yuklenmedi. Bir GraphQL endpoint girin ve kesfetme calistirin.',
    introspecting: 'Kesfediliyor...',
    schemaLoaded: 'Sema basariyla yuklendi',

    // Export/Import
    exported: 'Disari Aktarildi',
    exportedToClipboard: 'Koleksiyon JSON panoya kopyalandi',
    imported: 'Iceri Aktarildi',
    collectionImported: 'Koleksiyon basariyla iceri aktarildi',
    importCollection: 'Koleksiyon Iceri Aktar',
    pasteJsonHint: 'Disari aktarilan koleksiyon JSON\'unu asagiya yapiştirin',
    error: 'Hata',
    invalidJsonFormat: 'Gecersiz JSON formati',

    // WebSocket
    websocketTesting: 'WebSocket Testi',
    wsConnected: 'Baglandi',
    wsDisconnected: 'Baglanti Kesildi',
    wsError: 'Baglanti Hatasi',
    wsStatusConnected: 'Bagli',
    wsStatusConnecting: 'Baglaniyor...',
    wsStatusDisconnected: 'Bagli Degil',
    wsMessages: 'mesaj',
    wsEmptyHint: 'Baslamak icin bir WebSocket sunucusuna baglanin',
    wsTypePlaceholder: 'Mesaj yazin...',

    // Push Notifications
    pushNotifications: 'Bildirimler',
    pushNotificationsHint: 'Izlenen endpoint duserse bildirim alin',

    // cURL & Code Gen
    importCurl: 'cURL Iceri Aktar',
    invalidCurl: 'Gecersiz cURL komutu',
    codeGen: 'Kod Uret',
    copyCode: 'Kodu Kopyala',

    // Favorites
    favorites: 'Favoriler',

    // Global Search
    globalSearch: 'Arama',
    searchPlaceholder: 'Endpoint, koleksiyon, kayit ara...',
    resultsFound: 'sonuc bulundu',
    noResults: 'Sonuc bulunamadi',

    // Accent Color
    accentColor: 'VURGU RENGI',

    // Mock Server
    mockServer: 'Mock Sunucu',
    mockServerRunning: 'Mock Sunucu Calisiyor',
    mockServerStopped: 'Mock Sunucu Durdu',
    activeRoutes: 'aktif rota',
    mockRoutes: 'Rotalar',
    addRoute: 'Rota Ekle',
    noMockRoutes: 'Yapilandirilmis mock rota yok',
    removeRouteConfirm: 'Bu mock rotayi kaldirmak istiyor musunuz?',

    // Compare
    compareRequests: 'Istekleri Karsilastir',
    selectLeft: 'Sol Sec',
    selectRight: 'Sag Sec',

    // Offline Queue
    offlineQueue: 'Cevrimdisi Kuyruk',
    queuedRequests: 'Kuyrukta Bekleyen Istekler',
    processQueue: 'Kuyrugu Isle',
    clearQueue: 'Kuyrugu Temizle',
    noQueuedRequests: 'Kuyrukta istek yok',
    online: 'Cevrimici',
    offline: 'Cevrimdisi',

    // Tools Hub
    tools: 'Araclar',
    allToolsDesc: 'Tum ozellikler tek yerde',
    requestTools: 'Istek Araclari',
    analysisTools: 'Analiz Araclari',
    configTools: 'Yapilandirma',
    networkTools: 'Ag',
    newCollectionDesc: 'Yeni API koleksiyonu olustur',
    newEndpointDesc: 'Yeni API endpoint ekle',
    websocketTestingDesc: 'WebSocket baglantilarini test et',
    mockServerDesc: 'Mock API yanitlarini yapilandir',
    analyticsDesc: 'Istek istatistiklerini ve grafikleri gor',
    compareRequestsDesc: 'Iki API yanitini yan yana karsilastir',
    globalSearchDesc: 'Tum koleksiyon ve kayitlarda ara',
    environmentsDesc: 'Ortam degiskenlerini yonet',
    importCollectionDesc: 'JSON\'dan koleksiyon iceri aktar',
    offlineQueueDesc: 'Kuyrukta bekleyen istekleri yonet',
    templatesDesc: 'Hazir API sablonlarindan basla',

    // Templates
    templates: 'Sablonlar',

    // Quick Send
    quickSend: 'Hizli Gonder',
    quickSendDesc: 'Kaydetmeden hizli HTTP istegi gonder',

    // Onboarding
    onboardWelcomeTitle: 'API Gelistirici Araclari',
    onboardWelcomeDesc: 'Hepsi bir arada mobil API test ve yonetim platformu. Hareket halindeyken API\'leri test edin, izleyin ve hata ayiklayin.',
    onboardRequestTitle: 'Istek Gonder',
    onboardRequestDesc: 'Metod, baslik, govde, kimlik dogrulama ve ortam degiskenleri uzerinde tam kontrolle herhangi bir API endpoint\'ini test edin.',
    onboardMonitorTitle: 'Calisma Suresini Izle',
    onboardMonitorDesc: 'API\'leriniz icin saglik kontrolleri ayarlayin ve endpoint\'ler duserse bildirim alin.',
    onboardAnalyticsTitle: 'Performans Analizi',
    onboardAnalyticsDesc: 'Yanit surelerini, basari oranlarini ve kullanim kaliplarini detayli analizlerle takip edin.',
    onboardToolsTitle: 'Guclu Araclar',
    onboardToolsDesc: 'WebSocket testi, mock sunucular, istek sablonlari, kod uretimi, cURL iceri/disari aktarma ve daha fazlasi.',
    skip: 'Atla',
    next: 'Ileri',
    getStarted: 'Basla',

    // Swipe hints
    duplicate: 'Kopyala',
    swipeHint: 'Hizli islemler icin endpointleri kaydir',

    // Auth & Account
    signIn: 'Giris Yap',
    signUp: 'Kayit Ol',
    signOut: 'Cikis Yap',
    signOutConfirm: 'Cikis yapmak istediginize emin misiniz?',
    signInSignUp: 'Giris Yap / Kayit Ol',
    welcomeBack: 'Tekrar Hosgeldiniz',
    createAccount: 'Hesap Olustur',
    authSubtitle: 'Verilerinizi cihazlar arasi senkronize edin ve Pro ozellikleri acin',
    fillAllFields: 'Tum alanlari doldurun',
    passwordsNoMatch: 'Sifreler eslesmedi',
    confirmPassword: 'Sifre Tekrar',
    noAccount: 'Hesabiniz yok mu?',
    haveAccount: 'Zaten hesabiniz var mi?',
    whySignUp: 'Neden hesap olusturmali?',
    benefitSync: 'Koleksiyon ve endpointleri tum cihazlarinizda senkronize edin',
    benefitAI: 'Yapay zeka destekli API analizi ve hata ayiklama',
    benefitChaining: 'Degisken cikarma ile birden fazla istegi zincirleyin',
    benefitTeam: 'Calisma alanlarini takiminizla paylasin',
    account: 'Hesap',
    profile: 'Profil',

    // Cloud Sync
    cloudSync: 'Bulut Senkronizasyon',
    syncNow: 'Simdi Senkronize Et',
    lastSync: 'Son Senkronizasyon',
    autoSync: 'Otomatik Senkronizasyon',

    // Subscription
    upgradeToPro: "Pro'ya Yuksel",
    upgradeDesc: 'Sinirsiz istek, bulut senk, yapay zeka ve daha fazlasi',
    goPro: "Pro'ya Gec",
    unlockFullPower: 'Tam Gucu Ac',
    paywallDesc: 'Tum premium ozelliklere sinirsiz erisim',
    unlimitedRequests: 'Sinirsiz Istek',
    unlimitedCollections: 'Sinirsiz Koleksiyon',
    postmanImport: 'Postman/Insomnia/OpenAPI Iceri Aktarma',
    month: 'ay',
    perUser: 'kullanici',
    startFreeTrial: '7 Gunluk Ucretsiz Denemeyi Basla',
    trialHint: 'Istediginiz zaman iptal edin. Deneme bitene kadar ucret alinmaz.',
    subscriptionActivated: 'Abonelik Aktif',
    enjoyPro: 'Tum Pro ozelliklerinin keyfini cikarin!',

    // AI Analysis
    aiAnalysis: 'Yapay Zeka Analizi',
    aiAnalysisDesc: 'API yanitlarini yapay zeka ile analiz et',
    context: 'Baglam',
    quickPrompts: 'Hizli Komutlar',
    analyzeError: 'Hatayi Analiz Et',
    suggestFix: 'Duzeltme Oner',
    explainResponse: 'Yaniti Acikla',
    generateDocs: 'Dokumantasyon Olustur',
    optimizeSuggestion: 'Optimizasyon Onerileri',
    askAnything: 'Herhangi Bir Sey Sor',
    aiCustomPlaceholder: 'Bu API yaniti hakkinda sorun...',
    analyze: 'Analiz Et',
    aiResult: 'Yapay Zeka Analizi',
    analyzing: 'Analiz ediliyor...',
    addClaudeKeyHint: 'Yapay zeka ozelliklerini kullanmak icin Ayarlar > API Anahtarlari kismina Anthropic/Claude API anahtari ekleyin.',

    // Request Chaining
    requestChaining: 'Istek Zincirleme',
    requestChainingDesc: 'Degisken cikarma ile istekleri zincirle',
    chainingHint: 'Birden fazla API istegini zincirleyin. JSONPath ile yanitlardan deger cikarin ve {{chain.degiskenAdi}} ile sonraki adimlara aktarin.',
    extract: 'Cikar',
    as: 'olarak',
    addStep: 'Adim Ekle',
    runChain: 'Zinciri Calistir',

    // Import
    importData: 'Veri Iceri Aktar',
    importDataDesc: 'Postman, Insomnia, OpenAPI, cURL, HAR\'dan iceri aktar',
    selectFormat: 'Format Sec',
    pasteJson: 'JSON Yapistir',
    pasteCurl: 'cURL Komutu Yapistir',

    // SSE
    sseTesting: 'SSE Testi',
    sseTestingDesc: 'Server-Sent Events akislarini test et',
    sseConnected: 'Baglandi',
    sseConnecting: 'Baglaniyor...',
    sseDisconnected: 'Bagli Degil',
    sseError: 'Hata',
    sseEmptyHint: 'Olaylari almaya baslamak icin bir SSE endpoint\'ine baglanin',
    events: 'olay',
    filterEvents: 'Olaylari filtrele...',
    copyAll: 'Hepsini Kopyala',

    // Cookie Manager
    cookieManager: 'Cerez Yoneticisi',
    cookieManagerDesc: 'Istekler arasi cerezleri yonet',
    autoCaptureCookies: 'Otomatik Cerez Yakalama',
    autoCaptureDesc: 'Yanitlardan Set-Cookie basliklarini otomatik yakala',
    totalCookies: 'Cerezler',
    domains: 'Alanlar',
    addCookie: 'Cerez Ekle',
    cookieName: 'Cerez Adi',
    cookieValue: 'Cerez Degeri',
    searchCookies: 'Cerez ara...',
    noCookies: 'Kayitli cerez yok',
    clearAllCookies: 'Tum Cerezleri Temizle',
    clearAllCookiesConfirm: 'Tum kayitli cerezler silinsin mi?',

    // API Documentation
    apiDocs: 'API Dokumantasyonu',
    apiDocsDesc: 'Koleksiyonlardan API dokumantasyonu olustur',
    selectCollection: 'Koleksiyon Sec',
    docFormat: 'Cikti Formati',
    generateDocumentation: 'Dokumantasyon Olustur',
    output: 'Cikti',
    copied: 'Kopyalandi',
    share: 'Paylas',

    // Proxy
    proxySettings: 'Proxy Ayarlari',
    proxySettingsDesc: 'Istekleri proxy sunucu uzerinden yonlendir',
    enableProxy: 'Proxy\'yi Etkinlestir',
    proxyDesc: 'Hata ayiklama icin tum API isteklerini proxy uzerinden yonlendir',
    proxyHost: 'PROXY SUNUCU',
    proxyPort: 'PROXY PORT',
    proxyAuth: 'PROXY KIMLIK DOGRULAMA (Opsiyonel)',
    proxyInfo: 'Charles, Fiddler, mitmproxy veya Proxyman gibi araclarla API trafigini incelemek icin proxy yapilandirin.',
    commonProxies: 'Hizli Ayarlar',

    // Schema Validation
    schemaValidation: 'Sema Dogrulama',
    schemaValid: 'Sema Gecerli',
    schemaInvalid: 'Sema Gecersiz',

    // Performance Benchmark
    benchmark: 'Performans Testi',
    benchmarkDesc: 'N istek ile endpointleri yuk testi yap',
    selectEndpoint: 'Endpoint Sec',
    benchmarkConfig: 'Yapilandirma',
    concurrency: 'Eszamanlilik',
    runBenchmark: 'Testi Baslat',
    benchmarkResults: 'Test Sonuclari',
    responseTimeDistribution: 'Yanit Suresi Dagilimi',
    errors: 'hata',
    in: 'icinde',

    // SSL/Certificate
    sslCertificates: 'SSL / Sertifikalar',
    sslCertificatesDesc: 'Istemci sertifikalari ve SSL ayarlari',
    sslInfoDesc: 'Karsilikli TLS (mTLS) kimlik dogrulamasi icin istemci sertifikalarini yapilandirin. PEM kodlu sertifika ve anahtarlari yapistirin.',
    addSslProfile: 'SSL Profili Ekle',
    editSslProfile: 'SSL Profilini Duzenle',
    profileName: 'Profil Adi',
    rejectUnauthorized: 'Yetkisizi Reddet',
    clientCertPEM: 'ISTEMCI SERTIFIKASI (PEM)',
    clientKeyPEM: 'ISTEMCI ANAHTARI (PEM)',
    caCertPEM: 'CA SERTIFIKASI (PEM)',
    passphrase: 'Parola',
    optional: 'Opsiyonel',
    noSslProfiles: 'Yapilandirilmis SSL profili yok',
    certAttached: 'Sertifika eklenmis',
    noCert: 'Sertifika yok',
    insecureMode: 'Guvenli olmayan mod',
    clientCert: 'Istemci Sert.',
    privateKey: 'Ozel Anahtar',
    deleteConfirmGeneric: 'Bunu silmek istediginize emin misiniz?',

    // WebSocket Reconnect & Ping/Pong
    connectionSettings: 'Baglanti Ayarlari',
    autoReconnect: 'Otomatik Yeniden Baglanma',
    autoReconnectDesc: 'Baglanti kesildiginde otomatik yeniden baglan',
    reconnectDelay: 'Gecikme',
    maxAttempts: 'Maks Deneme',
    pingPong: 'Kalp Atisi (Ping/Pong)',
    pingPongDesc: 'Baglanti canli tutmak icin periyodik ping gonder',
    pingPayload: 'Yuk',
    wsReconnected: 'Yeniden Baglandi',
    wsReconnecting: 'Yeniden Baglaniyor',
    wsMaxReconnects: 'Maksimum yeniden baglanti denemesine ulasildi',

    // Endpoint History & Versioning
    endpointHistory: 'Endpoint Gecmisi',
    endpointHistoryDesc: 'Endpoint degisikliklerini zaman icinde takip et',
    versionHistory: 'Surum Gecmisi',
    versions: 'surum',
    currentVersion: 'MEVCUT SURUM',
    restoreVersion: 'Surumu Geri Yukle',
    restoreVersionConfirm: 'Bu surum geri yuklensin mi? Mevcut endpoint uzerine yazilacak.',
    restore: 'Geri Yukle',
    clearHistory: 'Gecmisi Temizle',
    clearHistoryConfirm: 'Bu endpoint icin tum surum gecmisi silinsin mi?',
    noVersionHistory: 'Henuz surum gecmisi yok',
    noVersionHistoryHint: 'Istek gonderdiginizde surumler otomatik kaydedilir.',
    showDiff: 'Farki Goster',
    hideDiff: 'Farki Gizle',
    noChanges: 'Mevcut surumden farki yok',

    // Post-Request Script
    postReq: 'Son-Istek',
    postReqHint: 'Her yanittan sonra JavaScript calistirilir',
    postReqVars: 'Kullanilabilir degiskenler:',

    // Data-Driven Testing
    dataDrivenTesting: 'Veri Tabanli Test',
    loadData: 'Veri Yukle',
    loadTestData: 'Test Verisi Yukle',
    load: 'Yukle',
    iterations: 'iterasyon',
    dataFields: 'Alanlar',
    dataDrivenHint: 'Birden fazla veri seti ile test calistirmak icin CSV veya JSON veri yukleyin. URL, baslik ve govdede {{data.alanAdi}} kullanin.',
    dataDrivenUsage: 'Endpoint URL, baslik ve govdelerinde veri sutunlarina referans vermek icin {{data.alanAdi}} kullanin. Her satir/oge tum endpointleri bir kez calistirir.',

    // Script Editor
    scriptEditor: 'Script Duzenleyici',
    snippets: 'Kod Parcalari',
    insertSnippet: 'Kod Parcasi Ekle',
    console: 'Konsol',
    clearConsole: 'Konsolu Temizle',
    saveScript: 'Scripti Kaydet',
    availableVars: 'Kullanilabilir Degiskenler',
    preRequestScript: 'On-Istek Scripti',
    postRequestScript: 'Son-Istek Scripti',
    scriptSaved: 'Script basariyla kaydedildi',

    // Response Viewer
    responseViewer: 'Yanit Goruntuleyici',
    responseViewerDesc: 'API yanitlarini agac gorunumu ve bicimlendirme ile goruntule',
    bodyTab: 'Govde',
    headersTab: 'Basliklar',
    previewTab: 'Onizleme',
    searchInResponse: 'Yanit icinde ara...',
    formattedView: 'Bicimli',
    rawView: 'Ham',
    copyResponse: 'Kopyala',
    noResponseData: 'Yanit verisi yok',
    responseStats: 'Yanit Istatistikleri',
    treeView: 'Agac Gorunumu',

    // Environment Inheritance
    globalVariables: 'Global Degiskenler',
    globalVariablesDesc: 'Tum ortamlarda gecerli degiskenler',
    globalVariablesHint: 'Global degiskenler, ayni anahtara sahip ortam degiskenleri tarafindan gecersiz kilinir.',

    // GraphQL Explorer (tool desc)
    graphqlExplorerDesc: 'GraphQL semalarini kesfet ve sorgulari calistir',

    // Script Editor (tool desc)
    scriptEditorDesc: 'On/son istek scriptlerini kod parcalariyla duzenle',

    // Collection Auth
    collectionAuth: 'KOLEKSIYON KIMLIK DOGRULAMASI',
    collectionAuthHint: 'Bu koleksiyondaki tum endpointlere uygulanan auth (endpoint bazinda gecersiz kilinabilir)',
    inheritedFromCollection: 'Koleksiyondan miras alindi',

    // File Upload
    pickFile: 'Dosya Sec',

    // Request History
    requestHistory: 'Istek Gecmisi',
    requestHistoryDesc: 'Gonderilen tum API isteklerini goruntule',
    allMethods: 'Tumu',
    clearAll: 'Hepsini Temizle',
    noRequestHistory: 'Istek gecmisi yok',
    noRequestHistoryHint: 'Burada gormek icin API istekleri gonderin.',

    // Export
    exportFormat: 'Disari Aktarma Formati',
    selectExportFormat: 'Disari aktarma formatini secin',
    exportPostman: 'Postman v2.1',
    exportOpenAPI: 'OpenAPI 3.0',

    // Script Engine
    scriptTests: 'Testler',
    scriptConsole: 'Konsol',
    scriptTestsPassed: 'basarili',
    scriptTestsFailed: 'basarisiz',

    // JSON Path Evaluator
    jsonPathEvaluator: 'JSONPath Degerlendirici',
    evaluate: 'Degerlendir',
    jsonPathEvaluatorDesc: 'JSON verisi uzerinde JSONPath ifadelerini test et',

    // gRPC
    grpcClient: 'gRPC Istemcisi',
    grpcClientDesc: 'gRPC-Web uzerinden gRPC servislerini test et',

    // Data-Driven Testing
    dataDrivenTestingDesc: 'CSV/JSON veri setleriyle testleri calistir',

    // Test Report
    testReport: 'Test Raporu',
    testReportDesc: 'Test sonuclarini HTML veya JUnit olarak disari aktar',

    // Workspace
    workspaces: 'Calisma Alanlari',
    workspacesDesc: 'Koleksiyonlari calisma alanlarina organize et',

    // Security
    biometricLock: 'Biyometrik Kilit',
    biometricLockDesc: 'Uygulamayi parmak izi veya yuz ile koru',
    autoLockTimeout: 'Otomatik Kilitle',
    immediately: 'Hemen',
    minutes: 'dakika',

    // Dynamic Variables
    dynamicVariables: 'Dinamik Degiskenler',
    dynamicVariablesDesc: '$timestamp, $guid gibi otomatik degerler',

    // Request Settings
    requestTimeout: 'Zaman Asimi',
    followRedirects: 'Yonlendirmeleri Takip Et',
    maxRedirects: 'Maks Yonlendirme',
    requestSettingsTitle: 'Istek Ayarlari',

    // Endpoint Notes
    endpointNotes: 'Notlar',
    endpointNotesPlaceholder: 'Bu endpoint icin not veya dokumantasyon ekleyin...',
    notesPlaceholder: 'Bu endpoint hakkinda not ekleyin...',

    // MQTT
    mqttClient: 'MQTT Istemcisi',
    mqttClientDesc: 'MQTT brokerlarına baglan, yayinla ve abone ol',

    // Scheduled Runs
    scheduledRuns: 'Zamanlanmis Calistirimalar',
    scheduledRunsDesc: 'Belirli aralıklarla otomatik test',

    // Contract Testing
    contractTesting: 'Sozlesme Testi',
    contractTestingDesc: 'API yanitlarini semalara gore dogrula',

    // Variable Quick Look
    variableQuickLook: 'Degisken Hizli Bakis',
    variableQuickLookDesc: 'Tum degiskenleri goruntule ve test et',
    searchVariables: 'Degisken ara...',

    // Response Diff
    responseDiff: 'Yanit Karsilastirma',
    responseDiffDesc: 'Satir satir yanit karsilastirmasi',

    // Keyboard Shortcuts
    keyboardShortcuts: 'Klavye Kisayollari',
    keyboardShortcutsDesc: 'Web icin tum klavye kisayollarini gor',

    // Folders
    addFolder: 'Klasor Ekle',
    newFolder: 'Yeni Klasor',
    folderName: 'Klasor adi',
    create: 'Olustur',

    // Webhook Testing
    webhookTesting: 'Webhook Testi',
    webhookTestingDesc: 'Gelen webhooklari al ve incele',

    // Snippet Library
    snippetLibrary: 'Kod Parcalari Kutuphanesi',
    snippetLibraryDesc: 'Tekrar kullanilabilir kod, baslik ve govde parcalari',

    // Team Sync
    teamSync: 'Takim Senk',
    teamSyncDesc: 'Koleksiyonlari takim uyeleriyle paylas',

    // Git Sync
    gitSync: 'Git Senk',
    gitSyncDesc: 'Koleksiyonlari Git ile surum kontrolu yap',

    // Cloud Monitoring
    cloudMonitoring: 'Bulut Izleme',
    cloudMonitoringDesc: 'API calisma suresi ve yanit surelerini izle',

    // API Gateway / Rate Limit
    apiGateway: 'API Gateway / Hiz Siniri',
    apiGatewayDesc: 'Hiz sinirlamasi ve gateway davranisini test et',

    // Load Testing
    loadTesting: 'Yuk Testi',
    loadTestingDesc: 'Eszamanli kullanicilar ve trafik simule et',

    // SOAP Client
    soapClient: 'SOAP Istemcisi',
    soapClientDesc: 'WSDL ile SOAP/XML web servislerini test et',

    // Certificate Pinning
    certPinning: 'Sertifika Sabitleme',
    certPinningDesc: 'SSL sertifika parmak izlerini sabitle ve dogrula',

    // API Changelog
    apiChangelog: 'API Degisiklik Gecmisi',
    apiChangelogDesc: 'Endpoint degisikliklerini zaman icinde takip et',

    // New features - Wave 2
    performanceWaterfall: 'Performans Waterfall',
    performanceWaterfallDesc: 'DNS, TLS, TTFB zamanlama analizi',
    fakeDataGenerator: 'Sahte Veri Uretici',
    fakeDataGeneratorDesc: 'Test icin sahte veri uret',
    securityScanning: 'Guvenlik Tarayici',
    securityScanningDesc: 'API guvenlik aciklari icin tara',
    apiGovernance: 'API Yonetisim',
    apiGovernanceDesc: 'REST en iyi pratiklerini denetle',
    openApiValidation: 'OpenAPI Dogrulama',
    openApiValidationDesc: 'OpenAPI/Swagger semasini dogrula',
    graphqlSubscriptions: 'GraphQL Abonelikler',
    graphqlSubscriptionsDesc: 'Gercek zamanli GraphQL abonelik istemcisi',
    annotations: 'Notlar',
    annotationsDesc: 'Endpointlere yorum ve not ekle',
    trendAnalytics: 'Trend Analitik',
    trendAnalyticsDesc: 'API saglik puani ve performans trendleri',
    visualDiff: 'Gorsel Fark',
    visualDiffDesc: 'Istek gecmisini gorsel olarak karsilastir',
    variableEncryption: 'Degisken Sifreleme',
    variableEncryptionDesc: 'Hassas degiskenleri sifrele',
    bulkOperations: 'Toplu Islemler',
    bulkOperationsDesc: 'Endpointlerde toplu bul ve degistir',
    plugins: 'Eklentiler',
    pluginsDesc: 'Ozel istek oncesi/sonrasi eklentiler',
    smartSuggestions: 'Akilli Oneriler',
    smartSuggestionsDesc: 'Yaygin headerlar, parametreler ve durum kodlari',
    responseTransform: 'Yanit Donusturme',
    responseTransformDesc: 'JSON, XML, YAML, CSV arasi donusum',
    cloudAuth: 'Bulut Kimlik Dogrulama',
    cloudAuthDesc: 'AWS Sig v4, Azure AD, GCP auth',
    requestInterceptor: 'Istek Yakalayici',
    requestInterceptorDesc: 'Istekleri yakala ve degistir',
    testExecution: 'Test Calistirma',
    testExecutionDesc: 'Durdurma noktali gelismis test calistirici',
  },
};
