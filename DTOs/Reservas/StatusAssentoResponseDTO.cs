namespace CinemaAPI.DTOs.Reservas;

public class StatusAssentoResponseDTO
{
    public int AssentoId { get; set; }

    public string Codigo { get; set; } = string.Empty;

    public string Status { get; set; } = string.Empty;

    public bool ReservadoPeloUsuarioAtual { get; set; }

    public DateTime? ReservaExpiraEm { get; set; }
}