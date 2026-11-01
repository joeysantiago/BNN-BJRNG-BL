namespace DatabaseInitializer.Seeding;

public interface IDatabaseSeedingOrchestrator
{
    Task RunAsync(CancellationToken cancellationToken);
}
