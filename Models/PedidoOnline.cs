using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using CinemaAPI.Utils;

namespace CinemaAPI.Models;

public class PedidoOnline
{
    public int Id { get; set; }

    [Required]
    public int UsuarioId { get; set; }

    [ForeignKey(nameof(UsuarioId))]
    public Usuario Usuario { get; set; } = null!;

    [Required]
    public int SessaoId { get; set; }

    [ForeignKey(nameof(SessaoId))]
    public Sessao Sessao { get; set; } = null!;

    [Required]
    [Column(TypeName = "decimal(10,2)")]
    public decimal ValorTotal { get; set; }

    [Required]
    public StatusPedidoOnline Status { get; set; }
        = StatusPedidoOnline.Pendente;

    [MaxLength(255)]
    public string? StripeCheckoutSessionId { get; set; }

    [MaxLength(255)]
    public string? StripePaymentIntentId { get; set; }

    public DateTime CriadoEm { get; set; } = HorarioCinema.Agora;

    public DateTime ExpiraEm { get; set; }

    public int? VendaId { get; set; }

    [ForeignKey(nameof(VendaId))]
    public Venda? Venda { get; set; }

    public ICollection<PedidoOnlineAssento> Assentos { get; set; }
        = new List<PedidoOnlineAssento>();
}

public enum StatusPedidoOnline
{
    Pendente = 1,
    Pago = 2,
    Expirado = 3,
    Cancelado = 4,
    Falhou = 5
}