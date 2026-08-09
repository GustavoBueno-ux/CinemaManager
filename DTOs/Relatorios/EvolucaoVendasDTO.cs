namespace CinemaAPI.DTOs.Relatorios;

public class EvolucaoVendasDTO
{
    public DateOnly Data { get; set; }

    public decimal Faturamento { get; set; }

    public int IngressosVendidos { get; set; }
}