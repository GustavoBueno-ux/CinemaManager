using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CinemaAPI.Models;

public class Ingresso
{
    public int Id { get; set; }

    [Required]
    public int SessaoId { get; set; }

    [ForeignKey(nameof(SessaoId))]
    public Sessao Sessao { get; set; } = null!;

    [Required]
    public int AssentoId { get; set; }

    [ForeignKey(nameof(AssentoId))]
    public Assento Assento { get; set; } = null!;

    [Required]
    public int UsuarioId { get; set; }

    [ForeignKey(nameof(UsuarioId))]
    public Usuario Usuario { get; set; } = null!;
    [Required]
    [Column(TypeName = "decimal(10,2)")]
    public decimal ValorPago { get; set; }

    [Required]
    [MaxLength(100)]
    public string TokenQrCode { get; set; } = string.Empty;

    public DateTime DataCompra { get; set; } = DateTime.UtcNow;
    public OrigemVenda OrigemVenda { get; set; }

    public bool Utilizado { get; set; } = false;

    public DateTime? DataUtilizacao { get; set; }
}

public enum OrigemVenda
{
    Online = 1,
    Bilheteria = 2
}