using ScrumDumpsterMolecularDiagnostic.Data;
using ScrumDumpsterMolecularDiagnostic.Mappings;
using ScrumDumpsterMolecularDiagnostic.Repositories.Interfaces;
using ScrumDumpsterMolecularDiagnostic.Repositories.Interfaces.Auth;
using ScrumDumpsterMolecularDiagnostic.Repositories.LocalImplementation;
using ScrumDumpsterMolecularDiagnostic.Repositories.SQLImplementation;
using ScrumDumpsterMolecularDiagnostic.Repositories.SQLImplementation.Auth;
using ScrumDumpsterMolecularDiagnostic.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using System.Text;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;

var builder = WebApplication.CreateBuilder(args);
var config = builder.Configuration;

// ---------------------------------------------------------------------------
// Configuration checks. Fail fast with an actionable message instead of a
// NullReferenceException deep inside JWT validation.
// ---------------------------------------------------------------------------
var jwtKey = config["Jwt:Key"];
if (string.IsNullOrWhiteSpace(jwtKey) || Encoding.UTF8.GetByteCount(jwtKey) < 32)
{
    throw new InvalidOperationException(
        "Jwt:Key is missing or shorter than 32 bytes. Run scripts/dev-setup.sh (which stores a random key in " +
        "dotnet user-secrets) or set the environment variable Jwt__Key. Keys are never committed to the repo.");
}

builder.Services.AddControllers()
    .AddJsonOptions(o => o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddHttpContextAccessor();
builder.Services.AddSingleton(TimeProvider.System);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo { Title = "MIS API", Version = "v1", Description = "Medical Information Simulation — educational LIS simulation. Not for clinical use." });
    options.AddSecurityDefinition(JwtBearerDefaults.AuthenticationScheme, new OpenApiSecurityScheme
    {
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
    });
    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = JwtBearerDefaults.AuthenticationScheme } },
            new List<string>()
        }
    });
});

// ---------------------------------------------------------------------------
// Database. Database:Provider selects SqlServer (default; Docker locally) or
// Sqlite (tests, CI, and machines without Docker). Both contexts use the same
// provider; each has its own connection string / database.
// ---------------------------------------------------------------------------
var provider = config["Database:Provider"] ?? "SqlServer";
var isSqlite = provider.Equals("Sqlite", StringComparison.OrdinalIgnoreCase);

void ConfigureDb(DbContextOptionsBuilder options, string connectionName)
{
    var connectionString = config.GetConnectionString(connectionName)
        ?? throw new InvalidOperationException($"ConnectionStrings:{connectionName} is not configured. See api/README.md.");
    if (isSqlite) options.UseSqlite(connectionString);
    else options.UseSqlServer(connectionString, sql => sql.EnableRetryOnFailure(5));
}

builder.Services.AddDbContext<MedicalInformationDbContext>(o => ConfigureDb(o, "MedicalInformationConnectionString"));
builder.Services.AddDbContext<MedicalInformationAuthDbContext>(o => ConfigureDb(o, "MedicalInformationAuthConnectionString"));

// ---------------------------------------------------------------------------
// CORS. Allowed origins come from config (Cors:AllowedOrigins). The previous
// hard-coded http://localhost:3000 did not match the client's dev port.
// ---------------------------------------------------------------------------
var allowedOrigins = config.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? ["http://localhost:5173"];
builder.Services.AddCors(options =>
{
    options.AddPolicy("Client", policy => policy.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod());
});

// Repositories (original repository pattern kept) and services
builder.Services.AddScoped<IAdminRepository, SQLAdminRepository>();
builder.Services.AddScoped<IStudentRepository, SQLStudentRepository>();
builder.Services.AddScoped<IAdminQCLotRepository, SQLAdminQCLotRepository>();
builder.Services.AddScoped<IAnalyteRepository, SQLAnalyteRepository>();
builder.Services.AddScoped<IStudentReportRepository, SQLStudentReportRepository>();
builder.Services.AddScoped<IImageRepository, LocalImageRepository>();
builder.Services.AddScoped<ITokenRepository, TokenRepository>();
builder.Services.AddScoped<AccountService>();
builder.Services.AddScoped<DbSeeder>();

builder.Services.AddAutoMapper(typeof(AutoMapperProfiles));

builder.Services.AddIdentityCore<IdentityUser>()
    .AddRoles<IdentityRole>()
    .AddTokenProvider<DataProtectorTokenProvider<IdentityUser>>("MedicalInformationSimulation")
    .AddEntityFrameworkStores<MedicalInformationAuthDbContext>()
    .AddDefaultTokenProviders();

builder.Services.Configure<IdentityOptions>(options =>
{
    options.Password.RequireDigit = true;
    options.Password.RequireLowercase = true;
    options.Password.RequireUppercase = true;
    options.Password.RequireNonAlphanumeric = false;
    options.Password.RequiredLength = 8;
    options.Password.RequiredUniqueChars = 1;
    options.User.RequireUniqueEmail = true;
    options.Lockout.MaxFailedAccessAttempts = 5;
    options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(5);
});

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = config["Jwt:Issuer"],
            ValidAudience = config["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ClockSkew = TimeSpan.FromMinutes(1),
        };
    });

// Deny by default: every endpoint requires a signed-in user unless it opts out with [AllowAnonymous].
builder.Services.AddAuthorization(options =>
{
    options.FallbackPolicy = new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build();
});

// Sign-in and sign-up are limited per client IP (fixed window), on top of Identity's per-account lockout: lockout
// stops guessing one account's password, the limiter stops one client hammering many accounts or mass-registering.
// Behind a reverse proxy, configure ForwardedHeaders so RemoteIpAddress is the real client.
var authPermitsPerMinute = config.GetValue("RateLimit:AuthPermitsPerMinute", 20);
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy(RateLimitPolicies.Auth, http => RateLimitPartition.GetFixedWindowLimiter(
        http.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = authPermitsPerMinute, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));
    options.OnRejected = async (context, token) =>
    {
        if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
            context.HttpContext.Response.Headers.RetryAfter = ((int)retryAfter.TotalSeconds).ToString();
        await context.HttpContext.Response.WriteAsJsonAsync(new ProblemDetails
        {
            Status = StatusCodes.Status429TooManyRequests,
            Title = "Too many sign-in attempts from this device. Wait a minute and try again.",
        }, token);
    };
});

var app = builder.Build();

// ---------------------------------------------------------------------------
// Schema + seed. SQL Server applies EF migrations; SQLite uses EnsureCreated
// (migrations are generated for SQL Server only — see docs/DECISIONS.md).
// ---------------------------------------------------------------------------
if (config.GetValue("Database:ApplyMigrationsOnStartup", true))
{
    using var scope = app.Services.CreateScope();
    var appDb = scope.ServiceProvider.GetRequiredService<MedicalInformationDbContext>();
    var authDb = scope.ServiceProvider.GetRequiredService<MedicalInformationAuthDbContext>();
    if (isSqlite)
    {
        await appDb.Database.EnsureCreatedAsync();
        await authDb.Database.EnsureCreatedAsync();
    }
    else
    {
        await authDb.Database.MigrateAsync();
        await appDb.Database.MigrateAsync();
    }

    if (config.GetValue("Seed:Enabled", app.Environment.IsDevelopment()))
    {
        await scope.ServiceProvider.GetRequiredService<DbSeeder>().SeedAsync();
    }
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
else
{
    app.UseHttpsRedirection();
}

app.UseCors("Client");
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/api/health", () => Results.Ok(new { status = "ok" })).AllowAnonymous();
app.MapControllers();

app.Run();

/// <summary>Exposed so the integration tests can host the app with WebApplicationFactory.</summary>
public partial class Program { }

/// <summary>Named rate-limiter policies.</summary>
public static class RateLimitPolicies
{
    public const string Auth = "auth";
}
