using System.ComponentModel.DataAnnotations;

namespace CinemaAPI.Models;

public class Assento
{
    public int Id { get; set; }

    [Required]
    [MaxLength(3)]
    public string Codigo { get; set; } = string.Empty;
}