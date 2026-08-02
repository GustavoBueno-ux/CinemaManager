using Microsoft.AspNetCore.Http;

namespace CinemaAPI.Services;

public class PosterService : IPosterService
{
    private const long TamanhoMaximoArquivo =
        5 * 1024 * 1024;

    private static readonly Dictionary<string, string>
        TiposPermitidos = new(StringComparer.OrdinalIgnoreCase)
        {
            [".jpg"] = "image/jpeg",
            [".jpeg"] = "image/jpeg",
            [".png"] = "image/png",
            [".webp"] = "image/webp"
        };

    private readonly IWebHostEnvironment _environment;

    public PosterService(
        IWebHostEnvironment environment
    )
    {
        _environment = environment;
    }

    public async Task<string> SalvarAsync(
        IFormFile arquivo
    )
    {
        ValidarArquivoBasico(arquivo);

        var extensao = Path
            .GetExtension(arquivo.FileName)
            .ToLowerInvariant();

        ValidarExtensaoEContentType(
            extensao,
            arquivo.ContentType
        );

        await ValidarAssinaturaArquivoAsync(
            arquivo,
            extensao
        );

        var nomeArquivo =
            $"{Guid.NewGuid():N}{extensao}";

        var webRootPath =
            _environment.WebRootPath
            ?? Path.Combine(
                _environment.ContentRootPath,
                "wwwroot"
            );

        var pastaPosters = Path.Combine(
            webRootPath,
            "uploads",
            "posters"
        );

        Directory.CreateDirectory(pastaPosters);

        var caminhoCompleto = Path.Combine(
            pastaPosters,
            nomeArquivo
        );

        await using var stream =
            new FileStream(
                caminhoCompleto,
                FileMode.CreateNew,
                FileAccess.Write,
                FileShare.None,
                81920,
                useAsync: true
            );

        await arquivo.CopyToAsync(stream);

        return $"/uploads/posters/{nomeArquivo}";
    }

    private static void ValidarArquivoBasico(
        IFormFile arquivo
    )
    {
        if (
            arquivo is null ||
            arquivo.Length == 0
        )
        {
            throw new ArgumentException(
                "Arquivo não enviado."
            );
        }

        if (arquivo.Length > TamanhoMaximoArquivo)
        {
            throw new ArgumentException(
                "A imagem excede o tamanho máximo permitido de 5 MB."
            );
        }
    }

    private static void ValidarExtensaoEContentType(
        string extensao,
        string contentType
    )
    {
        if (
            !TiposPermitidos.TryGetValue(
                extensao,
                out var contentTypeEsperado
            )
        )
        {
            throw new ArgumentException(
                "Formato de imagem não permitido."
            );
        }

        if (
            !string.Equals(
                contentType,
                contentTypeEsperado,
                StringComparison.OrdinalIgnoreCase
            )
        )
        {
            throw new ArgumentException(
                "Formato de imagem não permitido."
            );
        }
    }

    private static async Task
        ValidarAssinaturaArquivoAsync(
            IFormFile arquivo,
            string extensao
        )
    {
        await using var stream =
            arquivo.OpenReadStream();

        var cabecalho = new byte[12];

        var bytesLidos = await stream.ReadAsync(
            cabecalho.AsMemory(0, cabecalho.Length)
        );

        var assinaturaValida =
            extensao switch
            {
                ".jpg" or ".jpeg" =>
                    EhJpeg(cabecalho, bytesLidos),

                ".png" =>
                    EhPng(cabecalho, bytesLidos),

                ".webp" =>
                    EhWebp(cabecalho, bytesLidos),

                _ => false
            };

        if (!assinaturaValida)
        {
            throw new ArgumentException(
                "O conteúdo do arquivo não corresponde a uma imagem válida."
            );
        }
    }

    private static bool EhJpeg(
        byte[] bytes,
        int quantidade
    )
    {
        return
            quantidade >= 3 &&
            bytes[0] == 0xFF &&
            bytes[1] == 0xD8 &&
            bytes[2] == 0xFF;
    }

    private static bool EhPng(
        byte[] bytes,
        int quantidade
    )
    {
        return
            quantidade >= 8 &&
            bytes[0] == 0x89 &&
            bytes[1] == 0x50 &&
            bytes[2] == 0x4E &&
            bytes[3] == 0x47 &&
            bytes[4] == 0x0D &&
            bytes[5] == 0x0A &&
            bytes[6] == 0x1A &&
            bytes[7] == 0x0A;
    }

    private static bool EhWebp(
        byte[] bytes,
        int quantidade
    )
    {
        return
            quantidade >= 12 &&

            bytes[0] == (byte)'R' &&
            bytes[1] == (byte)'I' &&
            bytes[2] == (byte)'F' &&
            bytes[3] == (byte)'F' &&

            bytes[8] == (byte)'W' &&
            bytes[9] == (byte)'E' &&
            bytes[10] == (byte)'B' &&
            bytes[11] == (byte)'P';
    }
}