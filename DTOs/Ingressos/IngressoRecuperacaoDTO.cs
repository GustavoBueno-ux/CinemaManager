namespace CinemaAPI.DTOs.Ingressos;

public class IngressoRecuperacaoDTO
{
    public int Id { get; set; }

    public string CodigoRecuperacao { get; set; } = string.Empty;

    public string Filme { get; set; } = string.Empty;

    public DateTime DataSessao { get; set; }

    public string CodigoAssento { get; set; } = string.Empty;

    public DateTime DataCompra { get; set; }

    public string FormaPagamento { get; set; } = string.Empty;

    public decimal ValorPago { get; set; }

    public bool Utilizado { get; set; }

    public DateTime? DataUtilizacao { get; set; }

    public string TokenQrCode { get; set; } = string.Empty;
}