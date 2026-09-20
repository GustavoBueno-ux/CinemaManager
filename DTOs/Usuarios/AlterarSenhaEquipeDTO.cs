using System.ComponentModel.DataAnnotations;

namespace CinemaAPI.DTOs.Usuarios;

public class AlterarSenhaEquipeDTO
{
    [Required]
    [MinLength(6)]
    public string Senha { get; set; } = string.Empty;
}
