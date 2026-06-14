using CinemaAPI.DTOs.Sessoes;

namespace CinemaAPI.Services;

public interface ISessaoService
{
    Task<SessaoResponseDTO> CriarAsync(CriarSessaoDTO dto);

    Task<List<SessaoResponseDTO>> ListarTodosAsync();

    Task<SessaoResponseDTO?> BuscarPorIdAsync(int id);

    Task<bool> PatchAsync(int id, PatchSessaoDTO dto);

    Task<bool> ExcluirAsync(int id);
}