# Release Automation Workflow

This project uses an automated, zero-dependency release workflow built on top of native npm scripts.

## How to Release a New Version

1. **Ensure your working tree is clean**
   Make sure all your changes are committed and your working directory is clean.

2. **Trigger the Version Bump**
   Depending on the scope of the release, run one of the following commands:

   ```bash
   # For backward-compatible bug fixes
   npm run release:patch

   # For new, backward-compatible features
   npm run release:minor
   ```

   **What happens under the hood:**
   - **`preversion` hook:** The script will first run `npm run typecheck` and `npm run test` to verify your local build. If these fail, the release process is aborted.
   - **`version` hook:** It will step the version in `package.json` and `package-lock.json`, generate a new entry template in `CHANGELOG.md`, and add it to the release commit. Everything is committed automatically by npm.

3. **Fill in the Changelog Details**
   The release commit has been created with placeholder text in `CHANGELOG.md`.
   - Open `CHANGELOG.md` in your editor.
   - Replace the `[Details here]` placeholders with the actual changes.
   - Save the file.

4. **Amend the Release Commit**
   Include your changelog updates in the existing release commit by amending it:

   ```bash
   git commit --amend --no-edit CHANGELOG.md
   ```

5. **Push the Release and Tags**
   Finally, push the new commit and the version tag to the remote repository. The CI will verify the build one more time on the remote end using the pushed tag.

   ```bash
   git push origin main --follow-tags
   ```

## Troubleshooting

If a test or typecheck fails during `preversion`, fix the underlying errors and try running `npm run release:patch` (or `minor`) again. No tags or commits are created until tests pass.
