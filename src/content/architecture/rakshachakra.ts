import { registerArchitecture } from '../../architecture/registry';
import type { ArchitectureModel } from '../../architecture/types';

/**
 * Rakshachakra's canonical ArchitectureModel — mirrors cortexa.ts's shape
 * exactly (same platform, see ARCHITECTURE_PLATFORM_DESIGN.md §13). This is
 * the source of truth for Rakshachakra's architecture; architecture.mmd is
 * generated from this model (modelToMermaid(), see workspaceSeed.ts), not
 * the other way around.
 *
 * This is the **System Architecture** view — the default landing
 * architecture, answering "what are the major building blocks of
 * Rakshachakra, and how do they interact at a high level?" It deliberately
 * stops at service/domain *boundaries*, not internal workflow: Profile
 * Initialization, Risk Scoring, Model Retraining, etc. appear here as
 * single architectural-domain nodes, not decomposed into their internal
 * states.
 *
 * Registers itself on import — whatever imports this module
 * (workspaceSeed.ts) must run before the app's first render, the same
 * "module load = registration" ordering the terminal command registry and
 * search index already rely on.
 */
export const rakshachakraArchitecture: ArchitectureModel = {
  projectKey: 'rakshachakra',
  nodes: [
    // Layer 1 — Client
    {
      id: 'mobile_client',
      title: 'Mobile Client',
      category: 'client',
      technology: 'Flutter, Dart',
      description: 'The end-user mobile app experience — hosts every user-facing module and renders the banking and security UI.',
      responsibilities: ['UI rendering', 'Client-side navigation', 'Hosting user-facing modules'],
      dependencies: ['banking_dashboard', 'sensor_capture', 'biometric_enrollment', 'security_center', 'demo_console'],
      runtime: 'Android/iOS device (Flutter runtime)',
      deployment: 'Delivered as part of the compiled Flutter application',
      status: 'active',
    },

    // Layer 2 — User-Facing Modules (logical modules, not Flutter widgets)
    {
      id: 'banking_dashboard',
      title: 'Banking Dashboard',
      category: 'frontend',
      technology: 'Flutter (Material)',
      description: "The landing module summarizing a user's accounts, balances, and recent activity.",
      responsibilities: ['Account/balance overview', 'Entry point into other modules'],
      dependencies: ['flutter_app'],
      runtime: 'Flutter widget tree (client-side)',
      deployment: 'Bundled as part of the Flutter application',
      status: 'active',
    },
    {
      id: 'sensor_capture',
      title: 'Behavioral Sensor Capture',
      category: 'frontend',
      technology: 'Flutter, sensors_plus',
      description: 'The module that continuously captures touch, motion, and device-state signals during normal app use.',
      responsibilities: ['Touch/gesture capture', 'Motion/orientation capture', 'Device-state signal capture'],
      dependencies: ['flutter_app'],
      runtime: 'Flutter widget tree (client-side)',
      deployment: 'Bundled as part of the Flutter application',
      status: 'active',
    },
    {
      id: 'biometric_enrollment',
      title: 'Biometric Enrollment',
      category: 'frontend',
      technology: 'Flutter, local_auth',
      description: 'The module for onboarding a user and establishing their baseline behavioral and biometric profile.',
      responsibilities: ['Onboarding flow', 'Baseline behavior collection', 'Local biometric enrollment'],
      dependencies: ['flutter_app'],
      runtime: 'Flutter widget tree (client-side)',
      deployment: 'Bundled as part of the Flutter application',
      status: 'active',
    },
    {
      id: 'security_center',
      title: 'Adaptive Security Center',
      category: 'frontend',
      technology: 'Flutter (Material)',
      description: 'The module presenting real-time risk status and handling step-up authentication prompts.',
      responsibilities: ['Risk status UI', 'Step-up authentication prompts (PIN/OTP/biometric)', 'Session lock UI'],
      dependencies: ['flutter_app'],
      runtime: 'Flutter widget tree (client-side)',
      deployment: 'Bundled as part of the Flutter application',
      status: 'active',
    },
    {
      id: 'demo_console',
      title: 'Demo Scenario Console',
      category: 'frontend',
      technology: 'Flutter',
      description: 'The module for running scripted demo profiles and scenarios that showcase the risk pipeline end to end.',
      responsibilities: ['Demo profile selection', 'Scripted scenario playback'],
      dependencies: ['flutter_app'],
      runtime: 'Flutter widget tree (client-side)',
      deployment: 'Bundled as part of the Flutter application',
      status: 'active',
    },

    // Layer 3 — Application Layer
    {
      id: 'flutter_app',
      title: 'Flutter Application',
      category: 'backend',
      technology: 'Flutter (Dart), Provider',
      description: "The orchestration layer — manages app-wide state and coordinates every user-facing module's calls to Firebase and the risk inference service.",
      responsibilities: ['App-wide state management (Provider)', 'Local persistence (Hive, Shared Preferences)', 'API orchestration'],
      dependencies: ['firebase_firestore', 'risk_inference_service'],
      runtime: 'Dart VM (Flutter application runtime)',
      deployment: 'Single compiled Flutter application (Android)',
      status: 'active',
    },

    // Layer 4 — Managed Platform Services
    {
      id: 'firebase_firestore',
      title: 'Cloud Firestore',
      category: 'database',
      technology: 'Firebase Core, Cloud Firestore',
      description: "Managed cloud database — stores and syncs user profile and session data backing the platform's business domains.",
      responsibilities: ['Cloud data storage', 'Data sync', 'Business state'],
      dependencies: ['profile_initialization', 'feature_extraction'],
      runtime: 'Managed/hosted by Firebase (SaaS)',
      deployment: 'External managed service — no self-hosted deployment',
      status: 'active',
    },
    {
      id: 'risk_inference_service',
      title: 'Risk Inference Service',
      category: 'ai',
      technology: 'Python (cloud_model/app.py)',
      description: 'Cloud-hosted ML service — serves real-time behavioral risk inference for the mobile client.',
      responsibilities: ['Model inference API', 'Risk/confidence scoring'],
      dependencies: ['risk_scoring', 'model_retraining'],
      runtime: 'Python service (cloud_model/app.py)',
      deployment: 'Deployed as a separate cloud service alongside the mobile app',
      status: 'active',
    },

    // Layer 5 — Business Domains (architectural boundaries, not internal workflow)
    {
      id: 'profile_initialization',
      title: 'Profile Initialization',
      category: 'backend',
      technology: 'Firestore + Flutter',
      description: 'Business domain governing baseline behavioral profile collection during user onboarding.',
      responsibilities: ['Baseline session tracking', 'Enrollment state'],
      dependencies: ['firebase_firestore'],
      runtime: 'Cloud Firestore-backed state',
      deployment: 'Deployed as part of the Firebase backend',
      status: 'active',
    },
    {
      id: 'feature_extraction',
      title: 'Feature Extraction',
      category: 'backend',
      technology: 'Dart (client) + Python (cloud_model)',
      description: 'Business domain governing transformation of raw sensor/interaction events into behavioral features (25+ signals).',
      responsibilities: ['Feature computation', 'Feature payload construction'],
      dependencies: ['firebase_firestore'],
      runtime: 'Client-side extraction, cloud-persisted',
      deployment: 'Deployed as part of the Flutter app and Firebase backend',
      status: 'active',
    },
    {
      id: 'risk_scoring',
      title: 'Risk Scoring',
      category: 'ai',
      technology: 'Not fully specified in current source material',
      description: 'Business domain governing model inference over extracted features to produce a live risk score.',
      responsibilities: ['Model inference', 'Risk/confidence scoring'],
      dependencies: ['risk_inference_service', 'feature_extraction'],
      tradeoffs: "Exact model architecture and scoring thresholds aren't specified in the current source material — represented here as a domain boundary rather than an implementation, to avoid inventing a scoring mechanism that hasn't been confirmed.",
      status: 'active',
    },
    {
      id: 'adaptive_response',
      title: 'Adaptive Response Engine',
      category: 'backend',
      technology: 'Flutter + Python (cloud_model)',
      description: 'Business domain governing the security response tier (allow/step-up/lock) chosen for a given risk score.',
      responsibilities: ['Risk-tier decisioning', 'Step-up auth triggers', 'Session lock triggers'],
      dependencies: ['risk_scoring'],
      runtime: 'Client-side decision handling, cloud-informed',
      deployment: 'Deployed as part of the Flutter app',
      status: 'active',
    },
    {
      id: 'model_retraining',
      title: 'Model Retraining',
      category: 'ai',
      technology: 'Python (cloud_model/retrain.py)',
      description: 'Business domain governing periodic retraining of the behavioral model as legitimate usage patterns evolve.',
      responsibilities: ['Retraining pipeline', 'Model refresh'],
      dependencies: ['risk_inference_service'],
      runtime: 'Python service (cloud_model/retrain.py)',
      deployment: 'Deployed as part of the cloud ML service',
      status: 'active',
    },
  ],
  edges: [
    { from: 'mobile_client', to: 'banking_dashboard' },
    { from: 'mobile_client', to: 'sensor_capture' },
    { from: 'mobile_client', to: 'biometric_enrollment' },
    { from: 'mobile_client', to: 'security_center' },
    { from: 'mobile_client', to: 'demo_console' },

    { from: 'banking_dashboard', to: 'flutter_app' },
    { from: 'sensor_capture', to: 'flutter_app' },
    { from: 'biometric_enrollment', to: 'flutter_app' },
    { from: 'security_center', to: 'flutter_app' },
    { from: 'demo_console', to: 'flutter_app' },

    { from: 'flutter_app', to: 'firebase_firestore', label: 'Data Sync' },
    { from: 'flutter_app', to: 'risk_inference_service', label: 'Risk API' },

    { from: 'firebase_firestore', to: 'profile_initialization' },
    { from: 'firebase_firestore', to: 'feature_extraction' },
    { from: 'risk_inference_service', to: 'risk_scoring' },
    { from: 'risk_inference_service', to: 'model_retraining' },

    { from: 'feature_extraction', to: 'risk_scoring' },
    { from: 'risk_scoring', to: 'adaptive_response' },
  ],
};

registerArchitecture(rakshachakraArchitecture);
