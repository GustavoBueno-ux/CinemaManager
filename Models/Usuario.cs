using System.ComponentModel.DataAnnotations;

namespace CinemaAPI.Models;

public class Usuario
{
    public int Id { get; set; }

    [Required]
    [MaxLength(100)]
    public string Nome { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    [MaxLength(150)]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string SenhaHash { get; set; } = string.Empty;

    [Required]
    public TipoUsuario TipoUsuario { get; set; } = TipoUsuario.Cliente;

    public DateTime DataCadastro { get; set; } = DateTime.UtcNow;
}

public enum TipoUsuario
{
    Cliente = 1,
    Funcionario = 2,
    Administrador = 3
}