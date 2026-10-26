import type { Metadata } from "next";
import { InstitutionalShell } from "../_components/institutional-shell";
export const metadata: Metadata = {
  title: "Termos de Uso — Em elaboração | Guardian Bay",
  description:
    "Natureza acadêmica e funcionamento atual da plataforma; termos definitivos pendentes de aprovação.",
  robots: { index: false, follow: true },
};
const sections = [
  { id: "projeto", title: "Natureza do projeto" },
  { id: "acesso", title: "Conta e acesso" },
  { id: "compra", title: "Catálogo e pedidos" },
  { id: "simulacao", title: "Pagamento e entrega" },
  { id: "definicoes", title: "Definições pendentes" },
];
export default function TermsPage() {
  return (
    <InstitutionalShell
      title="Termos de Uso"
      description="Um panorama do funcionamento atual da plataforma, com seus limites apresentados de forma clara."
      sections={sections}
      draft
    >
      <section id="projeto" tabIndex={-1}>
        <h2>Natureza do projeto</h2>
        <p>
          Guardian Bay é um projeto acadêmico de e-commerce. Este documento
          descreve comportamentos implementados; não estabelece condições
          contratuais definitivas ou garantias comerciais.
        </p>
      </section>
      <section id="acesso" tabIndex={-1}>
        <h2>Conta e acesso</h2>
        <p>
          O catálogo pode ser consultado publicamente. Carrinho, checkout e
          Minha Conta exigem autenticação. Cada usuário consulta seus próprios
          pedidos e endereços; a área administrativa exige permissão específica.
        </p>
        <p>
          Não compartilhe sua senha e utilize somente informações de teste nos
          campos de pagamento simulado.
        </p>
      </section>
      <section id="compra" tabIndex={-1}>
        <h2>Catálogo e pedidos</h2>
        <p>
          O carrinho não reserva estoque nem congela preços. O servidor confere
          preço vigente, quantidade e disponibilidade ao confirmar o pedido.
          Produtos indisponíveis ou quantidades sem estoque impedem a
          confirmação do conjunto.
        </p>
        <p>
          O detalhe do pedido apresenta os itens, os valores registrados e o
          estado do pagamento. A criação de um pedido pendente não equivale à
          aprovação do pagamento.
        </p>
      </section>
      <section id="simulacao" tabIndex={-1}>
        <h2>Pagamento e entrega</h2>
        <p>
          Cartão fictício, Pix e boleto são simulações sem movimentação
          financeira. Os métodos têm resultados e prazos operacionais
          apresentados nas respectivas telas.
        </p>
        <p>
          Não há gateway bancário, cálculo de frete, operação real de entrega ou
          reembolso. O cadastro de endereço não representa promessa de envio.
        </p>
      </section>
      <section id="definicoes" tabIndex={-1}>
        <h2>Definições pendentes</h2>
        <p>
          Identificação do responsável, condições definitivas de uso, suporte e
          enquadramento jurídico ainda dependem de aprovação. Não foram
          estabelecidas multas, garantias, foro ou cláusulas de exclusão de
          direitos.
        </p>
        <p>
          A implementação desta página não representa aprovação jurídica dos
          Termos de Uso, nem acrescenta uma etapa de aceite ao cadastro ou
          checkout.
        </p>
      </section>
    </InstitutionalShell>
  );
}
