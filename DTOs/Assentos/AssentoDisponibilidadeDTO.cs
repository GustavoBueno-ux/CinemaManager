namespace CinemaAPI.DTOs.Assentos;

public class AssentoDisponibilidadeDTO
{
    public int Id { get; set; }

    public string Codigo { get; set; } = string.Empty;

    public bool Ocupado { get; set; }
}