using CinemaAPI.DTOs.Reservas;

namespace CinemaAPI.Services;

public interface IReservaAssentoService
{
    Task<ReservaAssentoResponseDTO> ReservarAsync(
        int usuarioId,
        CriarReservaAssentoDTO dto
    );

    Task<ReservasAssentosLoteResponseDTO> ReservarEmLoteAsync(
        int usuarioId,
        CriarReservasAssentosLoteDTO dto
    );

    Task<bool> CancelarAsync(
        int usuarioId,
        int sessaoId,
        int assentoId
    );

    Task<List<StatusAssentoResponseDTO>> ListarStatusAsync(
        int sessaoId,
        int usuarioId
    );

    Task LiberarReservasDoUsuarioAsync(
        int usuarioId,
        int sessaoId
    );
}