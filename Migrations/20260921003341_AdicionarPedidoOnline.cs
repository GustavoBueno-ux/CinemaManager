using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CinemaAPI.Migrations
{
    /// <inheritdoc />
    public partial class AdicionarPedidoOnline : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PedidosOnline",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    UsuarioId = table.Column<int>(type: "int", nullable: false),
                    SessaoId = table.Column<int>(type: "int", nullable: false),
                    ValorTotal = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    StripeCheckoutSessionId = table.Column<string>(type: "varchar(255)", maxLength: 255, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    StripePaymentIntentId = table.Column<string>(type: "varchar(255)", maxLength: 255, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    CriadoEm = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    ExpiraEm = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    VendaId = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PedidosOnline", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PedidosOnline_Sessoes_SessaoId",
                        column: x => x.SessaoId,
                        principalTable: "Sessoes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PedidosOnline_Usuarios_UsuarioId",
                        column: x => x.UsuarioId,
                        principalTable: "Usuarios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PedidosOnline_Vendas_VendaId",
                        column: x => x.VendaId,
                        principalTable: "Vendas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "PedidosOnlineAssentos",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    PedidoOnlineId = table.Column<int>(type: "int", nullable: false),
                    AssentoId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PedidosOnlineAssentos", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PedidosOnlineAssentos_Assentos_AssentoId",
                        column: x => x.AssentoId,
                        principalTable: "Assentos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PedidosOnlineAssentos_PedidosOnline_PedidoOnlineId",
                        column: x => x.PedidoOnlineId,
                        principalTable: "PedidosOnline",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_PedidosOnline_SessaoId",
                table: "PedidosOnline",
                column: "SessaoId");

            migrationBuilder.CreateIndex(
                name: "IX_PedidosOnline_StripeCheckoutSessionId",
                table: "PedidosOnline",
                column: "StripeCheckoutSessionId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PedidosOnline_StripePaymentIntentId",
                table: "PedidosOnline",
                column: "StripePaymentIntentId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PedidosOnline_UsuarioId",
                table: "PedidosOnline",
                column: "UsuarioId");

            migrationBuilder.CreateIndex(
                name: "IX_PedidosOnline_VendaId",
                table: "PedidosOnline",
                column: "VendaId");

            migrationBuilder.CreateIndex(
                name: "IX_PedidosOnlineAssentos_AssentoId",
                table: "PedidosOnlineAssentos",
                column: "AssentoId");

            migrationBuilder.CreateIndex(
                name: "IX_PedidosOnlineAssentos_PedidoOnlineId_AssentoId",
                table: "PedidosOnlineAssentos",
                columns: new[] { "PedidoOnlineId", "AssentoId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PedidosOnlineAssentos");

            migrationBuilder.DropTable(
                name: "PedidosOnline");
        }
    }
}
