using System.ComponentModel.DataAnnotations.Schema;

namespace CinemaAPI.Models;

public class Venda
{
    public int Id { get; set; }

    public DateTime DataHora { get; set; } = DateTime.UtcNow;

    public FormaPagamento? FormaPagamento { get; set; }

    public OrigemVenda OrigemVenda { get; set; }

    public int? FuncionarioId { get; set; }

    public Usuario? Funcionario { get; set; }

    [Column(TypeName = "decimal(10,2)")]
    public decimal ValorTotal { get; set; }

    public ICollection<Ingresso> Ingressos { get; set; }
        = new List<Ingresso>();
}

public enum FormaPagamento
{
    Dinheiro = 1,
    Pix = 2,
    Cartao = 3,
    Cortesia = 4
}

public enum OrigemVenda
{
    Online = 1,
    Bilheteria = 2
}