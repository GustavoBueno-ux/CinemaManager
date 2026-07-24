using CinemaAPI.DTOs.Ingressos;
using CinemaAPI.Services;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;

namespace CinemaAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class IngressoController : ControllerBase
{
    private readonly IIngressoService _service;

    public IngressoController(IIngressoService service)
    {
        _service = service;
    }


    [HttpPost("online")]
    public async Task<IActionResult> ComprarOnline(CriarIngressoDTO dto)
    {
        try
        {
            var ingresso = await _service.CriarAsync(dto);
            return Ok(ingresso);
        }
        catch(Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }


    [HttpPost("bilheteria")]
    public async Task<IActionResult> VenderBilheteria(CriarIngressoDTO dto)
    {
        try
        {
            var ingresso = await _service.CriarAsync(dto);
            return Ok(ingresso);
        }
        catch(Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }


    [HttpGet]
    public async Task<IActionResult> ListarTodos()
    {
        var ingressos = await _service.ListarTodosAsync();
        return Ok(ingressos);
    }


    [Authorize]
    [HttpGet("meus")]
    public async Task<IActionResult> ListarMeusIngressos()
    {
        var usuarioIdClaim = User.FindFirst(
            ClaimTypes.NameIdentifier
        )?.Value;

        if (
            string.IsNullOrWhiteSpace(usuarioIdClaim) ||
            !int.TryParse(usuarioIdClaim, out var usuarioId)
        )
        {
            return Unauthorized(new
            {
                mensagem = "Token inválido ou usuário não identificado."
            });
        }

        var ingressos = await _service
            .ListarDoUsuarioAsync(usuarioId);

        return Ok(ingressos);
    }


    [Authorize]
    [HttpGet("{id:int}")]
    public async Task<IActionResult> BuscarPorId(int id)
    {
        var usuarioIdClaim = User.FindFirst(
            ClaimTypes.NameIdentifier
        )?.Value;
    
        if (
            string.IsNullOrWhiteSpace(usuarioIdClaim) ||
            !int.TryParse(usuarioIdClaim, out var usuarioId)
        )
        {
            return Unauthorized(new
            {
                mensagem = "Token inválido ou usuário não identificado."
            });
        }
    
        var ingresso = await _service.BuscarPorIdAsync(
            id,
            usuarioId
        );
    
        if (ingresso is null)
        {
            return NotFound(new
            {
                mensagem = "Ingresso não encontrado."
            });
        }
    
        return Ok(ingresso);
    }


    [HttpPost("validar")]
    public async Task<IActionResult> Validar(ValidarIngressoDTO dto)
    {
        var resultado = await _service.ValidarAsync(dto);
        return Ok(resultado);
    }


    [HttpDelete("{id}")]
    public async Task<IActionResult> Excluir(int id)
    {
        var removido = await _service.ExcluirAsync(id);

        if (!removido) return NotFound();

        return NoContent();
    }
}