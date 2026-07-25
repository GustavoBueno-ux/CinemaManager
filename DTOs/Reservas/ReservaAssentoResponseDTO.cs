namespace CinemaAPI.DTOs.Reservas;

public class ReservaAssentoResponseDTO
{
    public int ReservaId { get; set; }

    public int SessaoId { get; set; }

    public int AssentoId { get; set; }

    public string CodigoAssento { get; set; } = string.Empty;

    public DateTime ExpiraEm { get; set; }

    public int SegundosRestantes { get; set; }
}