using System.ComponentModel.DataAnnotations;

namespace CinemaAPI.DTOs.Sessoes;

public class PatchSessaoDTO
{
    public int? FilmeId { get; set; }

    public DateTime? DataHora { get; set; }

    [Range(0.01, 99999999.99, ErrorMessage = "O preço do ingresso deve ser maior que zero.")]
    public decimal? PrecoIngresso { get; set; }

    public bool? Ativa { get; set; }
}