using System.ComponentModel.DataAnnotations;

namespace CinemaAPI.DTOs.Usuarios;

public class AtualizarMembroEquipeDTO
{
    [MaxLength(100)]
    public string? Nome { get; set; }

    [EmailAddress]
    [MaxLength(150)]
    public string? Email { get; set; }
}
