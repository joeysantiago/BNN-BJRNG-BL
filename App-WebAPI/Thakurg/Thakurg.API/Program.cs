using Thakurg.Contracts.Configurations;
using Thakurg.Infrastructure;
using Thakurg.Infrastructure.Middleware;
using Thakurg.Infrastructure.Security;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var providerOptions = builder.Configuration.GetSection(DatabaseProviderOptions.SectionName).Get<DatabaseProviderOptions>() ?? new DatabaseProviderOptions();

if (providerOptions.UseLocalServer == providerOptions.UseAzureSqlServer)
    throw new InvalidOperationException($"Exactly one of {DatabaseProviderOptions.SectionName}:UseLocalServer or {DatabaseProviderOptions.SectionName}:UseAzureSqlServer must be true.");

var connectionName = providerOptions.UseAzureSqlServer ? "AzureSQLConnection" : "MSSQLServer";
var commonConnection = builder.Configuration.GetConnectionString(connectionName) ?? throw new InvalidOperationException($"{connectionName} is not configured.");

builder.Services.AddThakurgServices(builder.Configuration);
builder.Services.AddThakurgProxy(builder.Configuration);
builder.Services.AddThakurgRateLimiting(builder.Configuration);
builder.Services.AddKhataAuthentication(builder.Configuration, builder.Environment);
builder.Services.AddCommonDbContext(commonConnection);

var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? Array.Empty<string>();
builder.Services.AddCors(options =>
{
    options.AddPolicy("ThakurgCorsPolicy",
        policy => policy.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod().AllowCredentials().WithExposedHeaders("Content-Range", "Content-Length", "Accept-Ranges", "Content-Disposition"));
});

var app = builder.Build();

app.UseThakurgProxy();
app.UseCors("ThakurgCorsPolicy");
app.UseMiddleware<ExceptionMiddleware>();
app.UseAuthentication();
app.UseRateLimiter();
app.UseAuthorization();

if (app.Environment.IsDevelopment() || app.Environment.IsEnvironment("QA"))
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.MapControllers();

app.Run();
