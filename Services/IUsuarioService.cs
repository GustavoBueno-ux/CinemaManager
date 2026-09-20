using CinemaAPI.DTOs.Usuarios;
using CinemaAPI.Models;

namespace CinemaAPI.Services;

public interface IUsuarioService
{
    Task<UsuarioResponseDTO> CriarAsync(CriarUsuarioDTO dto);

    Task<UsuarioResponseDTO> CriarFuncionarioAsync(CriarUsuarioDTO dto);

    Task<UsuarioResponseDTO?> BuscarPorIdAsync(int id);

    Task<List<UsuarioResponseDTO>> ListarTodosAsync();

    Task<bool> PatchAsync(int id, PatchUsuarioDTO dto);

    Task<bool> ExcluirAsync(int id);

    Task<LoginResponseDTO?> LoginAsync(LoginDTO dto);

    Task<List<EquipeResponseDTO>> ListarEquipeAsync();

    Task<EquipeResponseDTO?> BuscarMembroEquipePorIdAsync(int id);

    Task<EquipeResponseDTO> CriarMembroEquipeAsync(CriarUsuarioDTO dto);

    Task<bool> AtualizarMembroEquipeAsync(int id, AtualizarMembroEquipeDTO dto);

    Task<bool> AlterarSenhaMembroEquipeAsync(int id, AlterarSenhaEquipeDTO dto);

    Task<bool> AlterarStatusMembroEquipeAsync(int id, bool ativo, int administradorId);

    Task<bool> AlterarTipoMembroEquipeAsync(int id, TipoUsuario tipoUsuario, int administradorId);
}
