using System.ComponentModel.DataAnnotations;
using CinemaAPI.Models;

namespace CinemaAPI.DTOs.Filmes;

public class AtualizarFilmeDTO
{
    [MaxLength(100)]
    public string Titulo { get; set; } = string.Empty;

    [Range(1, 500)]
    public int DuracaoMinutos { get; set; }

    public string Genero { get; set; } = string.Empty;

    public string PosterUrl { get; set; } = string.Empty;

    public ClassificacaoIndicativa Classificacao { get; set; }
}