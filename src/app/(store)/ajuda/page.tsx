import type { Metadata } from "next";
import Link from "next/link";
import { InstitutionalShell } from "../_components/institutional-shell";

export const metadata: Metadata = {
  title: "Central de Ajuda | Guardian Bay",
  description:
    "Entenda conta, carrinho, pedidos e pagamentos simulados do Guardian Bay.",
};
const sections = [
  { id: "conta", title: "Conta e acesso" },
  { id: "compras", title: "Compras e carrinho" },
  { id: "pagamentos", title: "Pagamento simulado" },
  { id: "pedidos", title: "Meus pedidos" },
  { id: "entregas", title: "Endereços e entregas" },
  { id: "trocas", title: "Trocas e devoluções" },
  { id: "contato", title: "Contato e documentos" },
];

export default function HelpPage() {
  return (
    <InstitutionalShell
      title="Como podemos ajudar?"
      description="Informações para acompanhar cada etapa com tranquilidade. Este é um projeto acadêmico, com pagamento exclusivamente simulado."
      sections={sections}
    >
      <section id="conta" tabIndex={-1}>
        <h2>Conta e acesso</h2>
        <h3>Preciso de uma conta para comprar?</h3>
        <p>
          Você pode explorar o catálogo sem entrar. Carrinho, checkout,
          endereços e pedidos exigem uma conta. Ao concluir o cadastro, você já
          entra na aplicação.
        </p>
        <h3>Como altero minha senha?</h3>
        <p>
          Acesse Meu perfil para alterar a senha. Depois da alteração, entre
          novamente. A recuperação automática de senha por e-mail ainda não está
          disponível.
        </p>
        <Link className="auth-link" href="/account">
          Acessar meu perfil
        </Link>
      </section>
      <section id="compras" tabIndex={-1}>
        <h2>Compras e carrinho</h2>
        <h3>O carrinho reserva meus produtos?</h3>
        <p>
          Não. Quantidades, preços e disponibilidade são conferidos no servidor.
          Adicionar um item não reserva estoque nem congela seu preço.
        </p>
        <h3>Qual preço será utilizado?</h3>
        <p>
          O checkout utiliza o preço vigente no momento da confirmação. Você
          pode alterar quantidades ou remover itens antes de confirmar. Se
          houver indisponibilidade ou estoque insuficiente, revise o carrinho
          inteiro.
        </p>
        <Link className="auth-link" href="/cart">
          Revisar meu carrinho
        </Link>
      </section>
      <section id="pagamentos" tabIndex={-1}>
        <h2>Pagamento simulado</h2>
        <h3>Algum dinheiro será cobrado?</h3>
        <p>
          Não. Cartão, Pix e boleto são fictícios. Utilize somente os dados de
          teste indicados na aplicação; não informe cartão bancário real.
        </p>
        <h3>Como a simulação funciona?</h3>
        <p>
          O cartão fictício recebe um resultado na confirmação. Pix e boleto
          geram um pedido pendente: abra o detalhe do pedido para solicitar a
          confirmação quando o intervalo indicado terminar. Não há pagamento
          bancário ou aprovação automática com a página fechada.
        </p>
        <p>
          A regra acadêmica recusa totais a partir de R$ 10.000,00. A
          disponibilidade também pode impedir a aprovação. Consulte sempre o
          estado efetivamente apresentado no pedido.
        </p>
      </section>
      <section id="pedidos" tabIndex={-1}>
        <h2>Meus pedidos</h2>
        <h3>Onde acompanho o resultado?</h3>
        <p>
          O histórico mostra seus pedidos e permite abrir os detalhes. Pagamento
          pendente, aprovado, recusado e expirado são estados diferentes; um
          pedido criado não significa pagamento aprovado.
        </p>
        <h3>O que acontece se o pagamento falhar?</h3>
        <p>
          Uma recusa imediata no cartão preserva o carrinho. Pix e boleto
          convertem os itens em pedido pendente sem reservar estoque. Se depois
          houver falha ou expiração, o carrinho não é restaurado
          automaticamente; monte uma nova compra se quiser tentar novamente.
        </p>
        <Link className="auth-link" href="/orders">
          Ver meus pedidos
        </Link>
      </section>
      <section id="entregas" tabIndex={-1}>
        <h2>Endereços e entregas</h2>
        <p>
          Você pode salvar endereços brasileiros em Minha Conta e selecionar um
          deles no checkout. O pedido mantém o endereço registrado na compra,
          mesmo se o cadastro for editado ou excluído depois.
        </p>
        <p>
          Não há cálculo de frete, rastreamento ou operação real de entrega.
          Modalidades, custos e prazos de entrega não foram definidos; não há
          promessa de frete grátis.
        </p>
        <Link className="auth-link" href="/account/addresses">
          Gerenciar meus endereços
        </Link>
      </section>
      <section id="trocas" tabIndex={-1}>
        <h2>Trocas e devoluções</h2>
        <p>
          O projeto ainda não possui solicitação de troca, cancelamento ou
          reembolso. A página dedicada identifica os assuntos que dependem de
          definição, sem oferecer uma operação inexistente.
        </p>
        <Link className="auth-link" href="/trocas-e-devolucoes">
          Consultar o estado de Trocas e Devoluções
        </Link>
      </section>
      <section id="contato" tabIndex={-1}>
        <h2>Contato e documentos</h2>
        <p>
          O canal e o horário de atendimento ainda não foram definidos. Não há
          chat ou sistema de chamados. Nunca envie senha ou cartão real em uma
          solicitação de suporte.
        </p>
        <p>
          Privacidade, Termos de Uso e Trocas e Devoluções estão em elaboração.
          Seus textos não devem ser interpretados como políticas definitivas
          aprovadas.
        </p>
      </section>
    </InstitutionalShell>
  );
}
