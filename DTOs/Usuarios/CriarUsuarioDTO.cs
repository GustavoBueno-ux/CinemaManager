using System.ComponentModel.DataAnnotations;

namespace CinemaAPI.DTOs.Usuarios;

public class CriarUsuarioDTO
{
    [Required]
    [MaxLength(100)]
    public string Nome { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    [MaxLength(150)]
    public string Email { get; set; } = string.Empty;

    [Required]
    [MinLength(6)]
    public string Senha { get; set; } = string.Empty;
}