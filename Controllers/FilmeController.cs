using CinemaAPI.DTOs.Filmes;
using CinemaAPI.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CinemaAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class FilmeController : ControllerBase
{
    private readonly IFilmeService _filmeService;
    private readonly IPosterService _posterService;

    public FilmeController(
        IFilmeService filmeService,
        IPosterService posterService
    )
    {
        _filmeService = filmeService;
        _posterService = posterService;
    }


    [Authorize(Roles = "Funcionario")]
    [HttpPost]
    public async Task<IActionResult> CadastrarFilme(
        CriarFilmeDTO dto
    )
    {
        var filme = await _filmeService.CriarAsync(dto);

        return Ok(filme);
    }


    [HttpGet]
    public async Task<IActionResult> ListarFilmes()
    {
        var filmes = await _filmeService.ListarTodosAsync();

        return Ok(filmes);
    }


    [HttpGet("ativos")]
    public async Task<IActionResult> ListarFilmesAtivos()
    {
        var filmes = await _filmeService
            .ListarComSessoesAtivasAsync();

        return Ok(filmes);
    }


    [HttpGet("{id}")]
    public async Task<IActionResult> BuscarFilmePorId(
        int id
    )
    {
        var filme = await _filmeService.BuscarPorIdAsync(id);

        if (filme == null)
        {
            return NotFound();
        }

        return Ok(filme);
    }


    [Authorize(Roles = "Funcionario")]
    [HttpPatch("{id}")]
    public async Task<IActionResult> PatchFilme(
        int id,
        PatchFilmeDTO dto
    )
    {
        var atualizado = await _filmeService.PatchAsync(
            id,
            dto
        );

        if (!atualizado)
        {
            return NotFound();
        }

        return NoContent();
    }


    [Authorize(Roles = "Funcionario")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> ExcluirFilmePorId(
        int id
    )
    {
        var excluido = await _filmeService.ExcluirAsync(id);

        if (!excluido)
        {
            return NotFound();
        }

        return NoContent();
    }


    [Authorize(Roles = "Funcionario")]
    [HttpPost("upload-poster")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> UploadPoster(
        IFormFile file
    )
    {
        try
        {
            var caminhoRelativo =
                await _posterService.SalvarAsync(file);

            var posterUrl =
                $"{Request.Scheme}://{Request.Host}" +
                caminhoRelativo;

            return Ok(new
            {
                posterUrl
            });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new
            {
                mensagem = ex.Message
            });
        }
        catch (IOException)
        {
            return StatusCode(500, new
            {
                mensagem =
                    "Não foi possível salvar a imagem."
            });
        }
        catch (Exception)
        {
            return StatusCode(500, new
            {
                mensagem =
                    "Ocorreu um erro interno ao enviar o pôster."
            });
        }
    }
}