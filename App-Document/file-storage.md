# File storage (local or Azure Blob)

Every app keeps its files through one shared store, `IFileStore` (`Thakurg.Application/Storage`). No service reads or writes the disk or a Blob container itself.

## One switch for the whole site

- **Where it is set:** Settings > Keys > File storage, by a super admin. It is saved in `AppSettings` as `Storage.Provider` (`azure` or `local`), and the seed value is `azure`.
- **What it controls:** every app reads and saves files **only** in the chosen store. Before you switch, use the copy buttons on the same card: "Copy local files to Azure" or "Copy Azure files to local". A copy keeps each path and skips files that are already there with the same size.
- **When Azure can be chosen:** only when the server has the connection string. It is read from the configuration value named in `FileStorage:ConnectionStringName` (`AzureStorageConnectionString`, an App Service environment variable or a connection string of that name). It is never written in appsettings.

## Layout

A path is `<app folder>/<file>`, with a lower-case app folder:

| Store | Where a file goes | Example |
|---|---|---|
| Local | `FileStorage:LocalRoot` / path | `App-Data/creta/Tum Hi Ho Aashiqui 2 320 Kbps.mp3` |
| Azure | container `FileStorage:ContainerName` / `FileStorage:EnvironmentFolder` / path | `app-data/QA/creta/Tum Hi Ho Aashiqui 2 320 Kbps.mp3` |

| Environment | `EnvironmentFolder` |
|---|---|
| Development | `dev` |
| QA | `QA` |
| UAT | `UAT` |
| Live (thakurg.com) | `thakurg` |

The app folders are `creta`, `nexon`, `avatars`, `khata` and `tasks`. A new app (for example employee photos and documents) picks its own lower-case folder and saves through `IFileStore`.

## Code

- `IFileStore` (scoped `FileStore`) sends each call to the chosen backend. The choice is cached for `FileStorage:CacheSeconds` and cleared when it is saved.
- The backends are `LocalFileStore` and `AzureBlobFileStore` (`Thakurg.Infrastructure/Storage`, both `IFileBackend`).
- A blob stream can seek and knows its length, so songs are still served in packets (Range requests) from Azure.
- The container is created on first use.
- A path with `.` or `..` is refused. A local path never leaves `LocalRoot`.
- API: `GET/PUT api/admin/storage`, `POST api/admin/storage/test` and `POST api/admin/storage/copy/{local|azure}`. These are for a super admin with a password login only.
