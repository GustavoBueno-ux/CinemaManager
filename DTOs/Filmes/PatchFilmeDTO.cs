using CinemaAPI.Models;

namespace CinemaAPI.DTOs.Filmes;

public class PatchFilmeDTO
{
    public string? Titulo { get; set; }
    public int? DuracaoMinutos { get; set; }
    public string? Genero { get; set; }
    public string? PosterUrl { get; set; }
    public ClassificacaoIndicativa? Classificacao { get; set; }
}