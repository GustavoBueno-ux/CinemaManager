using CinemaAPI.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CinemaAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Funcionario")]
public class RelatorioController : ControllerBase
{
    private readonly IRelatorioService _relatorioService;

    public RelatorioController(
        IRelatorioService relatorioService
    )
    {
        _relatorioService = relatorioService;
    }


    [HttpGet]
    public async Task<IActionResult> BuscarRelatorio(
        [FromQuery] DateTime? inicio,
        [FromQuery] DateTime? fim
    )
    {
        if (!inicio.HasValue)
        {
            return BadRequest(new
            {
                mensagem =
                    "A data inicial é obrigatória."
            });
        }

        if (!fim.HasValue)
        {
            return BadRequest(new
            {
                mensagem =
                    "A data final é obrigatória."
            });
        }

        if (inicio.Value.Date > fim.Value.Date)
        {
            return BadRequest(new
            {
                mensagem =
                    "A data inicial não pode ser maior que a data final."
            });
        }

        try
        {
            var relatorio =
                await _relatorioService.BuscarAsync(
                    inicio.Value,
                    fim.Value
                );

            return Ok(relatorio);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new
            {
                mensagem = ex.Message
            });
        }
        catch (Exception)
        {
            return StatusCode(500, new
            {
                mensagem =
                    "Ocorreu um erro interno ao gerar o relatório."
            });
        }
    }
}