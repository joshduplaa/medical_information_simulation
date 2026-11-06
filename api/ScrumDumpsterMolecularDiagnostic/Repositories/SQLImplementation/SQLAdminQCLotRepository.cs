using ScrumDumpsterMolecularDiagnostic.Data;
using ScrumDumpsterMolecularDiagnostic.Enums;
using ScrumDumpsterMolecularDiagnostic.Models.Domain;
using ScrumDumpsterMolecularDiagnostic.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace ScrumDumpsterMolecularDiagnostic.Repositories.SQLImplementation
{
    public class SQLAdminQCLotRepository : IAdminQCLotRepository
    {
        private readonly MedicalInformationDbContext dbContext;

        public SQLAdminQCLotRepository(MedicalInformationDbContext dbContext)
        {
            this.dbContext = dbContext;
        }

        public async Task<AdminQCLot> CreateQCLotAsync(AdminQCLot qclot)
        {
            // Original team rule, kept: only one active lot per QC name per department. Opening a new lot
            // closes the previous one, the way a lab rolls over to a new lot of control material.
            var name = qclot.QCName.ToLower();
            var activeQCLot = await dbContext.AdminQCLots
                .Where(item => item.Department == qclot.Department && item.QCName.ToLower() == name && item.IsActive)
                .FirstOrDefaultAsync();

            if (activeQCLot != null && qclot.IsActive)
            {
                activeQCLot.IsActive = false;
                activeQCLot.ClosedDate = DateTime.UtcNow;
            }

            await dbContext.AdminQCLots.AddAsync(qclot);
            await dbContext.SaveChangesAsync();
            return qclot;
        }

        public async Task<AdminQCLot?> DeleteQCLotAsync(Guid id)
        {
            var existing = await dbContext.AdminQCLots.FirstOrDefaultAsync(item => item.AdminQCLotID == id);
            if (existing == null) return null;

            dbContext.AdminQCLots.Remove(existing);
            await dbContext.SaveChangesAsync();
            return existing;
        }

        public Task<bool> LotNumberExistsAsync(string lotNumber) =>
            dbContext.AdminQCLots.AnyAsync(item => item.LotNumber == lotNumber);

        public async Task<AdminQCLot?> GetAdminQCLotByNameAsync(string? name, Department? dep)
        {
            var query = dbContext.AdminQCLots.Where(item => item.IsActive);
            if (!string.IsNullOrEmpty(name))
            {
                var lowered = name.ToLower();
                query = query.Where(item => item.QCName.ToLower() == lowered);
            }
            if (dep != null)
            {
                query = query.Where(item => item.Department == dep);
            }
            return await query.Include(item => item.Analytes).FirstOrDefaultAsync();
        }

        public async Task<List<AdminQCLot>> GetAllQCLotsAsync(bool activeOnly = false)
        {
            var query = dbContext.AdminQCLots.AsNoTracking().Include(item => item.Analytes).Include(item => item.Reports).AsQueryable();
            if (activeOnly) query = query.Where(l => l.IsActive);
            var lots = await query.AsSplitQuery().ToListAsync();
            return lots.OrderBy(l => l.Department).ThenBy(l => l.QCName).ThenByDescending(l => l.OpenDate).ToList();
        }

        public async Task<AdminQCLot?> GetQCLotByIDAsync(Guid id)
        {
            return await dbContext.AdminQCLots
                .Include(item => item.Analytes)
                .Include(item => item.Reports)
                .AsSplitQuery()
                .FirstOrDefaultAsync(item => item.AdminQCLotID == id);
        }

        public async Task<AdminQCLot?> UpdateQCLotAsync(Guid lotId, AdminQCLot qcLot)
        {
            var existing = await dbContext.AdminQCLots.Include(e => e.Analytes)
                .FirstOrDefaultAsync(item => item.AdminQCLotID == lotId);
            if (existing == null) return null;

            existing.QCName = qcLot.QCName;
            existing.Department = qcLot.Department;
            existing.OpenDate = qcLot.OpenDate;
            existing.ExpirationDate = qcLot.ExpirationDate;
            existing.ClosedDate = qcLot.ClosedDate;
            existing.FileDate = qcLot.FileDate;
            existing.IsActive = qcLot.IsActive;

            var incomingIds = qcLot.Analytes.Where(a => a.AnalyteID != Guid.Empty).Select(a => a.AnalyteID).ToHashSet();

            // Remove analytes that are no longer listed.
            foreach (var removed in existing.Analytes.Where(a => !incomingIds.Contains(a.AnalyteID)).ToList())
            {
                existing.Analytes.Remove(removed);
                dbContext.Analytes.Remove(removed);
            }

            foreach (var analyte in qcLot.Analytes)
            {
                var match = analyte.AnalyteID == Guid.Empty
                    ? null
                    : existing.Analytes.SingleOrDefault(item => item.AnalyteID == analyte.AnalyteID);

                if (match == null)
                {
                    analyte.AnalyteID = Guid.NewGuid();
                    analyte.AdminQCLotID = existing.AdminQCLotID;
                    existing.Analytes.Add(analyte);
                    dbContext.Analytes.Add(analyte);
                }
                else
                {
                    match.AnalyteName = analyte.AnalyteName;
                    match.AnalyteAcronym = analyte.AnalyteAcronym;
                    match.UnitOfMeasure = analyte.UnitOfMeasure;
                    match.MinLevel = analyte.MinLevel;
                    match.MaxLevel = analyte.MaxLevel;
                    match.Mean = analyte.Mean;
                    match.StdDevi = analyte.StdDevi; // previously never updated
                }
            }

            await dbContext.SaveChangesAsync();
            return existing;
        }
    }
}
