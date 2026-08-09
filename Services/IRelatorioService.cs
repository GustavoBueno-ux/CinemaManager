using CinemaAPI.DTOs.Relatorios;

namespace CinemaAPI.Services;

public interface IRelatorioService
{
    Task<RelatorioResponseDTO> BuscarAsync(
        DateTime inicio,
        DateTime fim
    );
}