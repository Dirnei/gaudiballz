## 1. Pagination and Sort Tests

- [ ] 1.1 Add tests for descending tile order within a page
- [ ] 1.2 Add tests for page slicing (50-level pages, last page with remainder)
- [ ] 1.3 Add test for default page selection based on current level
- [ ] 1.4 Add tests for page navigation controls (next/prev, disabled at boundaries)

## 2. Core Pagination Logic

- [ ] 2.1 Compute total displayable tile count and page count from ceiling
- [ ] 2.2 Derive the tile range for the current page in descending order
- [ ] 2.3 Compute the initial page index from the player's current level
- [ ] 2.4 Add page state (useState) and page navigation handlers

## 3. Page Navigation UI

- [ ] 3.1 Add previous/next page controls with disabled state at boundaries
- [ ] 3.2 Add page position indicator (e.g. "Page 1 of 3")
- [ ] 3.3 Update keyboard navigation to stay within the visible page

## 4. Verification

- [ ] 4.1 Run existing LevelSelect tests to confirm no regressions
- [ ] 4.2 Rebuild Docker image and verify pagination in the browser
