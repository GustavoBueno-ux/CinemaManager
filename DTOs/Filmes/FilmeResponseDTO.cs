using CinemaAPI.Models;

namespace CinemaAPI.DTOs.Filmes;

public class FilmeResponseDTO
{
    public int Id { get; set; }

    public string Titulo { get; set; } = string.Empty;

    public int DuracaoMinutos { get; set; }

    public string Genero { get; set; } = string.Empty;

    public string PosterUrl { get; set; } = string.Empty;

    public ClassificacaoIndicativa Classificacao { get; set; }

    public DateTime DataCadastro { get; set; }
}