using AutoMapper;
using ScrumDumpsterMolecularDiagnostic.Models.Domain;
using ScrumDumpsterMolecularDiagnostic.Models.DTO;

namespace ScrumDumpsterMolecularDiagnostic.Mappings
{
    public class AutoMapperProfiles : Profile
    {
        public AutoMapperProfiles()
        {
            CreateMap<Admin, AdminDTO>();
            CreateMap<Student, StudentDTO>();
            CreateMap<Analyte, AnalyteDTO>();
            CreateMap<AddAnalyteWithListDTO, Analyte>()
                .ForMember(d => d.AnalyteID, o => o.Ignore())
                .ForMember(d => d.AdminQCLotID, o => o.Ignore());
            CreateMap<AdminQCLot, AdminQCLotDTO>()
                .ForMember(d => d.ReportCount, o => o.MapFrom(s => s.Reports.Count));
            CreateMap<AnalyteInput, AnalyteInputDTO>();
            CreateMap<StudentReport, StudentReportDTO>()
                .ForMember(d => d.StudentName, o => o.MapFrom(s => s.Student == null ? "" : s.Student.Firstname + " " + s.Student.Lastname))
                .ForMember(d => d.QCName, o => o.MapFrom(s => s.AdminQCLot == null ? "" : s.AdminQCLot.QCName))
                .ForMember(d => d.LotNumber, o => o.MapFrom(s => s.AdminQCLot == null ? "" : s.AdminQCLot.LotNumber))
                .ForMember(d => d.Department, o => o.MapFrom(s => s.AdminQCLot == null ? default : s.AdminQCLot.Department))
                .ForMember(d => d.Analytes, o => o.MapFrom(s => s.AdminQCLot == null ? new List<Analyte>() : s.AdminQCLot.Analytes));
        }
    }
}
