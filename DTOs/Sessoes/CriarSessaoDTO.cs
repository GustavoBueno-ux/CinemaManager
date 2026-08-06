using System.ComponentModel.DataAnnotations;

namespace CinemaAPI.DTOs.Sessoes;

public class CriarSessaoDTO
{
    [Required]
    public int FilmeId { get; set; }

    [Required]
    public DateTime DataHora { get; set; }

    [Required]
    [Range(
        typeof(decimal),
        "0.01",
        "99999999.99",
        ErrorMessage = "O preço do ingresso deve ser maior que zero."
    )]
    public decimal PrecoIngresso { get; set; }
}