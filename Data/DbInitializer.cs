using CinemaAPI.Models;

namespace CinemaAPI.Data;

public static class DbInitializer
{
    public static async Task PopularAssentosAsync(AppDbContext context)
    {
        if (context.Assentos.Any())
            return;

        var assentos = new List<Assento>();


        for (char fileira = 'A'; fileira <= 'I'; fileira++)
        {
            for (int numero = 1; numero <= 15; numero++)
            {
                assentos.Add(new Assento
                {
                    Codigo = $"{fileira}{numero}"
                });
            }
        }

        for (int numero = 1; numero <= 19; numero++)
        {
            assentos.Add(new Assento
                {
                    Codigo = $"J{numero}"
                });
        }

        context.Assentos.AddRange(assentos);
        await context.SaveChangesAsync();
    }
}