namespace CinemaAPI.DTOs.Dashboard;

public class DashboardResponseDTO
{
    public int QuantidadeSessoesHoje { get; set; }

    public int QuantidadeIngressosVendidosHoje { get; set; }

    public decimal FaturamentoHoje { get; set; }

    public ProximaSessaoDashboardDTO? ProximaSessao { get; set; }

    public List<SessaoDashboardDTO> SessoesHoje { get; set; } = [];
}