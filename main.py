from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd  
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class Projeto(BaseModel):
    area: float
    altura: float
    carga: str 
    ocupacao: str
    populacao: int = 0
    subsolo_habitavel: bool = False
    inflamaveis_opcap: str = "baixo" 
    glp_opcao: str = "baixo" 
    descricao_atividade: str = ""

def validar_carga_npt14(descricao_usuario):
    caminho_ods = os.path.join(os.path.dirname(__file__), "npt 14 tabela.ods")
    
    if not os.path.exists(caminho_ods):
        return None
    
    try:
        # Lê a planilha ODS
        df = pd.read_excel(caminho_ods, engine="odf")
        desc_clean = str(descricao_usuario).lower()
        
        for _, row in df.iterrows():
            # 1. Busca por palavras-chave na coluna CNAE 
            if not pd.isna(row['CNAE']):
                palavras = str(row['CNAE']).split(';')
                for p in palavras:
                    term = p.strip().lower()
                    if term != "" and term in desc_clean:
                        return {
                            "ocupacao": row['Ocupação/Uso'],
                            "divisao": row['Divisão'],
                            "carga_mj": row['Carga de Incêndio (qfi) em MJ/m²']
                        }

            # 2. Busca secundária na coluna 'Descrição' 
            if not pd.isna(row['Descrição']):
                desc_planilha = str(row['Descrição']).lower()
                if desc_clean in desc_planilha or desc_planilha in desc_clean:
                    return {
                        "ocupacao": row['Ocupação/Uso'],
                        "divisao": row['Divisão'],
                        "carga_mj": row['Carga de Incêndio (qfi) em MJ/m²']
                    }
                    
    except Exception as e:
        print(f"Erro técnico ao ler a planilha: {e}")
    return None

@app.post("/analisar")
async def analisar_cscip(projeto: Projeto):
    # 1. Busca na sua tabela .ods
    resultado_tabela = validar_carga_npt14(projeto.descricao_atividade)
    
    if resultado_tabela:
        # Tenta converter a carga para número (remove símbolos se houver)
        try:
            carga_limpa = str(resultado_tabela["carga_mj"]).replace('<', '').replace('>', '').strip()
            carga_real = float(carga_limpa)
        except:
            carga_real = 0

        if projeto.carga == "leve" and carga_real > 300:
            return {
                "rito": "Projeto Técnico (PTPID)",
                "cor": "red",
                "motivo": f"Atividade detectada: {resultado_tabela['divisao']} ({resultado_tabela['ocupacao']}).",
                "exigencia": f"A carga de {carga_real} MJ/m² identificada na NPT-14 impede o enquadramento como Risco Leve."
            }

    PROJETO_TECNICO = "Projeto Técnico de Prevenção a Incêndio e a Desastre"

    # 1. BLOQUEIO ABSOLUTO (ALTO RISCO / CNAE IMPEDITIVO)
    if projeto.ocupacao in ["E5", "L", "M"]:
        return {
            "rito": PROJETO_TECNICO, 
            "cor": "red", 
            "motivo": f"Ocupação de Alto Risco (Grupo {projeto.ocupacao}).", 
            "exigencia": "Obrigatório Projeto Técnico independente de área ou altura (Item 5.1.3.1.1.1 'b')."
        }

    # 2. BLOQUEIO POR POPULAÇÃO (F e H)
    if projeto.ocupacao in ["H2", "H3", "F"] and int(projeto.populacao) >= 200:
        return {
            "rito": PROJETO_TECNICO, 
            "cor": "red", 
            "motivo": "População >= 200 pessoas em ocupação crítica.", 
            "exigencia": "Obrigatoriedade de PTPID conforme subitem 5.1.3.2.1."
        }

    # 3. OUTROS RISCOS (SUBSOLO, INFLAMÁVEIS, GLP)
    if projeto.subsolo_habitavel:
        return {"rito": PROJETO_TECNICO, "cor": "red", "motivo": "Subsolo com permanência humana (Art. 19).", "exigencia": "Computa altura e exige Projeto Técnico."}

    if projeto.inflamaveis_opcap == "alto" or projeto.glp_opcao == "alto":
        return {"rito": PROJETO_TECNICO, "cor": "red", "motivo": "Volume de GLP ou Inflamáveis acima do limite de dispensa.", "exigencia": "Necessário Projeto Técnico."}

    # 4. REGRA DE ÁREA MÍNIMA (< 200m²)
    if projeto.area < 200:
        return {"rito": "CLCB / Dispensa de Memorial", "cor": "blue", "motivo": "Área inferior a 200m² sem riscos impeditivos.", "exigencia": "Licenciamento simplificado via PREVINA."}

    # 5. TABELA 5 (ENQUADRAMENTO GERAL)
    limite_area = 1500 if projeto.carga == "leve" else 1000
    limite_altura = 9 if projeto.carga == "leve" else 6

    if projeto.area <= limite_area and projeto.altura <= limite_altura:
        return {"rito": "Memorial Simplificado e ART", "cor": "green", "motivo": "Enquadrado nos limites da Tabela 5.", "exigencia": "Apresentar Memorial Simplificado na vistoria."}
    else:
        return {"rito": PROJETO_TECNICO, "cor": "red", "motivo": "Área ou Altura excedem os limites da Tabela 5.", "exigencia": "Protocolar Projeto Técnico no CBMPR."}