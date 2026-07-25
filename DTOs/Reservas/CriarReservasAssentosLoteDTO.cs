namespace CinemaAPI.DTOs.Reservas;

public class CriarReservasAssentosLoteDTO
{
    public int SessaoId { get; set; }

    public List<int> AssentoIds { get; set; } = [];
}