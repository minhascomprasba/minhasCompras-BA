import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../shared/api/client';

interface SystemStats {
  total_users: number;
  total_notas_mes: number;
  total_products: number;
}

const GREEN = '#17c85f';
const BLUE = '#3a8fe0';

export function HomePage() {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

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

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

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
      icon: (
        <path d="M12 3v12m0 0l4-4m-4 4l-4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
      ),
    },
    {
      color: BLUE,
      bg: 'rgba(58, 143, 224, 0.12)',
      title: 'Gastos por categoria',
      text: 'Veja para onde vai o seu dinheiro com gráficos claros de mercado, farmácia, combustível e mais.',
      icon: (
        <>
          <path d="M21 21H4a1 1 0 0 1-1-1V3" />
          <path d="M7 15l4-4 3 3 5-6" />
        </>
      ),
    },
    {
      color: GREEN,
      bg: 'rgba(23, 200, 95, 0.12)',
      title: 'Evolução de preços',
      text: 'Acompanhe a inflação pessoal comparando o preço histórico de cada produto que você compra.',
      icon: (
        <>
          <path d="M3 3v18h18" />
          <path d="M7 14l3-3 3 3 4-5" />
        </>
      ),
    },
    {
      color: BLUE,
      bg: 'rgba(58, 143, 224, 0.12)',
      title: 'Leitura por QR Code',
      text: 'Aponte a câmera para o QR Code do cupom fiscal e importe a nota em segundos, sem digitar.',
      icon: (
        <>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <path d="M14 14h3v3M20 20h.01M17 20h.01M20 17h.01" />
        </>
      ),
    },
    {
      color: GREEN,
      bg: 'rgba(23, 200, 95, 0.12)',
      title: 'Histórico privado',
      text: 'Todas as suas notas ficam guardadas com segurança e vinculadas apenas ao seu perfil.',
      icon: (
        <>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="M9 12l2 2 4-4" />
        </>
      ),
    },
    {
      color: BLUE,
      bg: 'rgba(58, 143, 224, 0.12)',
      title: '100% gratuito',
      text: 'Uma ferramenta completa de controle financeiro pessoal, sem custos e sem anúncios.',
      icon: (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M14.5 9.5a2.5 2.5 0 0 0-2.5-1.5c-1.5 0-2.5 1-2.5 2s1 1.5 2.5 2 2.5 1 2.5 2-1 2-2.5 2a2.5 2.5 0 0 1-2.5-1.5M12 6.5v11" />
        </>
      ),
    },
  ];

  return (
    <div className="container pb-20">
      {/* Hero Section */}
      <section className="hero-grid">
        <div className="hero-copy">
          <span className="hero-eyebrow">
            <span className="dot" /> Notas da Sefaz-BA
          </span>
          <h1 className="hero-title">
            Controle total das suas <span className="accent">compras</span> na Bahia.
          </h1>
          <p className="hero-subtitle">
            Importe suas NFC-e automaticamente, acompanhe gastos por categoria e monitore a
            evolução de preços dos produtos. Simples, seguro e gratuito.
          </p>

          <div className="hero-actions flex-wrap-gap">
            <Link to="/register" className="btn btn-primary btn-neon btn-hero-action">
              Criar Conta
            </Link>
            <Link to="/login" className="btn btn-secondary btn-hero-action">
              Entrar
            </Link>
          </div>

          <div className="hero-proof">
            <div className="hero-proof-item">
              <span className="hero-proof-num">{totalUsers.toLocaleString('pt-BR')}</span>
              <span className="hero-proof-label">Usuários ativos</span>
            </div>
            <div className="hero-proof-divider" />
            <div className="hero-proof-item">
              <span className="hero-proof-num">{totalNotas.toLocaleString('pt-BR')}</span>
              <span className="hero-proof-label">Notas este mês</span>
            </div>
            <div className="hero-proof-divider" />
            <div className="hero-proof-item">
              <span className="hero-proof-num">{totalProducts.toLocaleString('pt-BR')}</span>
              <span className="hero-proof-label">Produtos</span>
            </div>
          </div>
        </div>

        <div className="hero-visual">
          <div className="hero-visual-glow" />
          <div className="hero-visual-card">
            <img src="/icon.png" alt="Minhas Compras BA" />
          </div>

          <div className="hero-chip hero-chip--tl">
            <span className="hero-chip-icon chip-icon-green">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
            <span>Nota importada<small>em tempo real</small></span>
          </div>

          <div className="hero-chip hero-chip--br">
            <span className="hero-chip-icon chip-icon-blue">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3v18h18" />
                <path d="M7 14l3-3 3 3 4-5" />
              </svg>
            </span>
            <span>Gastos organizados<small>por categoria</small></span>
          </div>
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
            <div key={i} className="feature-card">
              <div className="feature-icon" style={{ background: f.bg, color: f.color }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {f.icon}
                </svg>
              </div>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Como Funciona */}
      <section className="steps-section section-spaced">
        <h2 className="section-title mb-10">Como Funciona</h2>
        <div className="steps-grid">
          <div className="step-card">
            <span className="step-number">01</span>
            <h3 className="step-card-title">Insira a Chave</h3>
            <p className="step-card-text">
              Digite ou cole a chave de acesso da sua NFC-e emitida em qualquer estabelecimento do estado da Bahia.
            </p>
          </div>

          <div className="step-card">
            <span className="step-number">02</span>
            <h3 className="step-card-title">Confirme o Captcha</h3>
            <p className="step-card-text">
              Se solicitado, digite o código de verificação para que o robô possa consultar e estruturar as notas oficiais de forma autônoma.
            </p>
          </div>

          <div className="step-card">
            <span className="step-number">03</span>
            <h3 className="step-card-title">Monitore os Gastos</h3>
            <p className="step-card-text">
              Veja sua dashboard preenchida com gráficos de categorias e acompanhe a oscilação histórica de preços de cada produto comprado.
            </p>
          </div>
        </div>
      </section>

      {/* Benefícios */}
      <section className="benefits-section section-spaced">
        <h2 className="section-title mb-10">Vantagens da Plataforma</h2>
        <div className="glass-panel benefits-glass-panel">
          <ul className="benefits-list">
            <li className="benefits-item">
              <span className="benefits-check">✓</span>
              <div>
                <strong className="benefit-title">Histórico Centralizado e Privado</strong>
                <span className="benefit-description">Suas notas fiscais e hábitos de consumo guardados de forma segura e pessoal no seu perfil.</span>
              </div>
            </li>
            <li className="benefits-item">
              <span className="benefits-check">✓</span>
              <div>
                <strong className="benefit-title">Análise Automatizada de Categorias</strong>
                <span className="benefit-description">Organização instantânea do destino do seu dinheiro (Mercado, Combustível, Farmácia) sem tabelas manuais.</span>
              </div>
            </li>
            <li className="benefits-item">
              <span className="benefits-check">✓</span>
              <div>
                <strong className="benefit-title">Acompanhamento de Inflação Pessoal</strong>
                <span className="benefit-description">Compare preços históricos do mesmo item (ex: leite ou café) ao longo do tempo e otimize seu orçamento.</span>
              </div>
            </li>
          </ul>
        </div>
      </section>

      {/* FAQ */}
      <section className="faq-section section-spaced">
        <h2 className="section-title mb-10">Perguntas Frequentes</h2>
        <div className="faq-list-container">
          {faqData.map((item, idx) => (
            <div key={idx} className="faq-item">
              <button
                className="faq-question"
                onClick={() => toggleFaq(idx)}
                aria-expanded={activeFaq === idx}
              >
                <span>{item.question}</span>
                <span className="faq-icon" style={{ transform: activeFaq === idx ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                  ▼
                </span>
              </button>
              <div className={`faq-answer ${activeFaq === idx ? 'faq-answer--open' : ''}`}>
                <p className="faq-answer-text">{item.answer}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Banner Rodapé */}
      <section className="home-cta-banner">
        <h2 className="cta-banner-title">Comece a Controlar seus Gastos Agora Mesmo</h2>
        <p className="cta-banner-subtitle">
          Junte-se a nós e tenha acesso instantâneo ao painel completo de controle de consumo e monitoramento de produtos de forma simplificada.
        </p>
        <Link to="/register" className="btn btn-secondary btn-neon btn-cta-signup">
          Cadastrar-se Gratuitamente
        </Link>
      </section>
    </div>
  );
}
