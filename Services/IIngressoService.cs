using CinemaAPI.DTOs.Ingressos;

namespace CinemaAPI.Services;

public interface IIngressoService
{
    Task<IngressoResponseDTO> CriarAsync(CriarIngressoDTO dto);

    Task<List<IngressoResponseDTO>> ListarTodosAsync();

    Task<List<IngressoResponseDTO>> ListarDoUsuarioAsync(int usuarioId);

    Task<IngressoResponseDTO?> BuscarPorIdAsync(int ingressoId, int usuarioId);

    Task<ValidacaoIngressoResponseDTO> ValidarAsync(ValidarIngressoDTO dto);

    Task<bool> ExcluirAsync(int id);
}