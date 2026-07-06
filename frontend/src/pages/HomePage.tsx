import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../shared/api/client';

interface SystemStats {
  total_users: number;
  total_notas_mes: number;
  total_products: number;
}

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

  return (
    <div className="container" style={{ maxWidth: '1100px', paddingBottom: '5rem' }}>
      {/* Hero Section */}
      <section className="hero-section" style={{ textAlign: 'center', marginTop: '3rem', marginBottom: '4rem' }}>
        <h1 style={{ 
          fontSize: '3.8rem', 
          background: 'linear-gradient(to right, #818cf8, #c084fc)', 
          WebkitBackgroundClip: 'text', 
          WebkitTextFillColor: 'transparent', 
          marginBottom: '1rem',
          lineHeight: '1.1' 
        }}>
          Minhas Compras BA
        </h1>
        <p style={{ fontSize: '1.3rem', marginBottom: '2.5rem', color: 'var(--text-secondary)', maxWidth: '750px', margin: '0 auto 2.5rem auto' }}>
          Gestão inteligente e automatizada de suas NFC-e. Acompanhe seus gastos por categoria, monitore a evolução de preços dos produtos e tenha controle financeiro total na palma da mão.
        </p>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <Link to="/login" className="btn btn-secondary" style={{ padding: '0.85rem 2.2rem', fontSize: '1.05rem', borderRadius: 'var(--radius-md)' }}>
            Entrar
          </Link>
          <Link to="/register" className="btn btn-primary btn-neon" style={{ padding: '0.85rem 2.2rem', fontSize: '1.05rem', borderRadius: 'var(--radius-md)' }}>
            Criar Conta
          </Link>
        </div>
      </section>

      {/* Estatísticas do Sistema */}
      <section className="home-stats-section" style={{ marginBottom: '5rem' }}>
        <h2 style={{ textAlign: 'center', fontSize: '1.8rem', marginBottom: '2.5rem' }}>Dados Gerais do Sistema</h2>
        <div className="home-stats-grid">
          {/* Card 1: Usuários */}
          <div className="home-stats-card">
            <div className="home-stats-glow" style={{ background: 'rgba(99, 102, 241, 0.15)' }}></div>
            <div className="home-stats-icon-wrapper" style={{ color: '#818cf8', background: 'rgba(99, 102, 241, 0.1)' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
            <span className="home-stats-number">{totalUsers.toLocaleString('pt-BR')}</span>
            <span className="home-stats-label">Usuários Ativos</span>
          </div>

          {/* Card 2: Notas Lidas */}
          <div className="home-stats-card">
            <div className="home-stats-glow" style={{ background: 'rgba(16, 185, 129, 0.15)' }}></div>
            <div className="home-stats-icon-wrapper" style={{ color: '#34d399', background: 'rgba(16, 185, 129, 0.1)' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
            </div>
            <span className="home-stats-number">{totalNotas.toLocaleString('pt-BR')}</span>
            <span className="home-stats-label">Notas Importadas este Mês</span>
          </div>

          {/* Card 3: Produtos Catalogados */}
          <div className="home-stats-card">
            <div className="home-stats-glow" style={{ background: 'rgba(245, 158, 11, 0.15)' }}></div>
            <div className="home-stats-icon-wrapper" style={{ color: '#fbbf24', background: 'rgba(245, 158, 11, 0.1)' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
                <line x1="7" y1="7" x2="7.01" y2="7"></line>
              </svg>
            </div>
            <span className="home-stats-number">{totalProducts.toLocaleString('pt-BR')}</span>
            <span className="home-stats-label">Produtos Catalogados</span>
          </div>
        </div>
      </section>

      {/* Como Funciona */}
      <section className="steps-section" style={{ marginBottom: '5rem' }}>
        <h2 style={{ textAlign: 'center', fontSize: '1.8rem', marginBottom: '2.5rem' }}>Como Funciona</h2>
        <div className="steps-grid">
          {/* Passo 1 */}
          <div className="step-card">
            <span className="step-number">01</span>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Insira a Chave</h3>
            <p style={{ margin: 0, fontSize: '0.95rem' }}>
              Digite ou cole a chave de acesso da sua NFC-e emitida em qualquer estabelecimento do estado da Bahia.
            </p>
          </div>

          {/* Passo 2 */}
          <div className="step-card">
            <span className="step-number">02</span>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Confirme o Captcha</h3>
            <p style={{ margin: 0, fontSize: '0.95rem' }}>
              Se solicitado, digite o código de verificação para que o robô possa consultar e estruturar as notas oficiais de forma autônoma.
            </p>
          </div>

          {/* Passo 3 */}
          <div className="step-card">
            <span className="step-number">03</span>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Monitore os Gastos</h3>
            <p style={{ margin: 0, fontSize: '0.95rem' }}>
              Veja sua dashboard preenchida com gráficos de categorias e acompanhe a oscilação histórica de preços de cada produto comprado.
            </p>
          </div>
        </div>
      </section>

      {/* Benefícios */}
      <section className="benefits-section" style={{ marginBottom: '5rem' }}>
        <h2 style={{ textAlign: 'center', fontSize: '1.8rem', marginBottom: '2.5rem' }}>Vantagens da Plataforma</h2>
        <div className="glass-panel" style={{ maxWidth: '750px', margin: '0 auto', padding: '2rem 2.5rem' }}>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: '1.25rem' }}>
              <span style={{ color: 'var(--success)', fontSize: '1.5rem', lineHeight: '1' }}>✓</span>
              <div>
                <strong style={{ display: 'block', color: 'var(--text-primary)', fontSize: '1.1rem' }}>Histórico Centralizado e Privado</strong>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Suas notas fiscais e hábitos de consumo guardados de forma segura e pessoal no seu perfil.</span>
              </div>
            </li>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: '1.25rem' }}>
              <span style={{ color: 'var(--success)', fontSize: '1.5rem', lineHeight: '1' }}>✓</span>
              <div>
                <strong style={{ display: 'block', color: 'var(--text-primary)', fontSize: '1.1rem' }}>Análise Automatizada de Categorias</strong>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Organização instantânea do destino do seu dinheiro (Mercado, Combustível, Farmácia) sem tabelas manuais.</span>
              </div>
            </li>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: '1.25rem' }}>
              <span style={{ color: 'var(--success)', fontSize: '1.5rem', lineHeight: '1' }}>✓</span>
              <div>
                <strong style={{ display: 'block', color: 'var(--text-primary)', fontSize: '1.1rem' }}>Acompanhamento de Inflação Pessoal</strong>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Compare preços históricos do mesmo item (ex: leite ou café) ao longo do tempo e otimize seu orçamento.</span>
              </div>
            </li>
          </ul>
        </div>
      </section>

      {/* FAQ */}
      <section className="faq-section" style={{ marginBottom: '5rem' }}>
        <h2 style={{ textAlign: 'center', fontSize: '1.8rem', marginBottom: '2.5rem' }}>Perguntas Frequentes</h2>
        <div style={{ maxWidth: '750px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
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
                <p style={{ margin: 0, padding: '1rem 1.25rem' }}>{item.answer}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Banner Rodapé */}
      <section className="home-cta-banner">
        <h2 style={{ fontSize: '2rem', marginBottom: '0.75rem', color: '#FFF' }}>Comece a Controlar seus Gastos Agora Mesmo</h2>
        <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '1.05rem', marginBottom: '2rem', maxWidth: '600px', margin: '0 auto 2rem auto' }}>
          Junte-se a nós e tenha acesso instantâneo ao painel completo de controle de consumo e monitoramento de produtos de forma simplificada.
        </p>
        <Link to="/register" className="btn btn-secondary btn-neon" style={{ padding: '0.9rem 2.5rem', fontSize: '1.1rem', background: '#FFF', color: '#0B0F19', border: 'none', fontWeight: 600 }}>
          Cadastrar-se Gratuitamente
        </Link>
      </section>
    </div>
  );
}
