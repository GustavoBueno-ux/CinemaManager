namespace CinemaAPI.DTOs.Usuarios;

public class EquipeResponseDTO
{
    public int Id { get; set; }

    public string Nome { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string TipoUsuario { get; set; } = string.Empty;

    public bool Ativo { get; set; }

    public DateTime DataCadastro { get; set; }
}
