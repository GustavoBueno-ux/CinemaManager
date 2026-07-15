using CinemaAPI.Models;

namespace CinemaAPI.DTOs.Ingressos;

public class CriarIngressoDTO
{
    public int SessaoId { get; set; }

    public int AssentoId { get; set; }

    public int UsuarioId { get; set; }
}