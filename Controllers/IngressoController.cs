using CinemaAPI.DTOs.Ingressos;
using CinemaAPI.Services;
using Microsoft.AspNetCore.Mvc;

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


    [HttpGet("{id}")]
    public async Task<IActionResult> BuscarPorId(int id)
    {
        var ingresso = await _service.BuscarPorIdAsync(id);

        if (ingresso == null) return NotFound();

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