namespace CinemaAPI.DTOs.Dashboard;

public class SessaoDashboardDTO
{
    public int Id { get; set; }

    public DateTime DataHora { get; set; }

    public string NomeFilme { get; set; } = string.Empty;

    public int IngressosVendidos { get; set; }

    public int CapacidadeSala { get; set; }

    public string Status { get; set; } = string.Empty;
}