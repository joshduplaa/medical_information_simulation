namespace ScrumDumpsterMolecularDiagnostic.Enums
{
    /// <summary>
    /// Lifecycle of one student QC run.
    /// InProgress → Submitted → Graded, with Submitted → Returned → Submitted when faculty send it back.
    /// </summary>
    public enum ReportStatus
    {
        InProgress,
        Submitted,
        Returned,
        Graded,
    }
}
