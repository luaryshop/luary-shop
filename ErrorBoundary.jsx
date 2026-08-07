import React from 'react';

/**
 * Error Boundary — pega qualquer erro de JavaScript que aconteça durante a
 * renderização e mostra uma tela explicativa em vez de branco vazio.
 * Sem isso, qualquer bug (ou dado inesperado vindo do Firebase) derruba
 * a aplicação inteira sem nenhuma pista visual do que aconteceu.
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[Luary Shop] Erro capturado pelo Error Boundary:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#f8fafc', fontFamily: 'sans-serif', padding: '24px'
        }}>
          <div style={{
            maxWidth: '520px', background: 'white', borderRadius: '24px', padding: '32px',
            boxShadow: '0 10px 30px rgba(0,0,0,.08)', textAlign: 'center'
          }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>⚠️</div>
            <h1 style={{ fontSize: '18px', fontWeight: 900, color: '#1e293b', marginBottom: '8px' }}>
              Algo quebrou na aplicação
            </h1>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
              A tela ficaria em branco sem essa mensagem. O erro técnico foi registrado no console (F12 → Console) para diagnóstico.
            </p>
            <pre style={{
              fontSize: '11px', background: '#f1f5f9', padding: '12px', borderRadius: '12px',
              textAlign: 'left', overflow: 'auto', color: '#dc2626', maxHeight: '150px'
            }}>
              {String(this.state.error?.message || this.state.error || 'Erro desconhecido')}
            </pre>
            <button
              onClick={() => window.location.reload()}
              style={{
                marginTop: '16px', background: '#4f46e5', color: 'white', border: 'none',
                padding: '12px 24px', borderRadius: '12px', fontWeight: 900, fontSize: '11px',
                textTransform: 'uppercase', cursor: 'pointer'
              }}
            >
              Recarregar Página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
