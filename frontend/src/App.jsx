import { useState } from 'react';
import axios from 'axios';

function App() {
  const [dados, setDados] = useState({ 
    area: '', altura: '', carga: 'leve', ocupacao: 'Residencial',
    populacao: 0, subsolo_habitavel: false, inflamaveis_opcap: 'baixo', glp_opcao: 'baixo' 
  });
  const [resultado, setResultado] = useState(null);

  const handleAnalisar = async () => {
    try {
      const response = await axios.post('http://localhost:8000/analisar', dados);
      setResultado(response.data);
    } catch (error) {
      alert("Erro de conexão!");
    }
  };

  const inputStyle = { padding: '10px', borderRadius: '4px', border: '1px solid #444', backgroundColor: '#333', color: 'white', width: '100%', marginBottom: '10px' };

  return (
    <div style={{ padding: '40px', fontFamily: 'Segoe UI, Arial', backgroundColor: '#121212', color: 'white', minHeight: '100vh' }}>
      <h1 style={{ borderBottom: '2px solid #cc0000', paddingBottom: '10px' }}>SafeMap - Triagem Técnica CBMPR</h1>
      
      <div style={{ display: 'grid', gap: '15px', maxWidth: '600px', marginTop: '20px' }}>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div><label>Área Total (m²):</label><input type="number" onChange={e => setDados({...dados, area: e.target.value})} style={inputStyle} /></div>
          <div><label>Altura (m):</label><input type="number" onChange={e => setDados({...dados, altura: e.target.value})} style={inputStyle} /></div>
        </div>

        <label>Ocupação / Uso (Grupo):</label>
<select 
  onChange={e => setDados({...dados, ocupacao: e.target.value})} 
  style={inputStyle}
>
  <option value="A">Residencial (A) - Casas, Prédios</option>
  <option value="B">Serviço de Hospedagem (B) - Hotéis, Pousadas</option>
  <option value="C">Comercial (C) - Lojas, Mercados</option>
  <option value="D">Serviço Profissional (D) - Escritórios, Bancos, Clínicas s/ internação</option>
  
  {/* ESCOLAS COM DISTINÇÃO DE RISCO */}
  <option value="E">Educacional (E-1 a E-4 / E-6) - Fundamental, Médio, Faculdades</option>
  <option value="E5">Educação Infantil (E-5) - Creche / Pré-Escola (ALTO RISCO - PROJETO OBRIG.)</option>
  
  {/* REUNIÃO DE PÚBLICO COMPLETA */}
  <option value="F">Reunião de Público (F) - Show, Boate, Igreja, Restaurante, Bar, Clubes</option>
  
  <option value="G">Serviço Automotivo (G) - Garagens, Postos, Oficinas</option>
  
  {/* SAÚDE */}
  <option value="H2">Saúde (H-2 / H-3) - Hospitais, Clínicas c/ internação, Asilos</option>
  <option value="H1">Saúde (H-1 / H-4 / H-6) - Clínicas s/ internação, Veterinárias</option>
  
  <option value="I">Industrial (I) - Fábricas e Oficinas Industriais</option>
  <option value="J">Depósito (J) - Armazéns e Silos</option>
  <option value="L">Explosivos (L) - ALTO RISCO (PROJETO OBRIG.)</option>
  <option value="M">Especial (M) - Líquidos/Gases Inflamáveis (ALTO RISCO - PROJETO OBRIG.)</option>
</select>

        {/* POPULAÇÃO PARA F E H */}
        {(dados.ocupacao === 'F' || dados.ocupacao === 'H2') && (
          <div style={{ backgroundColor: '#cc000022', padding: '15px', borderRadius: '8px', border: '1px solid #cc0000', marginBottom: '10px' }}>
            <label>População Total:</label>
            <select onChange={e => setDados({...dados, populacao: e.target.value})} style={inputStyle}>
              <option value="0">Abaixo de 200 pessoas</option>
              <option value="200">Igual ou Superior a 200 pessoas</option>
            </select>
          </div>
        )}

        <label>Carga de Incêndio (Tabela 3):</label>
        <select onChange={e => setDados({...dados, carga: e.target.value})} style={inputStyle}>
          <option value="leve">Leve (Até 300 MJ/m²)</option>
          <option value="moderado">Moderado (Acima de 300 MJ/m² até 1200 MJ/m²)</option>
          <option value="elevado">Elevado (Acima de 1200 MJ/m²)</option>
        </select>

        <div style={{ backgroundColor: '#222', padding: '15px', borderRadius: '8px' }}>
          <h4 style={{ marginTop: 0, color: '#ffcc00' }}>Riscos Especiais (GLP e Inflamáveis)</h4>
          <label>Líquidos Inflamáveis / Combustíveis:</label>
          <select onChange={e => setDados({...dados, inflamaveis_opcap: e.target.value})} style={inputStyle}><option value="baixo">Até 1.000 Litros</option><option value="alto">Superior a 1.000 Litros</option></select>
          <label>Central de GLP:</label>
          <select onChange={e => setDados({...dados, glp_opcao: e.target.value})} style={inputStyle}><option value="baixo">Até 190 kg (ou até 3x P-13 ext.)</option><option value="alto">Superior a 190 kg</option></select>
          <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', border: '1px dashed #444', padding: '10px' }}>
            <input type="checkbox" id="sub_art19" style={{ width: '20px', height: '20px' }} onChange={e => setDados({...dados, subsolo_habitavel: e.target.checked})} />
            <label htmlFor="sub_art19" style={{ marginLeft: '10px', fontSize: '0.85em', cursor: 'pointer' }}><strong>Subsolo com permanência humana?</strong> (Art. 19)</label>
          </div>
        </div>

        <button onClick={handleAnalisar} style={{ backgroundColor: '#cc0000', color: 'white', padding: '15px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>GERAR ENQUADRAMENTO TÉCNICO</button>
      </div>

      {resultado && (
        <div style={{ marginTop: '30px', padding: '20px', borderLeft: `10px solid ${resultado.cor}`, backgroundColor: '#1e1e1e' }}>
          <h2 style={{ color: resultado.cor, marginTop: 0 }}>{resultado.rito}</h2>
          <p><strong>Análise:</strong> {resultado.motivo}</p>
          <p><strong>Ação:</strong> {resultado.exigencia}</p>
          <button onClick={() => window.print()} style={{ marginTop: '15px', padding: '10px', cursor: 'pointer' }}>🖨️ Imprimir Relatório</button>
        </div>
      )}
    </div>
  );
}

export default App;