import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Testing Library only registers its own cleanup when vitest runs with globals, which this
// project does not. Without this, every render in a file stacks up in the same document and
// queries start finding the previous test's markup.
afterEach(cleanup);
