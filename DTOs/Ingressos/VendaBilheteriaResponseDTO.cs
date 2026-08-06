using System.Text.Json.Serialization;
using CinemaAPI.Models;

namespace CinemaAPI.DTOs.Ingressos;

public class VendaBilheteriaResponseDTO
{
    public int VendaId { get; set; }

    [JsonConverter(typeof(JsonStringEnumConverter))]
    public FormaPagamento FormaPagamento { get; set; }

    public decimal ValorTotal { get; set; }

    public List<IngressoResponseDTO> Ingressos { get; set; } = [];
}