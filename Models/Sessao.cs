using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CinemaAPI.Models;

public class Sessao
{
    public int Id { get; set; }

    [Required]
    public int FilmeId { get; set; }

    [ForeignKey(nameof(FilmeId))]
    public Filme Filme { get; set; } = null!;

    [Required]
    public DateTime DataHora { get; set; }

    [Required]
    [Column(TypeName = "decimal(10,2)")]
    public decimal PrecoInteira { get; set; }

    [Required]
    [Column(TypeName = "decimal(10,2)")]
    public decimal PrecoMeia { get; set; }

    public bool Ativa { get; set; } = true;
}