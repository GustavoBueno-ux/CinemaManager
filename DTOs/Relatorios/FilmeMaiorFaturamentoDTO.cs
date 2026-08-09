namespace CinemaAPI.DTOs.Relatorios;

public class FilmeMaiorFaturamentoDTO
{
    public int FilmeId { get; set; }

    public string Titulo { get; set; } = string.Empty;

    public decimal Faturamento { get; set; }
}