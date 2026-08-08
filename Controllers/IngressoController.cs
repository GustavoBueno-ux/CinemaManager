using CinemaAPI.DTOs.Ingressos;
using CinemaAPI.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace CinemaAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class IngressoController : ControllerBase
{
    private readonly IIngressoService _service;

    public IngressoController(
        IIngressoService service
    )
    {
        _service = service;
    }


    [HttpPost("online")]
    public async Task<IActionResult> ComprarOnline(
        CriarIngressoDTO dto
    )
    {
        try
        {
            var ingresso =
                await _service.CriarAsync(dto);

            return Ok(ingresso);
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
                    "Ocorreu um erro interno ao realizar a compra."
            });
        }
    }


    [Authorize]
    [HttpPost("online/lote")]
    public async Task<IActionResult> ComprarIngressosEmLote(
        [FromBody] CriarIngressosEmLoteDTO dto
    )
    {
        var usuarioIdClaim = User.FindFirst(
            ClaimTypes.NameIdentifier
        )?.Value;

        if (
            !int.TryParse(
                usuarioIdClaim,
                out var usuarioId
            )
        )
        {
            return Unauthorized(new
            {
                mensagem =
                    "Token inválido ou usuário não identificado."
            });
        }

        try
        {
            var ingressos =
                await _service.CriarEmLoteAsync(
                    usuarioId,
                    dto
                );

            return Created(
                string.Empty,
                new
                {
                    quantidade =
                        ingressos.Count,

                    valorTotal =
                        ingressos.Sum(
                            i => i.ValorPago
                        ),

                    ingressos
                }
            );
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
        catch (Exception)
        {
            return StatusCode(500, new
            {
                mensagem =
                    "Ocorreu um erro interno ao realizar a compra."
            });
        }
    }


    [Authorize(Roles = "Funcionario")]
    [HttpPost("bilheteria/lote")]
    public async Task<IActionResult> VenderIngressosBilheteria(
        [FromBody] CriarVendaBilheteriaDTO dto
    )
    {
        var funcionarioIdClaim = User.FindFirst(
            ClaimTypes.NameIdentifier
        )?.Value;

        if (
            !int.TryParse(
                funcionarioIdClaim,
                out var funcionarioId
            )
        )
        {
            return Unauthorized(new
            {
                mensagem =
                    "Token inválido ou funcionário não identificado."
            });
        }

        try
        {
            var venda =
                await _service.CriarVendaBilheteriaAsync(
                    funcionarioId,
                    dto
                );

            return Created(
                string.Empty,
                venda
            );
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
        catch (Exception)
        {
            return StatusCode(500, new
            {
                mensagem =
                    "Ocorreu um erro interno ao realizar a venda."
            });
        }
    }


    [HttpGet]
    public async Task<IActionResult> ListarTodos()
    {
        var ingressos =
            await _service.ListarTodosAsync();

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
            string.IsNullOrWhiteSpace(
                usuarioIdClaim
            ) ||
            !int.TryParse(
                usuarioIdClaim,
                out var usuarioId
            )
        )
        {
            return Unauthorized(new
            {
                mensagem =
                    "Token inválido ou usuário não identificado."
            });
        }

        var ingressos =
            await _service
                .ListarDoUsuarioAsync(
                    usuarioId
                );

        return Ok(ingressos);
    }


    [Authorize]
    [HttpGet("{id:int}")]
    public async Task<IActionResult> BuscarPorId(
        int id
    )
    {
        var usuarioIdClaim = User.FindFirst(
            ClaimTypes.NameIdentifier
        )?.Value;

        if (
            string.IsNullOrWhiteSpace(
                usuarioIdClaim
            ) ||
            !int.TryParse(
                usuarioIdClaim,
                out var usuarioId
            )
        )
        {
            return Unauthorized(new
            {
                mensagem =
                    "Token inválido ou usuário não identificado."
            });
        }

        var ingresso =
            await _service.BuscarPorIdAsync(
                id,
                usuarioId
            );

        if (ingresso is null)
        {
            return NotFound(new
            {
                mensagem =
                    "Ingresso não encontrado."
            });
        }

        return Ok(ingresso);
    }

    [Authorize(Roles = "Funcionario")]
    [HttpGet("bilheteria/codigo/{codigo}")]
    public async Task<IActionResult>
        BuscarPorCodigoRecuperacao(
            string codigo
        )
    {
        var ingresso =
            await _service
                .BuscarPorCodigoRecuperacaoAsync(
                    codigo
                );
    
        if (ingresso is null)
        {
            return NotFound(new
            {
                mensagem =
                    "Ingresso não encontrado ou indisponível para recuperação."
            });
        }
    
        return Ok(ingresso);
    }


    [HttpPost("validar")]
    public async Task<IActionResult> Validar(
        ValidarIngressoDTO dto
    )
    {
        var resultado =
            await _service.ValidarAsync(dto);

        return Ok(resultado);
    }


    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Excluir(
        int id
    )
    {
        var removido =
            await _service.ExcluirAsync(id);

        if (!removido)
        {
            return NotFound(new
            {
                mensagem =
                    "Ingresso não encontrado."
            });
        }

        return NoContent();
    }
}