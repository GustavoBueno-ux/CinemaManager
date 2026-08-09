namespace CinemaAPI.DTOs.Relatorios;

public class FormaPagamentoRelatorioDTO
{
    public string FormaPagamento { get; set; } = string.Empty;

    public int Vendas { get; set; }

    public int Ingressos { get; set; }

    public decimal Faturamento { get; set; }

    public decimal PercentualIngressos { get; set; }
}