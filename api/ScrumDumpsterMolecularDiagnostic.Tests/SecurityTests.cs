using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace ScrumDumpsterMolecularDiagnostic.Tests;

/// <summary>Authentication and role/ownership rules enforced on the server.</summary>
public class SecurityTests : IClassFixture<MisApiFactory>
{
    private readonly MisApiFactory factory;

    public SecurityTests(MisApiFactory factory) => this.factory = factory;

    [Theory]
    [InlineData("/api/AdminQCLots")]
    [InlineData("/api/Reports")]
    [InlineData("/api/Students")]
    [InlineData("/api/Admins")]
    [InlineData("/api/Analytes")]
    [InlineData("/api/Auth/Me")]
    public async Task Anonymous_requests_are_rejected(string url)
    {
        var response = await factory.CreateClient().GetAsync(url);
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Health_endpoint_is_public()
    {
        var response = await factory.CreateClient().GetAsync("/api/health");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Forged_token_is_rejected()
    {
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new("Bearer",
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJodHRwOi8vc2NoZW1hcy5taWNyb3NvZnQuY29tL3dzLzIwMDgvMDYvaWRlbnRpdHkvY2xhaW1zL3JvbGUiOiJBZG1pbiJ9.invalidsignature");
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/Students")).StatusCode);
    }

    [Fact]
    public async Task Wrong_password_gets_generic_401()
    {
        var response = await factory.CreateClient().PostAsJsonAsync("/api/Auth/Login", new { username = "faculty", password = "nope" });
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        var unknown = await factory.CreateClient().PostAsJsonAsync("/api/Auth/Login", new { username = "nobody", password = "nope" });
        Assert.Equal(HttpStatusCode.Unauthorized, unknown.StatusCode);
    }

    [Fact]
    public async Task Login_by_email_works()
    {
        var response = await factory.CreateClient().PostAsJsonAsync("/api/Auth/Login", new { username = "faculty@mis.example.edu", password = MisApiFactory.FacultyPassword });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("faculty", body.GetProperty("user").GetProperty("role").GetString());
    }

    [Theory]
    [InlineData("GET", "/api/Students")]
    [InlineData("GET", "/api/Admins")]
    [InlineData("POST", "/api/AdminQCLots")]
    [InlineData("POST", "/api/Auth/RegisterFaculty")]
    public async Task Students_cannot_use_faculty_endpoints(string method, string url)
    {
        var student = await factory.Student();
        var request = new HttpRequestMessage(new HttpMethod(method), url) { Content = JsonContent.Create(new { }) };
        Assert.Equal(HttpStatusCode.Forbidden, (await student.SendAsync(request)).StatusCode);
    }

    [Fact]
    public async Task Student_cannot_grade_or_view_another_students_run()
    {
        var alex = await factory.Student("student");
        var jordan = await factory.Student("jlee");
        var alexRun = (await (await alex.GetAsync("/api/Reports")).Content.ReadFromJsonAsync<JsonElement>()).EnumerateArray().First();
        var id = alexRun.GetProperty("reportID").GetGuid();

        Assert.Equal(HttpStatusCode.NotFound, (await jordan.GetAsync($"/api/Reports/{id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await jordan.GetAsync($"/api/Reports/{id}/levey-jennings")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await alex.PostAsJsonAsync($"/api/Reports/{id}/grade", new { grade = 100 })).StatusCode);

        // Jordan's own list never contains Alex's runs.
        var jordanRuns = await (await jordan.GetAsync("/api/Reports")).Content.ReadFromJsonAsync<JsonElement>();
        Assert.DoesNotContain(jordanRuns.EnumerateArray(), r => r.GetProperty("reportID").GetGuid() == id);
    }

    [Fact]
    public async Task Public_registration_always_creates_a_student_even_if_admin_role_is_requested()
    {
        var client = factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/Auth/Register", new
        {
            username = "sneaky", email = "sneaky@mis.example.edu", password = "Sneaky123",
            firstname = "Sneaky", lastname = "User", initials = "SU", roles = new[] { "Admin" },
        });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var sneaky = await factory.ClientFor("sneaky", "Sneaky123");
        Assert.Equal(HttpStatusCode.Forbidden, (await sneaky.GetAsync("/api/Students")).StatusCode);
        var me = await (await sneaky.GetAsync("/api/Auth/Me")).Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("student", me.GetProperty("role").GetString());
    }

    [Fact]
    public async Task Registration_rejects_weak_password_and_duplicate_username()
    {
        var client = factory.CreateClient();
        var weak = await client.PostAsJsonAsync("/api/Auth/Register", new
        {
            username = "weakpw", email = "weak@mis.example.edu", password = "password", firstname = "W", lastname = "P", initials = "WP",
        });
        Assert.Equal(HttpStatusCode.BadRequest, weak.StatusCode);

        var dup = await client.PostAsJsonAsync("/api/Auth/Register", new
        {
            username = "student", email = "other@mis.example.edu", password = "Valid1234", firstname = "D", lastname = "U", initials = "DU",
        });
        Assert.Equal(HttpStatusCode.BadRequest, dup.StatusCode);
    }

    [Fact]
    public async Task Students_only_see_active_lots()
    {
        var student = await factory.Student();
        var lots = await (await student.GetAsync("/api/AdminQCLots")).Content.ReadFromJsonAsync<JsonElement>();
        Assert.All(lots.EnumerateArray(), l => Assert.True(l.GetProperty("isActive").GetBoolean()));

        var faculty = await factory.Faculty();
        var all = await (await faculty.GetAsync("/api/AdminQCLots")).Content.ReadFromJsonAsync<JsonElement>();
        Assert.Contains(all.EnumerateArray(), l => !l.GetProperty("isActive").GetBoolean());
    }
}
