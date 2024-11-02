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
    [Migration("20240417074924_Added lots, analytes and students tables")]
    partial class Addedlotsanalytesandstudentstables
    {
        /// <inheritdoc />
        protected override void BuildTargetModel(ModelBuilder modelBuilder)
        {
#pragma warning disable 612, 618
            modelBuilder
                .HasAnnotation("ProductVersion", "8.0.4")
                .HasAnnotation("Relational:MaxIdentifierLength", 128);

            SqlServerModelBuilderExtensions.UseIdentityColumns(modelBuilder);

            modelBuilder.Entity("Medical_Information.API.Models.Admin", b =>
                {
                    b.Property<Guid>("AdminID")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("uniqueidentifier");

                    b.Property<int>("Password")
                        .HasColumnType("int");

                    b.Property<string>("Username")
                        .IsRequired()
                        .HasColumnType("nvarchar(max)");

                    b.HasKey("AdminID");

                    b.ToTable("Admins");
                });

            modelBuilder.Entity("Medical_Information.API.Models.AdminQCLot", b =>
                {
                    b.Property<Guid>("AdminQCLotID")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("uniqueidentifier");

                    b.Property<DateTime?>("ClosedDate")
                        .HasColumnType("datetime2");

                    b.Property<int>("Department")
                        .HasColumnType("int");

                    b.Property<string>("LotNumber")
                        .IsRequired()
                        .HasColumnType("nvarchar(max)");

                    b.Property<DateTime>("OpenDate")
                        .HasColumnType("datetime2");

                    b.HasKey("AdminQCLotID");

                    b.ToTable("AdminQCLots");
                });

            modelBuilder.Entity("Medical_Information.API.Models.Analyte", b =>
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

                    b.Property<bool>("Electrolyte")
                        .HasColumnType("bit");

                    b.Property<string>("MaxLevel")
                        .IsRequired()
                        .HasColumnType("nvarchar(max)");

                    b.Property<string>("Mean")
                        .IsRequired()
                        .HasColumnType("nvarchar(max)");

                    b.Property<string>("MinLevel")
                        .IsRequired()
                        .HasColumnType("nvarchar(max)");

                    b.Property<string>("StdDevi")
                        .IsRequired()
                        .HasColumnType("nvarchar(max)");

                    b.Property<string>("UnitOfMeasure")
                        .IsRequired()
                        .HasColumnType("nvarchar(max)");

                    b.HasKey("AnalyteID");

                    b.HasIndex("AdminQCLotID");

                    b.ToTable("Analytes");
                });

            modelBuilder.Entity("Medical_Information.API.Models.Student", b =>
                {
                    b.Property<Guid>("StudentID")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("uniqueidentifier");

                    b.Property<string>("Password")
                        .IsRequired()
                        .HasColumnType("nvarchar(max)");

                    b.Property<string>("Username")
                        .IsRequired()
                        .HasColumnType("nvarchar(max)");

                    b.HasKey("StudentID");

                    b.ToTable("Students");
                });

            modelBuilder.Entity("Medical_Information.API.Models.Analyte", b =>
                {
                    b.HasOne("Medical_Information.API.Models.AdminQCLot", "AdminQCLot")
                        .WithMany("Analytes")
                        .HasForeignKey("AdminQCLotID")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.Navigation("AdminQCLot");
                });

            modelBuilder.Entity("Medical_Information.API.Models.AdminQCLot", b =>
                {
                    b.Navigation("Analytes");
                });
#pragma warning restore 612, 618
        }
    }
}
