using ScrumDumpsterMolecularDiagnostic.Enums;
using ScrumDumpsterMolecularDiagnostic.Models.Domain;
using ScrumDumpsterMolecularDiagnostic.Models.DTO;

namespace ScrumDumpsterMolecularDiagnostic.Services
{
    /// <summary>
    /// State transitions for a student QC run. Each method either applies the change and returns null,
    /// or returns a human-readable reason the change is not allowed (the controller turns that into a 409/400).
    /// Kept free of EF and HTTP so the rules can be unit tested directly.
    /// </summary>
    public static class ReportWorkflow
    {
        public static bool IsEditable(StudentReport r) =>
            r.Status is ReportStatus.InProgress or ReportStatus.Returned;

        public static string? SaveResults(StudentReport report, IReadOnlyCollection<Analyte> lotAnalytes, SaveResultsRequestDTO dto)
        {
            if (!IsEditable(report))
                return $"Results can only be edited while the run is In Progress or Returned (it is {report.Status}).";

            var byId = lotAnalytes.ToDictionary(a => a.AnalyteID);
            foreach (var input in dto.Inputs)
            {
                if (!byId.ContainsKey(input.AnalyteID))
                    return $"Analyte {input.AnalyteID} does not belong to this QC lot.";
                if (double.IsNaN(input.AnalyteValue) || double.IsInfinity(input.AnalyteValue))
                    return $"A numeric value is required for {byId[input.AnalyteID].AnalyteName}.";
            }
            if (dto.Inputs.GroupBy(i => i.AnalyteID).Any(g => g.Count() > 1))
                return "Each analyte can only have one result per run.";

            // Upsert: replace values for analytes that were sent, keep the rest.
            foreach (var input in dto.Inputs)
            {
                var existing = report.AnalyteInputs.FirstOrDefault(i => i.AnalyteID == input.AnalyteID);
                if (existing == null)
                {
                    report.AnalyteInputs.Add(new AnalyteInput
                    {
                        // Key left unset on purpose: EF Core treats a tracked child with a non-default key as an
                        // existing row (UPDATE → 0 rows → DbUpdateConcurrencyException). An empty key makes it an INSERT.
                        ReportID = report.ReportID,
                        AnalyteID = input.AnalyteID,
                        AnalyteName = byId[input.AnalyteID].AnalyteName,
                        AnalyteValue = input.AnalyteValue,
                    });
                }
                else
                {
                    existing.AnalyteValue = input.AnalyteValue;
                }
            }

            if (dto.StudentComment != null) report.StudentComment = dto.StudentComment.Trim();
            if (dto.RunDate != null) report.RunDate = DateTime.SpecifyKind(dto.RunDate.Value, DateTimeKind.Utc);
            return null;
        }

        public static string? Submit(StudentReport report, IReadOnlyCollection<Analyte> lotAnalytes, DateTime nowUtc)
        {
            if (!IsEditable(report))
                return $"Only In Progress or Returned runs can be submitted (it is {report.Status}).";

            var entered = report.AnalyteInputs.Select(i => i.AnalyteID).ToHashSet();
            var missing = lotAnalytes.Where(a => !entered.Contains(a.AnalyteID)).Select(a => a.AnalyteName).ToList();
            if (missing.Count > 0)
                return $"Enter a result for every analyte before submitting. Missing: {string.Join(", ", missing)}.";

            report.Status = ReportStatus.Submitted;
            report.SubmittedDate = nowUtc;
            return null;
        }

        public static string? Grade(StudentReport report, int grade, string? comment, Guid reviewerId, DateTime nowUtc)
        {
            if (report.Status != ReportStatus.Submitted)
                return $"Only submitted runs can be graded (it is {report.Status}).";
            if (grade is < 0 or > 100)
                return "Grade must be between 0 and 100.";

            report.Status = ReportStatus.Graded;
            report.Grade = grade;
            report.FacultyComment = comment?.Trim();
            report.ReviewedByAdminID = reviewerId;
            report.ReviewedDate = nowUtc;
            return null;
        }

        public static string? Return(StudentReport report, string comment, Guid reviewerId, DateTime nowUtc)
        {
            if (report.Status != ReportStatus.Submitted)
                return $"Only submitted runs can be returned (it is {report.Status}).";
            if (string.IsNullOrWhiteSpace(comment))
                return "Explain what the student should fix when returning a run.";

            report.Status = ReportStatus.Returned;
            report.FacultyComment = comment.Trim();
            report.ReviewedByAdminID = reviewerId;
            report.ReviewedDate = nowUtc;
            return null;
        }
    }
}
