import type { Metadata } from "next";
import { InstitutionalShell } from "../_components/institutional-shell";
export const metadata: Metadata = {
  title: "Trocas e Devoluções — Em elaboração | Guardian Bay",
  description:
    "Estado atual do projeto e pontos pendentes para uma futura política de trocas e devoluções.",
  robots: { index: false, follow: true },
};
const sections = [
  { id: "disponibilidade", title: "O que existe hoje" },
  { id: "condicoes", title: "Condições e prazos" },
  { id: "procedimento", title: "Procedimentos e custos" },
  { id: "apoio", title: "Onde buscar orientação" },
];
export default function ReturnsPage() {
  return (
    <InstitutionalShell
      title="Trocas e Devoluções"
      description="Informação clara sobre uma operação que ainda não faz parte deste projeto acadêmico."
      sections={sections}
      draft
    >
      <section id="disponibilidade" tabIndex={-1}>
        <h2>O que existe hoje</h2>
        <p>
          A plataforma não possui fluxo de solicitação de troca, cancelamento,
          devolução ou reembolso. Os pagamentos são fictícios e não movimentam
          dinheiro.
        </p>
        <p>
          Os estados de pagamento recusado ou expirado não representam uma
          solicitação de devolução. Consulte o detalhe do pedido para entender
          seu resultado.
        </p>
      </section>
      <section id="condicoes" tabIndex={-1}>
        <h2>Condições e prazos</h2>
        <p>
          Elegibilidade, condições de produto e prazos de uma eventual operação
          comercial ainda precisam ser definidos e revisados conforme a
          legislação aplicável. Esta minuta não limita direitos legais nem
          estabelece uma política comercial vigente.
        </p>
      </section>
      <section id="procedimento" tabIndex={-1}>
        <h2>Procedimentos e custos</h2>
        <p>
          Canal de solicitação, etapas de análise, logística reversa, custos e
          forma de reembolso não foram definidos. Não há promessa de frete
          reverso gratuito, estorno ou atendimento automático.
        </p>
        <p>
          Por esse motivo, esta página não oferece um botão para abrir uma
          solicitação inexistente.
        </p>
      </section>
      <section id="apoio" tabIndex={-1}>
        <h2>Onde buscar orientação</h2>
        <p>
          A Central de Ajuda explica os fluxos já disponíveis. O canal e o
          horário de atendimento permanecem pendentes; não envie senha ou dados
          de cartão real.
        </p>
        <p>
          A publicação de uma política definitiva depende da definição da
          operação e da aprovação do responsável pelo projeto.
        </p>
      </section>
    </InstitutionalShell>
  );
}
