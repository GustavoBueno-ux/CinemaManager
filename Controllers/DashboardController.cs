using CinemaAPI.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CinemaAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Funcionario")]
public class DashboardController : ControllerBase
{
    private readonly IDashboardService _dashboardService;

    public DashboardController(
        IDashboardService dashboardService
    )
    {
        _dashboardService = dashboardService;
    }

    [HttpGet]
    public async Task<IActionResult> BuscarDashboard()
    {
        try
        {
            var dashboard = await _dashboardService.BuscarAsync();

            return Ok(dashboard);
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
                mensagem = "Ocorreu um erro interno ao carregar o dashboard."
            });
        }
    }
}