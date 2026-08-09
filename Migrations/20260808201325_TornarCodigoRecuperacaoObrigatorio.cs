using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CinemaAPI.Migrations
{
    public partial class TornarCodigoRecuperacaoObrigatorio : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "CodigoRecuperacao",
                table: "Ingressos",
                type: "varchar(8)",
                maxLength: 8,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "varchar(8)",
                oldMaxLength: 8,
                oldNullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "CodigoRecuperacao",
                table: "Ingressos",
                type: "varchar(8)",
                maxLength: 8,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "varchar(8)",
                oldMaxLength: 8)
                .Annotation("MySql:CharSet", "utf8mb4");
        }
    }
}