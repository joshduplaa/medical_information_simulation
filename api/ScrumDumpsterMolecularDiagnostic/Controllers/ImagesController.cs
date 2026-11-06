using ScrumDumpsterMolecularDiagnostic.Auth;
using ScrumDumpsterMolecularDiagnostic.Models.Domain;
using ScrumDumpsterMolecularDiagnostic.Models.DTO;
using ScrumDumpsterMolecularDiagnostic.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ScrumDumpsterMolecularDiagnostic.Controllers
{
    /// <summary>Faculty image upload (kept from the original API; not yet used by the client).</summary>
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = Roles.Faculty)]
    public class ImagesController : ControllerBase
    {
        private static readonly string[] AllowedExtensions = [".jpg", ".jpeg", ".png"];
        private const long MaxBytes = 10 * 1024 * 1024;
        private readonly IImageRepository imageRepository;

        public ImagesController(IImageRepository imageRepository)
        {
            this.imageRepository = imageRepository;
        }

        [HttpPost("Upload")]
        [RequestSizeLimit(MaxBytes + 64 * 1024)]
        public async Task<IActionResult> Upload([FromForm] ImageUploadRequestDTO requestDTO)
        {
            var extension = Path.GetExtension(requestDTO.File.FileName).ToLowerInvariant();
            // Previously this check was inverted and rejected exactly the allowed types.
            if (!AllowedExtensions.Contains(extension))
                ModelState.AddModelError("file", "Unsupported file extension");
            if (requestDTO.File.Length > MaxBytes)
                ModelState.AddModelError("file", "File size more than 10MB");
            if (!ModelState.IsValid) return ValidationProblem(ModelState);

            var image = new Images
            {
                File = requestDTO.File,
                FileDescription = requestDTO.FileDescription,
                // The stored file name is generated server-side; the user-supplied name is metadata only,
                // so it can never be used for path traversal (e.g. "../../appsettings").
                FileName = Guid.NewGuid().ToString("N"),
                FileSizeInBytes = requestDTO.File.Length,
                FileExtension = extension,
            };
            var saved = await imageRepository.Upload(image);
            return Ok(new { saved.ImageId, saved.FilePath, saved.FileExtension, saved.FileSizeInBytes, OriginalName = requestDTO.FileName });
        }
    }
}
