namespace CinemaAPI.DTOs.Ingressos;

public class CriarIngressosEmLoteDTO
{
    public int SessaoId { get; set; }

    public List<int> AssentoIds { get; set; } = [];
}