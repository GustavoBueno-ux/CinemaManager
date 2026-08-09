namespace CinemaAPI.DTOs.Relatorios;

public class FilmeMaisVendidoDTO
{
    public int FilmeId { get; set; }

    public string Titulo { get; set; } = string.Empty;

    public int IngressosVendidos { get; set; }
}