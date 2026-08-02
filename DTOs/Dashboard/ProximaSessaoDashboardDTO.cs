namespace CinemaAPI.DTOs.Dashboard;

public class ProximaSessaoDashboardDTO
{
    public int Id { get; set; }

    public DateTime DataHora { get; set; }

    public string NomeFilme { get; set; } = string.Empty;

}