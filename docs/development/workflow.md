# Team Git Workflow & Branch Synchronization

> **Engineering Workflow, Branching Strategy & Release Standards for YɛnCare**

---

## 1. Branching Strategy

The YɛnCare team follows a feature-branch workflow centered on the `main` branch.

### 1.1 Branch Naming Conventions
All development happens on dedicated feature or bugfix branches created from `main`:

| Prefix | Use Case | Example |
|---|---|---|
| `feat/` | New functionality or API feature | `feat/patient-registration-api`, `feat/appointment-booking` |
| `fix/` | Bug fixes or issue corrections | `fix/frontend-vite-syntax-error`, `fix/sms-number-parsing` |
| `docs/` | Documentation additions or updates | `docs/api-contracts`, `docs/architecture-audit` |
| `refactor/` | Code structure improvements without behavior change | `refactor/database-indexes`, `refactor/patient-validation` |
| `test/` | Adding or updating automated tests | `test/patient-http-endpoints` |

---

## 2. Keeping Feature Branches Synchronized with `main`

To prevent massive merge conflicts and ensure code is tested against the latest team changes, **synchronize your feature branch with `main` daily and immediately before submitting a pull request**.

### Recommended Synchronization Workflow

```bash
# 1. Fetch all latest changes from remote
git fetch origin

# 2. Switch to main and pull the latest commits
git checkout main
git pull origin main

# 3. Switch back to your working feature branch
git checkout feat/your-feature-name

# 4. Merge main into your feature branch
git merge main

# 5. Resolve any merge conflicts in your editor, run tests, and commit the merge
npm --prefix backend test
git commit -m "Merge main into feat/your-feature-name"

# 6. Push updated branch to remote
git push origin feat/your-feature-name
```

> [!TIP]
> Always verify that automated backend tests (`npm --prefix backend test`) and frontend builds (`npm run build`) pass cleanly after merging `main`.

---

## 3. Commit Message Conventions

We adhere to the **Conventional Commits** specification:

```text
<type>(<scope>): <short description in present tense>

[optional body explaining rationale]
```

### Examples
- `feat(backend): add patient registration and lookup API`
- `fix(frontend): resolve syntaxerror on vite dev server startup`
- `feat(sms): integrate mNotify provider for live Ghana handset delivery`
- `docs(api): document HTTP status codes and curl examples for /api/patients`

---

## 4. Pre-Flight Pull Request Checklist

Before opening a pull request to merge into `main`, ensure:

1. **Backend Tests Pass**:
   ```bash
   npm --prefix backend test
   ```
   All 66 unit and integration tests must pass without errors.
2. **Prototype Builds Cleanly**:
   ```bash
   npm run build
   ```
   Ensures TypeScript compilation succeeds and Vite bundles without errors.
3. **Frontend Builds Cleanly**:
   ```bash
   npm --prefix frontend run build
   ```
4. **No Secrets in Code**:
   Confirm no real API keys (`MNOTIFY_API_KEY`, `AT_API_KEY`), passwords, or private environment files are being committed (`git status`).
5. **Branch is Synchronized**:
   `main` has been merged into the feature branch with zero remaining conflicts.

---

## 5. Code Review & Merging

- Pull requests require review and approval from at least one teammate.
- Once approved, merge using **Squash & Merge** or a **Merge Commit** with a clean summary of changes.
- Delete the remote feature branch upon successful merge to maintain repository hygiene.
