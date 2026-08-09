namespace CinemaAPI.DTOs.Ingressos;

public class ValidacaoIngressoResponseDTO
{
    public bool Sucesso { get; set; }

    public string Codigo { get; set; } = string.Empty;

    public string Mensagem { get; set; } = string.Empty;
}