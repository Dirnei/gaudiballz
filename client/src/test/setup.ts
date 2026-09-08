import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { MotionGlobalConfig } from 'motion/react';
import { afterEach } from 'vitest';

// Testing Library only registers its own cleanup when vitest runs with globals, which this
// project does not. Without this, every render in a file stacks up in the same document and
// queries start finding the previous test's markup.
afterEach(cleanup);

/**
 * Animations finish instantly under test.
 *
 * The screens cross-fade through AnimatePresence with mode="wait", so the incoming screen
 * does not mount until the outgoing one has finished leaving. Waiting on a real 200ms
 * animation makes every navigation a race against the query timeout — one that is won on an
 * idle machine and lost when the suite runs its files in parallel. Skipping animations makes
 * the transition synchronous, which is what these tests actually want to assert about.
 */
MotionGlobalConfig.skipAnimations = true;
