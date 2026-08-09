namespace CinemaAPI.DTOs.Relatorios;

public class DesempenhoFilmeDTO
{
    public int FilmeId { get; set; }

    public string Titulo { get; set; } = string.Empty;

    public int IngressosVendidos { get; set; }

    public decimal Faturamento { get; set; }

    public decimal PercentualIngressos { get; set; }
}