﻿using ScrumDumpsterMolecularDiagnostic.Models.Domain;
using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;

namespace ScrumDumpsterMolecularDiagnostic.Models.DTO
{
    public class StudentReportDTO
    {
        public Guid ReportID { get; set; }
        public Guid StudentID { get; set; }
        public Guid AdminQCLotID { get; set; }
        public DateTime CreatedDate { get; set; } = DateTime.Now;
        public ICollection<AnalyteInput> AnalyteInputs { get; set; } = [];
    }
}
