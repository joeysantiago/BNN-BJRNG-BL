using DatabaseInitializer.Configuration;
using DatabaseInitializer.Providers;
using DatabaseInitializer.Seeding;
using DatabaseInitializer.SqlScripts;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

var builder = Host.CreateApplicationBuilder(args);

var providerOptions = builder.Configuration.GetSection(DatabaseProviderOptions.SectionName).Get<DatabaseProviderOptions>() ?? new DatabaseProviderOptions();

if (providerOptions.UseLocalServer == providerOptions.UseAzureSqlServer)
    throw new InvalidOperationException($"Exactly one of {DatabaseProviderOptions.SectionName}:UseLocalServer or {DatabaseProviderOptions.SectionName}:UseAzureSqlServer must be true.");

builder.Services.AddSingleton<ILocalSqlServer, LocalSqlServer>();
builder.Services.AddSingleton<IAzureSqlServer, AzureSqlServer>();

if (providerOptions.UseAzureSqlServer)
    builder.Services.AddSingleton<IDatabaseProvisioner>(sp => sp.GetRequiredService<IAzureSqlServer>());
else
    builder.Services.AddSingleton<IDatabaseProvisioner>(sp => sp.GetRequiredService<ILocalSqlServer>());

builder.Services.AddSingleton<ISqlScriptRunner, SqlScriptRunner>();
builder.Services.AddSingleton<ISeederConfirmation, ConsoleSeederConfirmation>();

// One seeder per app folder in SqlScripts/CREATE and SqlScripts/INSERT. Registration order is the order the apps are asked about and run.
builder.Services.AddSingleton<IDatabaseSeeder, CommonDatabaseSeeder>();
builder.Services.AddSingleton<IDatabaseSeeder, MusicDatabaseSeeder>();
builder.Services.AddSingleton<IDatabaseSeeder, SnapKhataDatabaseSeeder>();
builder.Services.AddSingleton<IDatabaseSeedingOrchestrator, DatabaseSeedingOrchestrator>();

using var host = builder.Build();

await host.Services.GetRequiredService<IDatabaseSeedingOrchestrator>().RunAsync(CancellationToken.None);
