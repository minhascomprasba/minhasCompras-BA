import { DownloadSimple, ChartBar, ChartLine, QrCode, ShieldCheck, CurrencyCircleDollar, Check } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../shared/api/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import './HomePage.css';

interface SystemStats {
  total_users: number;
  total_notas_mes: number;
  total_products: number;
}

const GREEN = '#17c85f';
const BLUE = '#3a8fe0';

export function HomePage() {
  // Busca estatísticas gerais do sistema em tempo real
  const { data: stats } = useQuery<SystemStats>({
    queryKey: ['system-stats'],
    queryFn: async () => {
      const response = await apiClient.get<SystemStats>('/stats');
      return response.data;
    },
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const faqData = [
    {
      question: 'O que é o Minhas Compras BA?',
      answer: 'É uma plataforma inteligente para você gerenciar suas Notas Fiscais de Consumidor Eletrônicas (NFC-e) do estado da Bahia. Você acompanha seus gastos mensais, monitora preços de produtos e organiza suas compras de forma automatizada.',
    },
    {
      question: 'Como funciona a importação automática?',
      answer: 'Basta digitar ou colar a chave de acesso de 44 dígitos impressa no DANFE da sua nota. O sistema realiza a busca direta dos dados nos servidores da Sefaz-BA de forma rápida e segura.',
    },
    {
      question: 'Meus dados de compras estão seguros?',
      answer: 'Sim, a segurança e privacidade são prioridades. Suas notas e históricos de compras são vinculados estritamente ao seu perfil protegido por senha e não são compartilhados com terceiros.',
    },
    {
      question: 'O serviço é realmente gratuito?',
      answer: 'Sim! O Minhas Compras BA é uma ferramenta totalmente gratuita criada para auxiliar no controle financeiro pessoal e economia doméstica de forma simplificada.',
    },
  ];

  const totalUsers = stats?.total_users ?? 0;
  const totalNotas = stats?.total_notas_mes ?? 0;
  const totalProducts = stats?.total_products ?? 0;

  const features = [
    {
      color: GREEN,
      bg: 'rgba(23, 200, 95, 0.12)',
      title: 'Importação automática',
      text: 'Cole a chave de 44 dígitos da NFC-e e o sistema busca os dados diretamente na Sefaz-BA.',
      icon: <DownloadSimple size={24} aria-hidden="true" />,
    },
    {
      color: BLUE,
      bg: 'rgba(58, 143, 224, 0.12)',
      title: 'Gastos por categoria',
      text: 'Veja para onde vai o seu dinheiro com gráficos claros de mercado, farmácia, combustível e mais.',
      icon: <ChartBar size={24} aria-hidden="true" />,
    },
    {
      color: GREEN,
      bg: 'rgba(23, 200, 95, 0.12)',
      title: 'Evolução de preços',
      text: 'Acompanhe a inflação pessoal comparando o preço histórico de cada produto que você compra.',
      icon: <ChartLine size={24} aria-hidden="true" />,
    },
    {
      color: BLUE,
      bg: 'rgba(58, 143, 224, 0.12)',
      title: 'Leitura por QR Code',
      text: 'Aponte a câmera para o QR Code do cupom fiscal e importe a nota em segundos, sem digitar.',
      icon: <QrCode size={24} aria-hidden="true" />,
    },
    {
      color: GREEN,
      bg: 'rgba(23, 200, 95, 0.12)',
      title: 'Histórico privado',
      text: 'Todas as suas notas ficam guardadas com segurança e vinculadas apenas ao seu perfil.',
      icon: <ShieldCheck size={24} aria-hidden="true" />,
    },
    {
      color: BLUE,
      bg: 'rgba(58, 143, 224, 0.12)',
      title: '100% gratuito',
      text: 'Uma ferramenta completa de controle financeiro pessoal, sem custos e sem anúncios.',
      icon: <CurrencyCircleDollar size={24} aria-hidden="true" />,
    },
  ];

  return (
    <div data-scope="home" className="container pb-20">
      {/* Hero Section */}
      <section className="hero-grid">
        <div className="hero-copy">
          <Badge variant="outline" className="hero-eyebrow">
            <span className="dot" /> Notas da Sefaz-BA
          </Badge>
          <h1 className="hero-title">
            Controle total das suas <span className="accent">compras</span> na Bahia.
          </h1>
          <p className="hero-subtitle">
            Importe suas NFC-e automaticamente, acompanhe gastos por categoria e monitore a
            evolução de preços dos produtos. Simples, seguro e gratuito.
          </p>

          <div className="hero-actions flex-wrap-gap">
            <Button render={<Link to="/register" />} nativeButton={false} size="lg" className="btn-hero-action">
              Criar Conta
            </Button>
            <Button render={<Link to="/login" />} nativeButton={false} variant="outline" size="lg" className="btn-hero-action home-login-action">
              Entrar
            </Button>
          </div>

          <div className="hero-proof">
            <div className="hero-proof-item">
              <span className="hero-proof-num">{totalUsers.toLocaleString('pt-BR')}</span>
              <span className="hero-proof-label">Usuários ativos</span>
            </div>
            <Separator orientation="vertical" className="hero-proof-divider" />
            <div className="hero-proof-item">
              <span className="hero-proof-num">{totalNotas.toLocaleString('pt-BR')}</span>
              <span className="hero-proof-label">Notas este mês</span>
            </div>
            <Separator orientation="vertical" className="hero-proof-divider" />
            <div className="hero-proof-item">
              <span className="hero-proof-num">{totalProducts.toLocaleString('pt-BR')}</span>
              <span className="hero-proof-label">Produtos</span>
            </div>
          </div>
        </div>

        <div className="hero-visual">
          <div className="hero-visual-glow" />
          <Card className="hero-visual-card">
            <img src="/icon.png" alt="Minhas Compras BA" />
          </Card>

          <Card className="hero-chip hero-chip--tl">
            <span className="hero-chip-icon chip-icon-green">
              <Check size={18} aria-hidden="true" />
            </span>
            <span>Nota importada<small>em tempo real</small></span>
          </Card>

          <Card className="hero-chip hero-chip--br">
            <span className="hero-chip-icon chip-icon-blue">
              <ChartLine size={18} aria-hidden="true" />
            </span>
            <span>Gastos organizados<small>por categoria</small></span>
          </Card>
        </div>
      </section>

      {/* Recursos */}
      <section className="features-section section-spaced">
        <h2 className="section-title">Tudo o que você precisa em um só lugar</h2>
        <p className="section-subtitle">
          Recursos pensados para deixar o controle das suas compras simples e automático.
        </p>
        <div className="features-grid">
          {features.map((f, i) => (
            <Card key={i} className="feature-card">
              <CardHeader>
                <div className="feature-icon" style={{ background: f.bg, color: f.color }}>
                  {f.icon}
                </div>
                <CardTitle><h3>{f.title}</h3></CardTitle>
                <CardDescription>{f.text}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      {/* Como Funciona */}
      <section className="steps-section section-spaced">
        <h2 className="section-title mb-10">Como Funciona</h2>
        <div className="steps-grid">
          <Card className="step-card">
            <CardHeader>
              <span className="step-number">01</span>
              <CardTitle><h3 className="step-card-title">Insira a Chave</h3></CardTitle>
              <CardDescription className="step-card-text">
                Digite ou cole a chave de acesso da sua NFC-e emitida em qualquer estabelecimento do estado da Bahia.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="step-card">
            <CardHeader>
              <span className="step-number">02</span>
              <CardTitle><h3 className="step-card-title">Confirme o Captcha</h3></CardTitle>
              <CardDescription className="step-card-text">
                Se solicitado, digite o código de verificação para que o robô possa consultar e estruturar as notas oficiais de forma autônoma.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="step-card">
            <CardHeader>
              <span className="step-number">03</span>
              <CardTitle><h3 className="step-card-title">Monitore os Gastos</h3></CardTitle>
              <CardDescription className="step-card-text">
                Veja sua dashboard preenchida com gráficos de categorias e acompanhe a oscilação histórica de preços de cada produto comprado.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Benefícios */}
      <section className="benefits-section section-spaced">
        <h2 className="section-title mb-10">Vantagens da Plataforma</h2>
        <Card className="benefits-glass-panel">
          <CardContent>
          <ul className="benefits-list">
            <li className="benefits-item">
              <span className="benefits-check"><Check size="1em" aria-hidden="true" /></span>
              <div>
                <strong className="benefit-title">Histórico Centralizado e Privado</strong>
                <span className="benefit-description">Suas notas fiscais e hábitos de consumo guardados de forma segura e pessoal no seu perfil.</span>
              </div>
            </li>
            <li className="benefits-item">
              <span className="benefits-check"><Check size="1em" aria-hidden="true" /></span>
              <div>
                <strong className="benefit-title">Análise Automatizada de Categorias</strong>
                <span className="benefit-description">Organização instantânea do destino do seu dinheiro (Mercado, Combustível, Farmácia) sem tabelas manuais.</span>
              </div>
            </li>
            <li className="benefits-item">
              <span className="benefits-check"><Check size="1em" aria-hidden="true" /></span>
              <div>
                <strong className="benefit-title">Acompanhamento de Inflação Pessoal</strong>
                <span className="benefit-description">Compare preços históricos do mesmo item (ex: leite ou café) ao longo do tempo e otimize seu orçamento.</span>
              </div>
            </li>
          </ul>
          </CardContent>
        </Card>
      </section>

      {/* FAQ */}
      <section className="faq-section section-spaced">
        <h2 className="section-title mb-10">Perguntas Frequentes</h2>
        <Accordion className="faq-list-container" multiple={false}>
          {faqData.map((item, idx) => (
            <AccordionItem key={item.question} value={idx} className="faq-item">
              <AccordionTrigger className="faq-question">{item.question}</AccordionTrigger>
              <AccordionContent className="faq-answer-text">{item.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* CTA Banner Rodapé */}
      <section aria-labelledby="home-cta-title">
        <Card className="home-cta-banner">
        <CardContent>
        <h2 id="home-cta-title" className="cta-banner-title">Comece a Controlar seus Gastos Agora Mesmo</h2>
        <p className="cta-banner-subtitle">
          Junte-se a nós e tenha acesso instantâneo ao painel completo de controle de consumo e monitoramento de produtos de forma simplificada.
        </p>
        <Button render={<Link to="/register" />} nativeButton={false} variant="secondary" size="lg" className="btn-cta-signup">
          Cadastrar-se Gratuitamente
        </Button>
        </CardContent>
        </Card>
      </section>
    </div>
  );
}
