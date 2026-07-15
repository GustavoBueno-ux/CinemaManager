namespace CinemaAPI.DTOs.Ingressos;

public class IngressoResponseDTO
{
    public int Id { get; set; }

    public int SessaoId { get; set; }

    public string Filme { get; set; } = string.Empty;

    public DateTime DataSessao { get; set; }

    public int AssentoId { get; set; }

    public string CodigoAssento { get; set; } = string.Empty;

    public int UsuarioId { get; set; }

    public string Usuario { get; set; } = string.Empty;

    public decimal ValorPago { get; set; }

    public string TokenQrCode { get; set; } = string.Empty;

    public DateTime DataCompra { get; set; }

    public bool Utilizado { get; set; }

    public DateTime? DataUtilizacao { get; set; }
}