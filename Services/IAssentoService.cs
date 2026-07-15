using CinemaAPI.DTOs.Assentos;

namespace CinemaAPI.Services;

public interface IAssentoService
{
    Task<List<AssentoResponseDTO>> ListarTodosAsync();

    Task<AssentoResponseDTO?> BuscarPorIdAsync(int id);

    Task<List<AssentoDisponibilidadeDTO>> BuscarDisponibilidadeAsync(int sessaoId);
}