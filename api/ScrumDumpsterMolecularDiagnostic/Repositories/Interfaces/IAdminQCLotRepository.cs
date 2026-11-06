using ScrumDumpsterMolecularDiagnostic.Enums;
using ScrumDumpsterMolecularDiagnostic.Models.Domain;

namespace ScrumDumpsterMolecularDiagnostic.Repositories.Interfaces
{
    public interface IAdminQCLotRepository
    {
        Task<List<AdminQCLot>> GetAllQCLotsAsync(bool activeOnly = false);
        Task<AdminQCLot?> GetQCLotByIDAsync(Guid id);
        Task<AdminQCLot?> GetAdminQCLotByNameAsync(string? name = null, Department? dep = null);
        Task<bool> LotNumberExistsAsync(string lotNumber);
        Task<AdminQCLot> CreateQCLotAsync(AdminQCLot qclot);
        /// <summary>Returns null when the lot does not exist.</summary>
        Task<AdminQCLot?> UpdateQCLotAsync(Guid lotId, AdminQCLot qcLot);
        Task<AdminQCLot?> DeleteQCLotAsync(Guid id);
    }
}
