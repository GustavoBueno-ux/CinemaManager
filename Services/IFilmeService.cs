using CinemaAPI.DTOs.Filmes;

namespace CinemaAPI.Services;

public interface IFilmeService
{
    Task<List<FilmeResponseDTO>> ListarTodosAsync();

    Task<FilmeResponseDTO?> BuscarPorIdAsync(int id);

    Task<FilmeResponseDTO> CriarAsync(CriarFilmeDTO dto);

    Task<bool> PatchAsync(int id, PatchFilmeDTO dto);

    Task<bool> ExcluirAsync(int id);
}