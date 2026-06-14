namespace CinemaAPI.DTOs.Sessoes;

public class PatchSessaoDTO
{
    public int? FilmeId { get; set; }

    public DateTime? DataHora { get; set; }

    public bool? Ativa { get; set; }
}