# Contributing

Thanks for helping. All changes go through pull requests; `main` is protected.

1. Fork the repo and create a branch from `main`.
2. Make your change. Keep it small and focused; one idea per PR.
3. Run the tests (macOS):
   ```bash
   python3 -m unittest discover -s tests -p 'test_*.py'
   for t in tests/test_*.js; do node "$t"; done
   ```
   Try it end to end without side effects: `./deepwork 1 --dry-run`.
4. Open a pull request describing what changed and why. CI runs the same tests.

Ground rules:

- deepwork never closes or kills browser tabs or Chrome itself.
- Nothing leaves the user's Mac unless they opted in. New tracking must be covered by the `tracking` setting.
- New behavior that some people won't want belongs behind a setting in `~/.deepwork/config.json`, with the current behavior as the default.
- Standard library only for the CLI (no pip installs).

Found a bug or have an idea? Open an issue first if the change is large.
