using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CinemaAPI.Models;

public class ValidacaoIngresso
{
    public int Id { get; set; }

    [Required]
    public int IngressoId { get; set; }

    [ForeignKey(nameof(IngressoId))]
    public Ingresso Ingresso { get; set; } = null!;

    [Required]
    public int UsuarioId { get; set; }

    [ForeignKey(nameof(UsuarioId))]
    public Usuario Usuario { get; set; } = null!;

    public DateTime DataValidacao { get; set; } = DateTime.UtcNow;
}