using System.ComponentModel.DataAnnotations;

namespace CinemaAPI.Models;

public class Filme
{
    public int Id { get; set; }

    [Required]
    [MaxLength(100)]
    public string Titulo { get; set; } = string.Empty;

    [Required]
    public int DuracaoMinutos { get; set; }

    [Required]
    [MaxLength(20)]
    public ClassificacaoIndicativa Classificacao { get; set; }

    [Required]
    [MaxLength(50)]
    public string Genero { get; set; } = string.Empty;

    [Required]
    [MaxLength(500)]
    public string PosterUrl { get; set; } = string.Empty;

    public DateTime DataCadastro { get; set; } = DateTime.UtcNow;

    public ICollection<Sessao> Sessoes { get; set; } = new List<Sessao>();
}

public enum ClassificacaoIndicativa
{
    Livre = 0,
    DezAnos = 10,
    DozeAnos = 12,
    QuatorzeAnos = 14,
    DezesseisAnos = 16,
    DezoitoAnos = 18
}