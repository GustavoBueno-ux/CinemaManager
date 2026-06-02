using System.ComponentModel.DataAnnotations;
using CinemaAPI.Models;

namespace CinemaAPI.DTOs.Filmes;

public class CriarFilmeDTO
{
    [Required]
    [MaxLength(100)]
    public string Titulo { get; set; } = string.Empty;

    [Range(1, 500)]
    [Required]
    public int DuracaoMinutos { get; set; }

    [Required]
    public string Genero { get; set; } = string.Empty;

    [Required]
    public string PosterUrl { get; set; } = string.Empty;

    [Required]
    public ClassificacaoIndicativa Classificacao { get; set; }
}