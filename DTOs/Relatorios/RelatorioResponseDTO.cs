namespace CinemaAPI.DTOs.Relatorios;

public class RelatorioResponseDTO
{
    public DateTime Inicio { get; set; }

    public DateTime Fim { get; set; }

    public decimal Faturamento { get; set; }

    public int VendasRealizadas { get; set; }

    public int IngressosVendidos { get; set; }

    public int IngressosUtilizados { get; set; }

    public decimal TaxaComparecimento { get; set; }

    public int IngressosCortesia { get; set; }

    public List<EvolucaoVendasDTO> Evolucao { get; set; }
        = new();

    public List<DesempenhoFilmeDTO> Filmes { get; set; }
        = new();

    public List<OrigemVendaRelatorioDTO> Origens { get; set; }
        = new();

    public List<FormaPagamentoRelatorioDTO> FormasPagamento { get; set; }
        = new();

    public FilmeMaisVendidoDTO? FilmeMaisVendido { get; set; }

    public FilmeMaiorFaturamentoDTO? FilmeMaiorFaturamento { get; set; }

    public SessaoMaisVendidaDTO? SessaoMaisVendida { get; set; }
}