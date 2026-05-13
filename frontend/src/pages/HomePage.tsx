import { Link } from 'react-router-dom';

export function HomePage() {
  return (
    <div className="container" style={{ textAlign: 'center', marginTop: '4rem' }}>
      <h1 style={{ fontSize: '3.5rem', background: 'linear-gradient(to right, #818cf8, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '1rem' }}>
        Minhas Compras BA
      </h1>
      <p style={{ fontSize: '1.25rem', marginBottom: '3rem', color: 'var(--text-secondary)' }}>
        Gestão inteligente e automatizada das suas Notas Fiscais Eletrônicas. <br/>
        Acompanhe seus gastos, centralize suas compras e tenha controle financeiro.
      </p>

      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '4rem' }}>
        <Link to="/login" className="btn btn-secondary" style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>
          Entrar
        </Link>
        <Link to="/register" className="btn btn-primary" style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>
          Criar Conta
        </Link>
      </div>

      <div className="glass-panel" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'left' }}>
        <h2 style={{ fontSize: '1.2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>Benefícios</h2>
        
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <li style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ color: 'var(--success)', fontSize: '1.5rem' }}>✓</span>
            <div>
              <strong style={{ display: 'block', color: 'var(--text-primary)' }}>Histórico Privado</strong>
              <span style={{ color: 'var(--text-muted)' }}>Suas notas salvas com segurança no seu perfil.</span>
            </div>
          </li>
          <li style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ color: 'var(--success)', fontSize: '1.5rem' }}>✓</span>
            <div>
              <strong style={{ display: 'block', color: 'var(--text-primary)' }}>Totalizadores de Gastos</strong>
              <span style={{ color: 'var(--text-muted)' }}>Veja exatamente quanto você gastou no mês.</span>
            </div>
          </li>
          <li style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ color: 'var(--success)', fontSize: '1.5rem' }}>✓</span>
            <div>
              <strong style={{ display: 'block', color: 'var(--text-primary)' }}>Importação Automática</strong>
              <span style={{ color: 'var(--text-muted)' }}>Busca direto da SEFAZ apenas usando a chave.</span>
            </div>
          </li>
        </ul>
      </div>
    </div>
  );
}
