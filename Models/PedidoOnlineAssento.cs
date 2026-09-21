using System.ComponentModel.DataAnnotations.Schema;

namespace CinemaAPI.Models;

public class PedidoOnlineAssento
{
    public int Id { get; set; }

    public int PedidoOnlineId { get; set; }

    [ForeignKey(nameof(PedidoOnlineId))]
    public PedidoOnline PedidoOnline { get; set; } = null!;

    public int AssentoId { get; set; }

    [ForeignKey(nameof(AssentoId))]
    public Assento Assento { get; set; } = null!;
}