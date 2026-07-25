using System.Security.Claims;
using CinemaAPI.DTOs.Reservas;
using CinemaAPI.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CinemaAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ReservaAssentoController : ControllerBase
{
    private readonly IReservaAssentoService _service;

    public ReservaAssentoController(
        IReservaAssentoService service
    )
    {
        _service = service;
    }


    [HttpPost("lote")]
    public async Task<IActionResult> ReservarEmLote(
        [FromBody] CriarReservasAssentosLoteDTO dto
    )
    {
        if (!TentarObterUsuarioId(out var usuarioId))
        {
            return Unauthorized(new
            {
                mensagem = "Usuário não identificado."
            });
        }
    
        try
        {
            var resultado = await _service.ReservarEmLoteAsync(
                usuarioId,
                dto
            );
    
            return Ok(new
            {
                mensagem =
                    $"{resultado.Quantidade} assento(s) reservado(s) " +
                    "temporariamente.",
    
                resultado
            });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new
            {
                mensagem = ex.Message
            });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new
            {
                mensagem = ex.Message
            });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new
            {
                mensagem = ex.Message
            });
        }
    }


    [HttpPost]
    public async Task<IActionResult> Reservar(
        [FromBody] CriarReservaAssentoDTO dto
    )
    {
        if (!TentarObterUsuarioId(out var usuarioId))
        {
            return Unauthorized(new
            {
                mensagem = "Usuário não identificado."
            });
        }

        try
        {
            var reserva = await _service.ReservarAsync(
                usuarioId,
                dto
            );

            return Ok(new
            {
                mensagem = "Assento reservado por 10 minutos.",
                reserva
            });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new
            {
                mensagem = ex.Message
            });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new
            {
                mensagem = ex.Message
            });
        }
    }

    [HttpDelete]
    public async Task<IActionResult> Cancelar(
        [FromQuery] int sessaoId,
        [FromQuery] int assentoId
    )
    {
        if (!TentarObterUsuarioId(out var usuarioId))
        {
            return Unauthorized(new
            {
                mensagem = "Usuário não identificado."
            });
        }

        var cancelada = await _service.CancelarAsync(
            usuarioId,
            sessaoId,
            assentoId
        );

        if (!cancelada)
        {
            return NotFound(new
            {
                mensagem = "Reserva não encontrada."
            });
        }

        return Ok(new
        {
            mensagem = "Reserva cancelada."
        });
    }

    [HttpGet("sessao/{sessaoId:int}")]
    public async Task<IActionResult> ListarStatus(
        int sessaoId
    )
    {
        if (!TentarObterUsuarioId(out var usuarioId))
        {
            return Unauthorized(new
            {
                mensagem = "Usuário não identificado."
            });
        }

        try
        {
            var assentos = await _service.ListarStatusAsync(
                sessaoId,
                usuarioId
            );

            return Ok(assentos);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new
            {
                mensagem = ex.Message
            });
        }
    }

    [HttpDelete("minhas")]
    public async Task<IActionResult> LiberarMinhasReservas(
        [FromQuery] int sessaoId
    )
    {
        if (!TentarObterUsuarioId(out var usuarioId))
        {
            return Unauthorized(new
            {
                mensagem = "Usuário não identificado."
            });
        }

        await _service.LiberarReservasDoUsuarioAsync(
            usuarioId,
            sessaoId
        );

        return NoContent();
    }

    private bool TentarObterUsuarioId(
        out int usuarioId
    )
    {
        var claim = User.FindFirst(
            ClaimTypes.NameIdentifier
        )?.Value;

        return int.TryParse(claim, out usuarioId);
    }
}