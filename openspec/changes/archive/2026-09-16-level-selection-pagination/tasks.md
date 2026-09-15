## 1. Pagination and Sort Tests

- [x] 1.1 Add tests for descending tile order within a page
- [x] 1.2 Add tests for page slicing (50-level pages, last page with remainder)
- [x] 1.3 Add test for default page selection based on current level
- [x] 1.4 Add tests for page navigation controls (next/prev, disabled at boundaries)

## 2. Core Pagination Logic

- [x] 2.1 Compute total displayable tile count and page count from ceiling
- [x] 2.2 Derive the tile range for the current page in descending order
- [x] 2.3 Compute the initial page index from the player's current level
- [x] 2.4 Add page state (useState) and page navigation handlers

## 3. Page Navigation UI

- [x] 3.1 Add previous/next page controls with disabled state at boundaries
- [x] 3.2 Add page position indicator (e.g. "Page 1 of 3")
- [x] 3.3 Update keyboard navigation to stay within the visible page

## 4. Verification

- [x] 4.1 Run existing LevelSelect tests to confirm no regressions
- [x] 4.2 Rebuild Docker image and verify pagination in the browser
