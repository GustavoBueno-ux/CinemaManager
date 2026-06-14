using System.ComponentModel.DataAnnotations;

namespace CinemaAPI.DTOs.Sessoes;

public class CriarSessaoDTO
{
    [Required]
    public int FilmeId { get; set; }

    [Required]
    public DateTime DataHora { get; set; }
}