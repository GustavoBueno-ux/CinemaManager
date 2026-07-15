using CinemaAPI.DTOs.Ingressos;

namespace CinemaAPI.Services;

public interface IIngressoService
{
    Task<IngressoResponseDTO> CriarAsync(CriarIngressoDTO dto);

    Task<List<IngressoResponseDTO>> ListarTodosAsync();

    Task<IngressoResponseDTO?> BuscarPorIdAsync(int id);

    Task<ValidacaoIngressoResponseDTO> ValidarAsync(ValidarIngressoDTO dto);

    Task<bool> ExcluirAsync(int id);
}