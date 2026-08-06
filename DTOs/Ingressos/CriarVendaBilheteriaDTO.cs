using System.Text.Json.Serialization;
using CinemaAPI.Models;

namespace CinemaAPI.DTOs.Ingressos;

public class CriarVendaBilheteriaDTO
{
    public int SessaoId { get; set; }

    public List<int> AssentoIds { get; set; } = [];

    [JsonConverter(typeof(JsonStringEnumConverter))]
    public FormaPagamento FormaPagamento { get; set; }
}