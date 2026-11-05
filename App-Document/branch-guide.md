# Branch guide (quick start)

A short guide to the branches and their folders. Read it at the start of any work. The full rules are in `branch-architecture.md`, and
`feature-branches.json` (repo root) records which files belong to which feature.

## The three levels

```
          BASE                     MIDDLE                            FINAL
        ┌────────┐      ┌──── Features/App/Creta ───────┐
        │        │      ├──── Features/App/Nexon ───────┤
        │ matrix │ ───► ├──── Features/App/Youtube ─────┤ ───►  banni-linux
        │        │      ├──── Features/App/Khata ───────┤       (every app + Atrium HR,
        └────────┘      ├──── Features/App/snapTracker ─┤        deployed as thakurg.com)
     shared code only   ├──── Features/App/speedtest ───┤
     (not deployed)     └──── Features/App/Planner ─────┘
                          shared code + one app each
```

| Level | Branch | Holds | Home page (`/`) |
|---|---|---|---|
| Base | `matrix` | Only the shared code (login, header, footer, settings, roles, PWA, infrastructure, Common SQL, docs); not deployed | none |
| Middle | `Features/App/Creta` | Shared + Creta audio player (music code, Creta player only) | `/creta` |
| Middle | `Features/App/Nexon` | Shared + Nexon audio player (music code, Nexon player only) | `/nexon` |
| Middle | `Features/App/Youtube` | Shared + YouTube player | `/youtube` |
| Middle | `Features/App/Khata` | Shared + SnapKhata (landing page and ledger app, OTP, mail, SMS/WhatsApp, export) | `/khata/app` |
| Middle | `Features/App/snapTracker` | Shared + SnapTracker (prototype only so far) | `/profile` |
| Middle | `Features/App/speedtest` | Shared + Speed test | Speed test |
| Middle | `Features/App/Planner` | Shared + My Tasks (app code `tasks`: tasks, checklists, calendar, App Lock) | `/tasks/app` |
| Final | `banni-linux` | Everything: all features, Atrium HR (only here), the common login; deployed | Speed test |

**Not part of the flow:**
- `Mojito`: Angular only, with a demo backend. It is never merged into `banni-linux`.
- `main`, `master`, `base`, `old-master`: old stubs and old history. Never modify, merge into or rebase them.
- The remote default branch is `origin/Banni-linux` (capital B). The local branch is `banni-linux`.

## Folder for each branch

Each branch is checked out in its own git worktree, so you switch folders instead of switching branches.

| Folder | Branch |
|---|---|
| `D:\Project\POC - Alll\thakurg` | `banni-linux` (final) |
| `D:\Project\POC - Alll\thakurg-branches\matrix` | `matrix` (base) |
| `D:\Project\POC - Alll\thakurg-branches\Creta` | `Features/App/Creta` |
| `D:\Project\POC - Alll\thakurg-branches\Nexon` | `Features/App/Nexon` |
| `D:\Project\POC - Alll\thakurg-branches\Youtube` | `Features/App/Youtube` |
| `D:\Project\POC - Alll\thakurg-branches\Khata` | `Features/App/Khata` |
| `D:\Project\POC - Alll\thakurg-branches\snapTracker` | `Features/App/snapTracker` |
| `D:\Project\POC - Alll\thakurg-branches\speedtest` | `Features/App/speedtest` |
| `D:\Project\POC - Alll\thakurg-branches\Planner` | `Features/App/Planner` |
| `D:\Project\POC - Alll\thakurg-branches\Mojito` | `Mojito` |

`D:\Project\POC - Alll\tokyo-berlin` is a separate repository and is not part of this branch set.

Run `git worktree list` from any folder to see the current mapping. If an entry shows as `prunable`, the folder was renamed or moved. For
example, Planner was registered as `thakurg-branches\Tasks`. Fix it with `git worktree repair "<new folder path>"`.

## Where to make a change

| Change | Make it on (folder) | Then bring it forward |
|---|---|---|
| Shared code: login, header, pages, settings, infrastructure, Common SQL, docs | `matrix` | `git merge matrix` in every feature branch and in `banni-linux` |
| One app | that app's feature branch | `git merge Features/App/<Name>` in `banni-linux` |
| Music code that Creta and Nexon both use | Creta or Nexon | `git cherry-pick` the same commit to the other one, then merge both into `banni-linux` |
| Atrium HR | `banni-linux` | nothing |
| A truly common fix (for example the PWA/install files) | `matrix` | merge it down. Where it must also be typed on a branch, use identical content so the merge stays clean |

Make every change **once**, on the branch it belongs to. If the same fix is typed on both a feature branch and `banni-linux`, the merge conflicts.

## Release order (shared change through to deploy)

1. Commit on `matrix` (folder `thakurg-branches\matrix`).
2. In each feature folder, run `git merge matrix`, resolve conflicts, then build.
3. Make the feature's own changes on its branch.
4. In `D:\Project\POC - Alll\thakurg` (`banni-linux`), run `git merge Features/App/<Name>` for each branch that changed.
5. Build and check `banni-linux`. It is the deployed site.

Every commit, merge, cherry-pick and push needs the user's explicit approval each time (CLAUDE.md §0). The steps above say what to run. They are
not permission to run it.

## Never

1. Never merge `banni-linux` (or `main`) down into `matrix` or into a feature branch. It holds every app, so the merge would add all of them.
2. Never merge one feature branch into another. Creta and Nexon share code through cherry-pick only.
3. Never copy code that exists on `banni-linux` because of one app into other branches, even if it looks shared. For example, OTP, mail settings,
   profile details, export and SMS/WhatsApp all exist because of Khata. Don't try to "make branches equal to banni-linux".
4. A shared file must never import a feature file. If two features need the same code, that code is shared (for example
   `shared/models/player.model.ts`).

## Files that list a branch's own apps

These files differ on purpose. `matrix` lists no apps in them, each feature branch lists only its own app, and `banni-linux` lists all apps:

- `App-WebUI/src/app/feature-routes.ts`: the feature routes, `FEATURE_APPS`, and `FEATURE_SETTINGS` / `FEATURE_PROFILE` (each app's panels of the central Settings > General and Profile pages)
- `App-WebUI/angular.json`: the SnapKhata style bundle, only where Khata is
- `App-WebAPI/Thakurg/Thakurg.API/appsettings.json`: `AppManifests:Apps`
- `App-Prototype/assets/js/routes.js`
- `App-WebUI/src/app/pages/creta/music.routes.ts`, `music.pages.json`, `SqlScripts/INSERT/Music/001_MusicPlayers.sql`
- the `apps` list in each feature's `*.pages.json`

When a merge conflicts in one of these files, keep the branch's own list and take the rest of the change. On `banni-linux`, `.gitattributes`
marks these files `merge=ours`. Run `git config merge.ours.driver true` once per clone. Git applies the rule only when both sides changed the
file, so after every merge check that none of these files lost an app.

## How a feature plugs into shared code

Shared files call feature files through C# partial methods and lists. A branch that doesn't have a feature file still compiles, and most shared
files are identical on every branch.

| Area | Shared file | Feature file |
|---|---|---|
| API services | `Infrastructure/DependencyInjection.cs` | `DependencyInjection.<Feature>.cs` |
| API tables | `Persistence/CommonDbContext.cs`, `Application/Common/ICommonDbContext.cs` | `CommonDbContext.<Feature>.cs`, `ICommonDbContext.<Feature>.cs` |
| Database | `Seeding/SeederRegistration.cs` | `SeederRegistration.<App>.cs` + `SqlScripts/CREATE|INSERT/<App>/` |
| WebUI prerender / sitemap | `app.routes.server.ts`, `scripts/postbuild.mjs` | `pages/<feature>/*.pages.json` (found automatically) |
| WebUI settings / profile | `pages/config/general-tab` (Settings > General, one section per app), `pages/profile` | `FEATURE_SETTINGS` / `FEATURE_PROFILE` entries in `feature-routes.ts`, loading the app's own panel component lazily |

The seed rows in `Common/001_Messages.sql`, `003_Features.sql` and `007_Translations.sql` hold every feature's rows on every branch. This is on
purpose, because unused rows do no harm.

## Settings and profile

There is one Settings page (`/master`) and one Profile page (`/profile`) for every user. No app has its own settings or profile page.
- **Settings > General** lists one section per app the user can open: a super admin sees every app, anyone else only their own apps. Each section has:
  - the app's name, which only a super admin can rename (`PUT api/settings/app-names/{page}`, global in `PageNames`)
  - the app's site switches
  - the panel the app registers in `FEATURE_SETTINGS`
- **Keys tab:** the site's mail server, WhatsApp and quick logins (super admin with a password login).
- **Links from inside an app:** `/master?tab=general&app=<code>` opens that app's section, and `/profile` opens the profile.
- **New app setting:** add a panel component in the app's folder and list it in `FEATURE_SETTINGS` on that app's branch. Never add a settings page to the app.

## Adding a new file or a new app

- **New file for an existing app:** put it on that app's branch and add its path under the feature in `feature-branches.json` (on `matrix`).
  A file that isn't listed there counts as shared.
- **New app:** `git switch -c Features/App/<Name> matrix`. Add a worktree folder under `thakurg-branches\<Name>`, give the app its own
  partial/feature files, add it to `feature-branches.json`, then merge it into `banni-linux`.

## Checking where things stand

Run these from any worktree folder:

```
git worktree list                                  # folder for each branch
git branch -vv                                     # each branch against its remote (ahead/behind)
git log --oneline banni-linux..matrix              # matrix commits not yet in banni-linux
git log --oneline Features/App/Nexon..matrix       # matrix commits not yet merged into a feature branch
git log --oneline banni-linux..Features/App/Nexon  # feature commits not yet in banni-linux
```
