﻿using System.ComponentModel.DataAnnotations;

namespace ScrumDumpsterMolecularDiagnostic.Models.Domain
{
    public class Admin
    {
        [Key]
        public Guid AdminID { get; set; }
        public string Username { get; set; }
        public string Email { get; set; }
        public string? Firstname { get; set; }
        public string? Lastname { get; set; }
        public string Initials { get; set; }
        public ICollection<Student> Students { get; set; } = [];
    }
}
