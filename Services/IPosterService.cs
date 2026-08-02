using Microsoft.AspNetCore.Http;

namespace CinemaAPI.Services;

public interface IPosterService
{
    Task<string> SalvarAsync(IFormFile arquivo);
}