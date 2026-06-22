# Task 7 — Report

## Bug

In `src/modules/quiz/quiz.service.ts`, the `list()` method returned `total: quizzes.length` which is the page size, not the total matching records across all pages.

## Fix

1. Added `sql` to the drizzle-orm import.
2. Added a separate `count(*)` query before the data query to get the true total number of records matching the user's filter, regardless of pagination.
3. Used the count result (`total`) in the return object instead of `quizzes.length`.

## Verification

The returned `total` now reflects the actual number of quizzes belonging to the user, not the current page size.
