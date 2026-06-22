# Task 4 Report

**Status:** DONE
**Commit:** f57b857
**Files:** src/shared/errors.ts, src/shared/pagination.ts
**Test:** Pure TypeScript — no runtime deps. Compiles cleanly.
**Concerns:** None reported by implementer.

---

## Fix: `this.name` in Error subclasses (2026-06-21)

**Problem:** `AppError`, `NotFoundError`, and `UnauthorizedError` did not set `this.name`. When extending built-in `Error` in TypeScript, `this.name` defaults to `'Error'` instead of the class name.

**Fix:** Added `this.name = 'AppError'` (etc.) in each constructor, right after `super()`.

**Verification:**
```
$ npx tsx -e "const { AppError, NotFoundError, UnauthorizedError } = require('./src/shared/errors'); console.log(new AppError('test').name); console.log(new NotFoundError('User').name); console.log(new UnauthorizedError().name);"
AppError
NotFoundError
UnauthorizedError
```

**Commit:** `fix: adicionar this.name nas classes de erro`
