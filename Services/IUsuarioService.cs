using CinemaAPI.DTOs.Usuarios;

namespace CinemaAPI.Services;

public interface IUsuarioService
{
    Task<UsuarioResponseDTO> CriarAsync(CriarUsuarioDTO dto);

    Task<UsuarioResponseDTO?> BuscarPorIdAsync(int id);

    Task<List<UsuarioResponseDTO>> ListarTodosAsync();

    Task<bool> PatchAsync(int id, PatchUsuarioDTO dto);

    Task<bool> ExcluirAsync(int id);

    Task<LoginResponseDTO?> LoginAsync(LoginDTO dto);
}