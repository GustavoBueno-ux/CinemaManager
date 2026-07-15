namespace CinemaAPI.DTOs.Ingressos;

public class ValidarIngressoDTO
{
    public int SessaoId { get; set; }
    public string TokenQrCode { get; set; } = string.Empty;
}