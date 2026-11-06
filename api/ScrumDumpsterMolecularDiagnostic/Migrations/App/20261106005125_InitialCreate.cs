using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ScrumDumpsterMolecularDiagnostic.Migrations.App
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AdminQCLots",
                columns: table => new
                {
                    AdminQCLotID = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    QCName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    LotNumber = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    OpenDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ClosedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ExpirationDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    FileDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    Department = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AdminQCLots", x => x.AdminQCLotID);
                });

            migrationBuilder.CreateTable(
                name: "Admins",
                columns: table => new
                {
                    AdminID = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Username = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Email = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Firstname = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Lastname = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Initials = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Admins", x => x.AdminID);
                });

            migrationBuilder.CreateTable(
                name: "Images",
                columns: table => new
                {
                    ImageId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FileName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    FileDescription = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    FileExtension = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    FileSizeInBytes = table.Column<long>(type: "bigint", nullable: false),
                    FilePath = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Images", x => x.ImageId);
                });

            migrationBuilder.CreateTable(
                name: "Students",
                columns: table => new
                {
                    StudentID = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Username = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Email = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Firstname = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Lastname = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Initials = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Students", x => x.StudentID);
                });

            migrationBuilder.CreateTable(
                name: "Analytes",
                columns: table => new
                {
                    AnalyteID = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AnalyteName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    AnalyteAcronym = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    UnitOfMeasure = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    MinLevel = table.Column<double>(type: "float", nullable: false),
                    MaxLevel = table.Column<double>(type: "float", nullable: false),
                    Mean = table.Column<double>(type: "float", nullable: false),
                    StdDevi = table.Column<double>(type: "float", nullable: false),
                    AdminQCLotID = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Analytes", x => x.AnalyteID);
                    table.ForeignKey(
                        name: "FK_Analytes_AdminQCLots_AdminQCLotID",
                        column: x => x.AdminQCLotID,
                        principalTable: "AdminQCLots",
                        principalColumn: "AdminQCLotID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AdminStudent",
                columns: table => new
                {
                    AdminsAdminID = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    StudentsStudentID = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AdminStudent", x => new { x.AdminsAdminID, x.StudentsStudentID });
                    table.ForeignKey(
                        name: "FK_AdminStudent_Admins_AdminsAdminID",
                        column: x => x.AdminsAdminID,
                        principalTable: "Admins",
                        principalColumn: "AdminID",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AdminStudent_Students_StudentsStudentID",
                        column: x => x.StudentsStudentID,
                        principalTable: "Students",
                        principalColumn: "StudentID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "StudentReports",
                columns: table => new
                {
                    ReportID = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    StudentID = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AdminQCLotID = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(16)", maxLength: 16, nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    RunDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    SubmittedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    StudentComment = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    Grade = table.Column<int>(type: "int", nullable: true),
                    FacultyComment = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    ReviewedByAdminID = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ReviewedDate = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StudentReports", x => x.ReportID);
                    table.ForeignKey(
                        name: "FK_StudentReports_AdminQCLots_AdminQCLotID",
                        column: x => x.AdminQCLotID,
                        principalTable: "AdminQCLots",
                        principalColumn: "AdminQCLotID",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_StudentReports_Students_StudentID",
                        column: x => x.StudentID,
                        principalTable: "Students",
                        principalColumn: "StudentID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AnalyteInputs",
                columns: table => new
                {
                    AnalyteInputID = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ReportID = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AnalyteID = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AnalyteName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    AnalyteValue = table.Column<double>(type: "float", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AnalyteInputs", x => x.AnalyteInputID);
                    table.ForeignKey(
                        name: "FK_AnalyteInputs_StudentReports_ReportID",
                        column: x => x.ReportID,
                        principalTable: "StudentReports",
                        principalColumn: "ReportID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AdminQCLots_LotNumber",
                table: "AdminQCLots",
                column: "LotNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Admins_Username",
                table: "Admins",
                column: "Username",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AdminStudent_StudentsStudentID",
                table: "AdminStudent",
                column: "StudentsStudentID");

            migrationBuilder.CreateIndex(
                name: "IX_AnalyteInputs_ReportID",
                table: "AnalyteInputs",
                column: "ReportID");

            migrationBuilder.CreateIndex(
                name: "IX_Analytes_AdminQCLotID",
                table: "Analytes",
                column: "AdminQCLotID");

            migrationBuilder.CreateIndex(
                name: "IX_StudentReports_AdminQCLotID",
                table: "StudentReports",
                column: "AdminQCLotID");

            migrationBuilder.CreateIndex(
                name: "IX_StudentReports_Status",
                table: "StudentReports",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_StudentReports_StudentID_AdminQCLotID",
                table: "StudentReports",
                columns: new[] { "StudentID", "AdminQCLotID" });

            migrationBuilder.CreateIndex(
                name: "IX_Students_Username",
                table: "Students",
                column: "Username",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AdminStudent");

            migrationBuilder.DropTable(
                name: "AnalyteInputs");

            migrationBuilder.DropTable(
                name: "Analytes");

            migrationBuilder.DropTable(
                name: "Images");

            migrationBuilder.DropTable(
                name: "Admins");

            migrationBuilder.DropTable(
                name: "StudentReports");

            migrationBuilder.DropTable(
                name: "AdminQCLots");

            migrationBuilder.DropTable(
                name: "Students");
        }
    }
}
