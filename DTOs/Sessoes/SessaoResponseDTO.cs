namespace CinemaAPI.DTOs.Sessoes;

public class SessaoResponseDTO
{
    public int Id { get; set; }

    public int FilmeId { get; set; }

    public string TituloFilme { get; set; } = string.Empty;

    public DateTime DataHora { get; set; }

    public bool Ativa { get; set; }
}