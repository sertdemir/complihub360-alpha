import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';

// Testing Library already unmounts in its own afterEach (it registers one as
// soon as it is imported, because vitest runs with globals: true). This is the
// other half: unmount *before* each test as well.
//
// afterEach alone is not enough when a test dies while a render is still in
// flight — a timeout, say. Vitest abandons the test function, the afterEach
// sweeps an empty body, and the abandoned promise then mounts a tree that no
// test owns. The next test starts with a stranger's DOM already on screen and
// fails on duplicate matches, which points the finger at the wrong test.
// Sweeping on the way in keeps a broken test's damage inside that test.
beforeEach(() => {
  cleanup();
});
