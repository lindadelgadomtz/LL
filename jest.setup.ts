// jest.setup.ts
import '@testing-library/jest-dom';

// Env defaults for tests (override in individual tests if needed)
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'test-key';
process.env.OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
process.env.AI_FALLBACK_ENABLED = process.env.AI_FALLBACK_ENABLED || 'true';

// Node 18 has fetch/Request/Response globally; if your local Node <18, you'd polyfill here.
