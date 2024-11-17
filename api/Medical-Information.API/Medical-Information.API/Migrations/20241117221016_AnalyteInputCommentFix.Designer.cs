﻿// <auto-generated />
using System;
using Medical_Information.API.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

#nullable disable

namespace Medical_Information.API.Migrations
{
    [DbContext(typeof(MedicalInformationDbContext))]
    [Migration("20241117221016_AnalyteInputCommentFix")]
    partial class AnalyteInputCommentFix
    {
        /// <inheritdoc />
        protected override void BuildTargetModel(ModelBuilder modelBuilder)
        {
#pragma warning disable 612, 618
            modelBuilder
                .HasAnnotation("ProductVersion", "8.0.8")
                .HasAnnotation("Relational:MaxIdentifierLength", 128);

            SqlServerModelBuilderExtensions.UseIdentityColumns(modelBuilder);

            modelBuilder.Entity("AdminStudent", b =>
                {
                    b.Property<Guid>("AdminsAdminID")
                        .HasColumnType("uniqueidentifier");

                    b.Property<Guid>("StudentsStudentID")
                        .HasColumnType("uniqueidentifier");

                    b.HasKey("AdminsAdminID", "StudentsStudentID");

                    b.HasIndex("StudentsStudentID");

                    b.ToTable("AdminStudent");
                });

            modelBuilder.Entity("Medical_Information.API.Models.Domain.Admin", b =>
                {
                    b.Property<Guid>("AdminID")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("uniqueidentifier");

                    b.Property<string>("Email")
                        .IsRequired()
                        .HasColumnType("nvarchar(max)");

                    b.Property<string>("Firstname")
                        .HasColumnType("nvarchar(max)");

                    b.Property<string>("Initials")
                        .IsRequired()
                        .HasColumnType("nvarchar(max)");

                    b.Property<string>("Lastname")
                        .HasColumnType("nvarchar(max)");

                    b.Property<string>("Username")
                        .IsRequired()
                        .HasColumnType("nvarchar(max)");

                    b.HasKey("AdminID");

                    b.ToTable("Admins");
                });

            modelBuilder.Entity("Medical_Information.API.Models.Domain.AdminQCLot", b =>
                {
                    b.Property<Guid>("AdminQCLotID")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("uniqueidentifier");

                    b.Property<DateTime?>("ClosedDate")
                        .HasColumnType("datetime2");

                    b.Property<int>("Department")
                        .HasColumnType("int");

                    b.Property<DateTime>("ExpirationDate")
                        .HasColumnType("datetime2");

                    b.Property<DateTime?>("FileDate")
                        .HasColumnType("datetime2");

                    b.Property<bool>("IsActive")
                        .HasColumnType("bit");

                    b.Property<string>("LotNumber")
                        .IsRequired()
                        .HasColumnType("nvarchar(450)");

                    b.Property<DateTime>("OpenDate")
                        .HasColumnType("datetime2");

                    b.Property<string>("QCName")
                        .IsRequired()
                        .HasColumnType("nvarchar(max)");

                    b.HasKey("AdminQCLotID");

                    b.HasIndex("LotNumber")
                        .IsUnique();

                    b.ToTable("AdminQCLots");
                });

            modelBuilder.Entity("Medical_Information.API.Models.Domain.Analyte", b =>
                {
                    b.Property<Guid>("AnalyteID")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("uniqueidentifier");

                    b.Property<Guid>("AdminQCLotID")
                        .HasColumnType("uniqueidentifier");

                    b.Property<string>("AnalyteAcronym")
                        .IsRequired()
                        .HasColumnType("nvarchar(max)");

                    b.Property<string>("AnalyteName")
                        .IsRequired()
                        .HasColumnType("nvarchar(max)");

                    b.Property<string>("ExpectedRange")
                        .HasColumnType("nvarchar(max)");

                    b.Property<float?>("MaxLevel")
                        .HasColumnType("real");

                    b.Property<float?>("Mean")
                        .HasColumnType("real");

                    b.Property<float?>("MinLevel")
                        .HasColumnType("real");

                    b.Property<float?>("StdDevi")
                        .HasColumnType("real");

                    b.Property<int>("Type")
                        .HasColumnType("int");

                    b.Property<string>("UnitOfMeasure")
                        .HasColumnType("nvarchar(max)");

                    b.HasKey("AnalyteID");

                    b.HasIndex("AdminQCLotID");

                    b.ToTable("Analytes");
                });

            modelBuilder.Entity("Medical_Information.API.Models.Domain.AnalyteInput", b =>
                {
                    b.Property<Guid>("AnalyteInputID")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("uniqueidentifier");

                    b.Property<string>("AnalyteName")
                        .IsRequired()
                        .HasColumnType("nvarchar(max)");

                    b.Property<string>("AnalyteValue")
                        .IsRequired()
                        .HasColumnType("nvarchar(max)");

                    b.Property<string>("Comment")
                        .HasColumnType("nvarchar(max)");

                    b.Property<Guid>("ReportID")
                        .HasColumnType("uniqueidentifier");

                    b.HasKey("AnalyteInputID");

                    b.HasIndex("ReportID");

                    b.ToTable("AnalyteInputs");
                });

            modelBuilder.Entity("Medical_Information.API.Models.Domain.Images", b =>
                {
                    b.Property<Guid>("ImageId")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("uniqueidentifier");

                    b.Property<string>("FileDescription")
                        .HasColumnType("nvarchar(max)");

                    b.Property<string>("FileExtension")
                        .IsRequired()
                        .HasColumnType("nvarchar(max)");

                    b.Property<string>("FileName")
                        .IsRequired()
                        .HasColumnType("nvarchar(max)");

                    b.Property<string>("FilePath")
                        .IsRequired()
                        .HasColumnType("nvarchar(max)");

                    b.Property<long>("FileSizeInBytes")
                        .HasColumnType("bigint");

                    b.HasKey("ImageId");

                    b.ToTable("Images");
                });

            modelBuilder.Entity("Medical_Information.API.Models.Domain.Student", b =>
                {
                    b.Property<Guid>("StudentID")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("uniqueidentifier");

                    b.Property<string>("Email")
                        .IsRequired()
                        .HasColumnType("nvarchar(max)");

                    b.Property<string>("Firstname")
                        .IsRequired()
                        .HasColumnType("nvarchar(max)");

                    b.Property<string>("Initials")
                        .IsRequired()
                        .HasColumnType("nvarchar(max)");

                    b.Property<string>("Lastname")
                        .IsRequired()
                        .HasColumnType("nvarchar(max)");

                    b.Property<string>("Username")
                        .IsRequired()
                        .HasColumnType("nvarchar(max)");

                    b.HasKey("StudentID");

                    b.ToTable("Students");
                });

            modelBuilder.Entity("Medical_Information.API.Models.Domain.StudentReport", b =>
                {
                    b.Property<Guid>("ReportID")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("uniqueidentifier");

                    b.Property<Guid>("AdminQCLotID")
                        .HasColumnType("uniqueidentifier");

                    b.Property<DateTime>("CreatedDate")
                        .HasColumnType("datetime2");

                    b.Property<Guid>("StudentID")
                        .HasColumnType("uniqueidentifier");

                    b.HasKey("ReportID");

                    b.HasIndex("AdminQCLotID");

                    b.HasIndex("StudentID");

                    b.ToTable("StudentReports");
                });

            modelBuilder.Entity("AdminStudent", b =>
                {
                    b.HasOne("Medical_Information.API.Models.Domain.Admin", null)
                        .WithMany()
                        .HasForeignKey("AdminsAdminID")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.HasOne("Medical_Information.API.Models.Domain.Student", null)
                        .WithMany()
                        .HasForeignKey("StudentsStudentID")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();
                });

            modelBuilder.Entity("Medical_Information.API.Models.Domain.Analyte", b =>
                {
                    b.HasOne("Medical_Information.API.Models.Domain.AdminQCLot", null)
                        .WithMany("Analytes")
                        .HasForeignKey("AdminQCLotID")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();
                });

            modelBuilder.Entity("Medical_Information.API.Models.Domain.AnalyteInput", b =>
                {
                    b.HasOne("Medical_Information.API.Models.Domain.StudentReport", null)
                        .WithMany("AnalyteInputs")
                        .HasForeignKey("ReportID")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();
                });

            modelBuilder.Entity("Medical_Information.API.Models.Domain.StudentReport", b =>
                {
                    b.HasOne("Medical_Information.API.Models.Domain.AdminQCLot", null)
                        .WithMany("Reports")
                        .HasForeignKey("AdminQCLotID")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.HasOne("Medical_Information.API.Models.Domain.Student", null)
                        .WithMany("Reports")
                        .HasForeignKey("StudentID")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();
                });

            modelBuilder.Entity("Medical_Information.API.Models.Domain.AdminQCLot", b =>
                {
                    b.Navigation("Analytes");

                    b.Navigation("Reports");
                });

            modelBuilder.Entity("Medical_Information.API.Models.Domain.Student", b =>
                {
                    b.Navigation("Reports");
                });

            modelBuilder.Entity("Medical_Information.API.Models.Domain.StudentReport", b =>
                {
                    b.Navigation("AnalyteInputs");
                });
#pragma warning restore 612, 618
        }
    }
}
