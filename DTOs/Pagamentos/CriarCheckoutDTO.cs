using System.ComponentModel.DataAnnotations;

namespace CinemaAPI.DTOs.Pagamentos;

public class CriarCheckoutDTO
{
    [Required]
    public int SessaoId { get; set; }

    [Required]
    [MinLength(1)]
    public List<int> AssentoIds { get; set; } = new();
}