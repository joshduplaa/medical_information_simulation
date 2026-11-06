using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace ScrumDumpsterMolecularDiagnostic.Tests;

/// <summary>
/// Hosts the real API (real controllers, Identity, JWT validation, EF Core) on an in-memory SQLite database
/// that is created and seeded with the synthetic demo data for each factory instance.
/// </summary>
public sealed class MisApiFactory : WebApplicationFactory<Program>
{
    private readonly string id = Guid.NewGuid().ToString("N");
    // Shared-cache in-memory databases live only while at least one connection is open.
    private readonly SqliteConnection appKeepAlive;
    private readonly SqliteConnection authKeepAlive;

    public const string FacultyPassword = "Faculty123!";
    public const string StudentPassword = "Student123!";

    public static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web) { Converters = { new JsonStringEnumConverter() } };

    private readonly IReadOnlyDictionary<string, string> overrides;

    public MisApiFactory() : this(new Dictionary<string, string>()) { }

    /// <summary>A separate app instance with extra configuration for one test, e.g. a low rate limit.</summary>
    public static MisApiFactory With(IReadOnlyDictionary<string, string> overrides) => new(overrides);

    // Private: xUnit class fixtures must have exactly one public constructor.
    private MisApiFactory(IReadOnlyDictionary<string, string> overrides)
    {
        this.overrides = overrides;
        appKeepAlive = new SqliteConnection(AppCs);
        authKeepAlive = new SqliteConnection(AuthCs);
        appKeepAlive.Open();
        authKeepAlive.Open();
    }

    private string AppCs => $"Data Source=file:mis-app-{id}?mode=memory&cache=shared";
    private string AuthCs => $"Data Source=file:mis-auth-{id}?mode=memory&cache=shared";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        // UseSetting (not ConfigureAppConfiguration) so values are visible to code that reads config before Build().
        builder.UseSetting("Database:Provider", "Sqlite");
        builder.UseSetting("ConnectionStrings:MedicalInformationConnectionString", AppCs);
        builder.UseSetting("ConnectionStrings:MedicalInformationAuthConnectionString", AuthCs);
        builder.UseSetting("Jwt:Key", "test-only-signing-key-that-is-long-enough-0123456789");
        builder.UseSetting("Jwt:Issuer", "mis-api");
        builder.UseSetting("Jwt:Audience", "mis-client");
        builder.UseSetting("Seed:Enabled", "true");
        // Every test request shares one client address, so lift the per-IP auth limit unless a test sets it.
        builder.UseSetting("RateLimit:AuthPermitsPerMinute", "100000");
        foreach (var (key, value) in overrides) builder.UseSetting(key, value);
    }

    public async Task<HttpClient> ClientFor(string username, string password)
    {
        var client = CreateClient();
        var response = await client.PostAsJsonAsync("/api/Auth/Login", new { username, password });
        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", body.GetProperty("jwtToken").GetString());
        return client;
    }

    public Task<HttpClient> Faculty() => ClientFor("faculty", FacultyPassword);
    public Task<HttpClient> Student(string username = "student") => ClientFor(username, StudentPassword);

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (disposing)
        {
            appKeepAlive.Dispose();
            authKeepAlive.Dispose();
        }
    }
}
