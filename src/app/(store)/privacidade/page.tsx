import type { Metadata } from "next";
import { InstitutionalShell } from "../_components/institutional-shell";

export const metadata: Metadata = {
  title: "Privacidade — Em elaboração | Guardian Bay",
  description:
    "Informações sobre os dados utilizados pelo projeto e definições pendentes da política de privacidade.",
  robots: { index: false, follow: true },
};
const sections = [
  { id: "dados", title: "Dados utilizados" },
  { id: "finalidades", title: "Uso no projeto" },
  { id: "historico", title: "Endereços e histórico" },
  { id: "responsaveis", title: "Responsáveis e compartilhamento" },
  { id: "direitos", title: "Retenção e direitos" },
];
export default function PrivacyPage() {
  return (
    <InstitutionalShell
      title="Privacidade"
      description="Transparência começa por explicar o que existe e o que ainda precisa ser definido."
      sections={sections}
      draft
    >
      <section id="dados" tabIndex={-1}>
        <h2>Dados utilizados</h2>
        <p>
          A conta utiliza e-mail e senha, com nome opcional; a senha é
          armazenada em forma de hash. A aplicação mantém registros de sessão,
          carrinho, pedidos e eventos de segurança vinculados a identificadores.
        </p>
        <p>
          O cadastro de endereço inclui destinatário, CEP, logradouro, número,
          complemento, bairro, cidade e estado. Não é necessário cadastrar dados
          bancários reais. O checkout solicita nome e CPF do comprador. O CPF é
          armazenado de forma criptografada no servidor e apresentado mascarado
          nas telas.
        </p>
      </section>
      <section id="finalidades" tabIndex={-1}>
        <h2>Uso no projeto</h2>
        <p>
          Esses dados sustentam o acesso à conta, a identificação dos seus
          próprios endereços e pedidos, o carrinho persistente e a simulação de
          compra. Registros de segurança apoiam os controles de acesso e
          prevenção de abuso.
        </p>
        <p>
          Um cookie de sessão permite reconhecer o acesso autenticado. O número
          de cartão informado é utilizado transitoriamente para validação
          matemática, sem persistência do número completo. O CVV é validado
          apenas no formulário e descartado, sem envio ao servidor na nova
          interface. O método salvo contém somente bandeira, últimos quatro
          dígitos e validade; isso não habilita cobrança real.
        </p>
        <p>
          As bases legais e a redação final das finalidades ainda dependem de
          definição e revisão. Não há um consentimento obrigatório novo nesta
          página.
        </p>
      </section>
      <section id="historico" tabIndex={-1}>
        <h2>Endereços e histórico</h2>
        <p>
          Excluir um endereço salvo não apaga o endereço registrado em um pedido
          anterior. Os itens e valores do pedido também preservam o registro da
          compra simulada.
        </p>
        <p>
          Salvar dados do comprador, endereço ou identificação do cartão na
          conta é opcional. Mesmo sem salvar na conta, o pedido mantém nome, CPF
          protegido, endereço e identificação mascarada do pagamento. Excluir
          dados da conta não apaga esse histórico.
        </p>
        <p>
          Essa descrição não estabelece um prazo de retenção nem promete
          exclusão automática do histórico.
        </p>
      </section>
      <section id="responsaveis" tabIndex={-1}>
        <h2>Responsáveis e compartilhamento</h2>
        <p>
          A identificação do responsável pelo tratamento, seu canal de contato e
          a relação de operadores ou serviços de infraestrutura ainda precisam
          ser consolidadas. Não afirmamos ausência de compartilhamento ou
          transferência internacional sem esse levantamento.
        </p>
      </section>
      <section id="direitos" tabIndex={-1}>
        <h2>Retenção e direitos</h2>
        <p>
          Os prazos e critérios de retenção, o procedimento de atendimento aos
          titulares e o canal responsável ainda não foram aprovados. Não existe
          nesta interface um serviço de exclusão de conta, exportação de dados
          ou solicitação de direitos.
        </p>
        <p>
          O conteúdo definitivo deverá ser revisado conforme o tratamento
          efetivo de dados e a legislação aplicável. O caráter acadêmico não
          deve ser interpretado como garantia de dispensa de obrigações.
        </p>
      </section>
    </InstitutionalShell>
  );
}
