/** Where every app keeps its files (GET /admin/storage). The Azure connection string is never sent: azureReady says the server has one. */
export interface StorageSetting {
  provider: string;
  localRoot: string;
  azureReady: boolean;
  containerName: string;
  environmentFolder: string;
}
