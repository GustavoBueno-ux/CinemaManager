namespace CinemaAPI.DTOs.Pagamentos;

public class CheckoutResponseDTO
{
    public int PedidoId { get; set; }

    public string CheckoutUrl { get; set; } = string.Empty;

    public DateTime ExpiraEm { get; set; }
}