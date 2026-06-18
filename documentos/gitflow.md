# Corner Click - Gitflow Strategy

To maintain a clean and stable codebase, we are adopting the **Gitflow** branching model.

## Branching Structure

1. **`main`**: The production-ready branch. Code here is always stable and ready to be deployed.
2. **`develop`**: The active development branch. All new features and integrations are merged here first before making their way to `main`.
3. **`feature/*`**: Branches created for developing new features.
   - Example: `feature/firebase-integration`
   - Created from: `develop`
   - Merged back into: `develop`
4. **`hotfix/*`**: Branches for urgent fixes in production.
   - Created from: `main`
   - Merged back into: `main` and `develop`

## Workflow for New Features

1. Create a new branch from `develop`:
   ```bash
   git checkout develop
   git checkout -b feature/name-of-feature
   ```
2. Work on your feature and commit changes.
3. Merge back to `develop` when the feature is complete and tested:
   ```bash
   git checkout develop
   git merge feature/name-of-feature
   ```
4. Push `develop` to origin.
