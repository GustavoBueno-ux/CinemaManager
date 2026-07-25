namespace CinemaAPI.Models;

public class ReservaAssento
{
    public int Id { get; set; }

    public int SessaoId { get; set; }

    public Sessao Sessao { get; set; } = null!;

    public int AssentoId { get; set; }

    public Assento Assento { get; set; } = null!;

    public int UsuarioId { get; set; }

    public Usuario Usuario { get; set; } = null!;

    public DateTime CriadaEm { get; set; }

    public DateTime ExpiraEm { get; set; }
}