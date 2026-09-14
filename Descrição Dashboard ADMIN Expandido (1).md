# 📑 Documento de Justificativa: Dashboard do Administrador
**Projeto de Extensão UEFS — MinhasCompras-BA**

---

## 🎯 1. Visão Geral e Justificativa do Painel
O **MinhasCompras-BA** é um projeto de extensão universitária da UEFS que lida com extração de dados públicos (SEFAZ-BA), educação financeira cidadã e inteligência de dados. 

O Dashboard de Admin não é apenas uma tela de monitoramento; ele é o **instrumento de prestação de contas, governança técnica e avaliação de impacto social** para a coordenação do projeto, orientadores e instâncias acadêmicas.

---

## 2. 🎛️ Justificativa do Cabeçalho e Filtros de Período

* **Opções de Variação no Período:** `Últimos 7 dias`, `Últimos 30 dias` (Padrão), `Mês a Mês`, `Ano a Ano` e `Geral (Todo o Histórico)`.
* **Por que foi projetado assim:**
  * **Curto Prazo (7 e 30 dias):** Permite detectar anomalias imediatas no robô Selenium, quedas de conectividade na SEFAZ ou respostas a eventos recentes de divulgação.
  * **Médio e Longo Prazo (Mês a Mês, Ano a Ano, Geral):** Atende à necessidade acadêmica de gerar **relatórios semestrais e anuais de extensão**, permitindo comparar a evolução do projeto entre semestres letivos.

---

## 3. 📌 Justificativa dos 5 Cards de KPI Principais

### Card 1: 👥 Cidadãos Cadastrados (`Total` + `Variação no Período`)
* **Justificativa:** É a métrica primária de **alcance social**. Mede a penetração da tecnologia desenvolvida na UEFS junto à sociedade civil.

### Card 2: 🧾 Notas Fiscais Importadas (`Total` + `Variação no Período`)
* **Justificativa:** Mede o **engajamento contínuo**. Um número crescente de notas por usuário comprova que a ferramenta se tornou um hábito real de controle financeiro para o cidadão, e não um uso único descartável.

### Card 3: 📦 Itens Digitalizados (`Total` + `Variação no Período`)
* **Justificativa:** Representa o **tamanho real da base de conhecimento**. Cada item catalogado alimenta a base estatística de preços da Bahia, tornando a amostra de dados cada vez mais densa e confiável para pesquisas.

### Card 4: 💰 Volume Financeiro Rastreado (`Total R$` + `Variação no Período`)
* **Justificativa:** Demonstra a **relevância econômica do projeto**. Apresentar valores financeiros consolidados (ex: centenas de milhares de reais gerenciados) traduz o impacto do software em números compreensíveis para órgãos de fomento, imprensa e comunidade acadêmica.

### Card 5: ⚡ Estabilidade do Scraper (`% de Sucesso` + `Tempo Médio`)
* **Justificativa:** Garante a **observabilidade da infraestrutura**. Como o projeto depende de um robô que interage com um portal governamental de terceiros (SEFAZ-BA), este KPI alerta instantaneamente se a taxa de sucesso cair ou se o tempo de resposta se degradar, sinalizando necessidade de manutenção antes que os usuários comecem a reclamar.

---

## 4. 📈 Justificativa do Bloco de Operação Técnica e Crescimento

### 📈 Gráfico 1: Curva de Crescimento e Adesão (Usuários vs. Notas)
* **Justificativa:** Permite cruzar duas variáveis essenciais: a entrada de novos usuários e a produtividade da plataforma. Isso permite saber se o crescimento do banco de dados é puxado por muitos usuários novos ou pela alta frequência de usuários antigos (retenção).

### 🤖 Gráfico 2: Desempenho Diário do Scraper (Barras Empilhadas)
* **Justificativa:** Isola a causa raiz de problemas operacionais. As barras empilhadas diferenciam visualmente:
  * **Verde (`COMPLETED`):** Operação normal.
  * **Amarelo (`EXPIRED`):** Usuários que desistiram ou demoraram a preencher o captcha (problema de fricção humana/UX).
  * **Vermelho (`FAILED`):** Erros de código, bloqueio de IP ou instabilidade da SEFAZ (problema técnico).

---

## 5. 🛒 Justificativa do Bloco de Inteligência de Mercado Estadual

### 🛒 Painel 1: Top Produtos Mais Populares na Bahia (Cesta Básica Coletiva)
* **Justificativa:** Transforma dados fiscais brutos em **utilidade pública e pesquisa econômica**. Permite que o projeto de extensão acompanhe o preço médio estadual de itens essenciais (leite, arroz, óleo, feijão), gerando insumos para estudos sobre custo de vida na Bahia.

### 📍 Painel 2: Alcance Geográfico e Redes Comerciais Líderes
* **Justificativa:** Comprova a **descentralização do projeto**. Demonstra se o aplicativo está concentrado apenas em Feira de Santana (sede da UEFS) ou se já alcançou Salvador e municípios do interior baiano, além de mapear as redes comerciais onde o cidadão mais consome.

> 📌 **Justificativa da Nota (Top 5 a 10):** Limitar a exibição inicial ao Top 5/10 preserva a limpeza visual da tela e a velocidade de renderização, deixando análises exaustivas (centenas de linhas) para relatórios sob demanda ou consultas diretas ao banco.

---

## 6. 📱 Justificativa do Bloco de Telemetria e Usabilidade

### 📱 Widget 1: Canal de Importação Preferido (Câmera QR vs. Foto vs. Manual)
* **Justificativa:** **Direciona o esforço da equipe de desenvolvimento**. Se os dados mostrarem que 70%+ dos usuários utilizam a Câmera em tempo real, os desenvolvedores sabem que devem priorizar a otimização de bibliotecas de vídeo móvel em vez de refatorar formulários de digitação.

### 💳 Widget 2: Formas de Pagamento Coletivas (PIX, Cartões, Dinheiro)
* **Justificativa:** Fornece **dados sociológicos e de inclusão financeira**. Permite observar a adesão do cidadão baiano a pagamentos instantâneos (PIX) versus meios tradicionais no varejo físico.

### 🏷️ Widget 3: Qualidade do Catálogo (EAN com Código vs. SEM GTIN)
* **Justificativa:** **Governança da base de dados**. Itens identificados como `SEM GTIN` exigem agrupamentos heurísticos por NCM e descrição. Saber essa proporção ajuda os pesquisadores a avaliar a precisão da catalogação dos produtos.

> 📌 **Justificativa da Nota (Recortes Mês a Mês e Geral):** Hábitos de uso e telemetria variam pouco em janelas curtas de 7 dias. O recorte mensal ou histórico é o ideal para observar tendências comportamentais consolidadas.

---

## 7. 🚨 Justificativa da Tabela de Logs de Monitoramento em Tempo Real

* **Justificativa:** **Eficiência e agilidade no suporte técnico**. 
  * Sem essa tabela, para descobrir por que uma nota falhou, o desenvolvedor precisaria abrir o terminal SSH do servidor de produção e vasculhar centenas de linhas de log textual.
  * Com a tabela na interface, o administrador bate o olho e identifica imediatamente o motivo (ex: *"Limite de tentativas de captcha"*, *"Timeout SEFAZ"* ou *"Mudança de seletor"*), reduzindo o tempo de resolução de bugs.