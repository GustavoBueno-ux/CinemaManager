namespace CinemaAPI.DTOs.Relatorios;

public class SessaoMaisVendidaDTO
{
    public int SessaoId { get; set; }

    public int FilmeId { get; set; }

    public string Filme { get; set; } = string.Empty;

    public DateTime DataHora { get; set; }

    public int IngressosVendidos { get; set; }
}