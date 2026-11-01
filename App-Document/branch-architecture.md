# Branch architecture

`matrix` holds the code every app uses. Each feature branch starts from `matrix` and **adds** its own feature. `main` is the merge of all of them.
Nothing is ever deleted to make a branch, so a feature branch never contains, or has in its history, another feature's files, and merging it into
`main` cannot delete anything there.

```
matrix ──┬── Features/App/Creta ───────┐
         ├── Features/App/Nexon ───────┤
         ├── Features/App/Youtube ─────┤
         ├── Features/App/Khata ───────┼──► main (everything + Atrium HR)
         ├── Features/App/snapTracker ─┤
         ├── Features/App/speedtest ───┤
         └─────────────────────────────┘
```

| Branch | Holds | Home page (`/`) |
|---|---|---|
| `matrix` | Only the shared code (no feature); not deployed | none |
| `Features/App/Creta` | Shared + Creta audio player (the music code, Creta only) | `/creta` |
| `Features/App/Nexon` | Shared + Nexon audio player (the music code, Nexon only) | `/nexon` |
| `Features/App/Youtube` | Shared + YouTube player | `/youtube` |
| `Features/App/Khata` | Shared + SnapKhata (landing page and ledger app) | `/khata/app` |
| `Features/App/snapTracker` | Shared + SnapTracker (prototype only; it has no WebUI, API or database code yet) | `/profile` |
| `Features/App/speedtest` | Shared + Speed test | Speed test |
| `main` | Everything: all features, Atrium HR (only here), the common login | Speed test |

## Where to make a change

| Change | Make it on | Then |
|---|---|---|
| Shared code (login, header, pages, settings, infrastructure, Common SQL, docs) | `matrix` | `git merge matrix` in every feature branch and in `main` |
| One feature | its feature branch | `git merge Features/App/<Name>` in `main` |
| Code Creta and Nexon both use (the music code) | one of them | bring the same commit to the other with `git cherry-pick`, then merge both into `main` |
| Atrium HR | `main` | nothing |

## Rules
1. **Never merge `main` into `matrix` or into a feature branch.** `main` has every feature; merging it down would add all of them to that branch.
2. **Never merge one feature branch into another**, for the same reason (Creta and Nexon share code through cherry-pick, not merge).
3. A shared file must not import a feature file. If two features need the same code, it is shared (for example `shared/models/player.model.ts`).
4. A new file of an existing feature goes on that feature's branch. Add its path to that feature in `feature-branches.json` (on `matrix`), which
   records which files belong to which feature.
5. A new feature: branch it from `matrix` (`git switch -c Features/App/<Name> matrix`), give it its own files (see below), and add it to
   `feature-branches.json`.
6. Never modify, merge into or rebase `master` (old line, not used).

## How a feature plugs in
Shared files call feature files through partial methods and lists, so most shared files are identical on every branch.

| Area | Shared file | Feature file it calls |
|---|---|---|
| API services | `Infrastructure/DependencyInjection.cs` (`static partial void Add<Feature>Feature`) | `DependencyInjection.<Feature>.cs` |
| API tables | `Persistence/CommonDbContext.cs`, `Application/Common/ICommonDbContext.cs` (partial) | `CommonDbContext.<Feature>.cs`, `ICommonDbContext.<Feature>.cs` |
| API rate limits | `Security/SecurityExtensions.cs` (`AddKhataRateLimits`, `IRateLimitRejectionHandler`) | `SecurityExtensions.Khata.cs`, `KhataRateLimitRejectionHandler.cs` |
| API settings | `Configurations/RateLimitOptions.cs` (partial) | `RateLimitOptions.Khata.cs` |
| Database | `Seeding/SeederRegistration.cs` (partial) | `SeederRegistration.<App>.cs` and the app's SQL folders |
| WebUI prerender/sitemap | `app.routes.server.ts`, `scripts/postbuild.mjs` | `pages/<feature>/*.pages.json` (found automatically) |

C# drops a call to a partial method that has no implementation, so a branch without the feature file still compiles.

**Files that differ per branch.** Each branch lists only its own features in these files; on `matrix` they list none, on `main` all:
- `App-WebUI/src/app/feature-routes.ts`: the feature routes and pages; a branch without the speed test sends `/` to its own app.
- `App-Prototype/assets/js/routes.js`: the prototype pages; a branch without the speed test sends `/` to its own app.
- Creta and Nexon: `pages/creta/music.routes.ts`, `pages/creta/music.pages.json`, `SqlScripts/INSERT/Music/001_MusicPlayers.sql` keep only their
  own player, and the prototype keeps only its own player page.

A change to one of these files on `matrix` conflicts in every branch: keep the branch's own list and take the rest of the change. Merging a branch
into `main` touches them only if the branch changed them; then keep `main`'s full list.

## Seed rows
`Common/001_Messages.sql`, `007_Translations.sql` and `003_Features.sql` keep every feature's rows on every branch on purpose (unused rows are harmless).

## Known gaps
- **Advertisements:** no advertisement code exists in any layer, so no branch has it.
- **SnapTracker:** only the prototype exists; its branch has no WebUI page, API or tables of its own yet (the app code `tracker` exists for access).
- **YouTube key panel on the Master page** is shared; in branches without YouTube its status call answers 404 and the panel shows the key as not set.
