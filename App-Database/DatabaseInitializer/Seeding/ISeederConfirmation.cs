namespace DatabaseInitializer.Seeding;

public interface ISeederConfirmation
{
    bool Confirm(IDatabaseSeeder seeder);
}
