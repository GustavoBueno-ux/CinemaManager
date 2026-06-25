namespace CinemaAPI.DTOs.Usuarios;

public class LoginResponseDTO
{
    public string Token { get; set; } = string.Empty;

    public UsuarioResponseDTO Usuario { get; set; } = null!;
}