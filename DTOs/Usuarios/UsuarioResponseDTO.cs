namespace CinemaAPI.DTOs.Usuarios;

public class UsuarioResponseDTO
{
    public int Id { get; set; }

    public string Nome { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string TipoUsuario { get; set; } = string.Empty;

    public DateTime DataCadastro { get; set; }
}