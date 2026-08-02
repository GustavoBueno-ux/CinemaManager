using CinemaAPI.DTOs.Dashboard;

namespace CinemaAPI.Services;

public interface IDashboardService
{
    Task<DashboardResponseDTO> BuscarAsync();
}