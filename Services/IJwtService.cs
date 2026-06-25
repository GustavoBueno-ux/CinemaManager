using CinemaAPI.Models;

namespace CinemaAPI.Services;

public interface IJwtService
{
    string GerarToken(Usuario usuario);
}