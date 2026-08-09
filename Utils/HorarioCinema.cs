namespace CinemaAPI.Utils
{
    public static class HorarioCinema
    {
        private static readonly TimeZoneInfo FusoHorario =
            TimeZoneInfo.FindSystemTimeZoneById("America/Sao_Paulo");

        public static DateTime Agora =>
            TimeZoneInfo.ConvertTimeFromUtc(
                DateTime.UtcNow,
                FusoHorario
            );
    }
}