namespace CinemaAPI.DTOs.Reservas;

public class ReservasAssentosLoteResponseDTO
{
    public int SessaoId { get; set; }

    public int Quantidade { get; set; }

    public DateTime ExpiraEm { get; set; }

    public int SegundosRestantes { get; set; }

    public List<ReservaAssentoResponseDTO> Reservas { get; set; } = [];
}