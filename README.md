# Milla's Free — Gerenciamento de Tempo para Equipes

![Firebase](https://img.shields.io/badge/Built%20with-Firebase-orange.svg)
![Tailwind CSS](https://img.shields.io/badge/Styled%20with-TailwindCSS-38B2AC.svg)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6%2B-F7DF1E.svg)

## Descrição

O **Milla's Free** é uma plataforma web para gerenciamento de tempo, desenvolvida como projeto de TCC no [SENAI](https://www.fiemg.com.br/senai/) — CTTI. A solução foi proposta pela [3AQ Tecnologia](https://plataforma.gpinovacao.senai.br/plataforma/demandas-da-industria/interna/11183) com o objetivo de otimizar o **rastreamento do tempo gasto por colaboradores e freelancers** em tarefas e projetos.

O sistema permite que gestores de empresas gerenciem suas equipes e tarefas, enquanto os colaboradores registram o tempo trabalhado em tempo real, de forma simples, intuitiva e não invasiva.

---

## Objetivos

- **Reduzir conflitos:** Garantir clareza sobre o tempo investido em cada tarefa.
- **Aumentar a produtividade:** Identificar gargalos e melhorar a alocação de recursos.
- **Prover transparência:** Facilitar a comunicação entre gestores e colaboradores.
- **Reduzir custos:** Evitar retrabalho com base em dados concretos de desempenho.
- **Criar um novo produto:** Desenvolver uma ferramenta escalável para o mercado.

---

## ⚙️ Funcionalidades

### Painel Principal (Gestor/Empresa)
- **Autenticação Segura:** Cadastro e login com e-mail/senha, verificação de e-mail e recuperação de senha.
- **Gerenciamento de Colaboradores:** Adicionar, editar e remover membros da equipe.
- **Tokens de Acesso:** Geração e gerenciamento de tokens de login únicos para colaboradores (login sem senha).
- **Gerenciamento de Tarefas:** Crie tarefas pré-definidas para facilitar o apontamento da equipe.
- **Aprovação de Horas:** Visualize, aproveite ou rejeite as entradas de tempo submetidas pelos colaboradores.
- **Visualização de Dados:**
    - Filtro de entradas de tempo por colaborador.
    - Gráfico em tempo real com o tempo total gasto por projeto.
    - Paginação para lidar com grandes volumes de dados.
- **Tema:** Suporte a modo claro e escuro (Dark/Light Mode).

### Painel do Colaborador
- **Login Simplificado:** Acesso rápido e seguro utilizando o token fornecido pela empresa.
- **Time Tracker:** Cronômetro para iniciar e parar o rastreamento de tempo em uma tarefa.
- **Listagem de Horas:** Visualize seu histórico de horas trabalhadas.
- **Relatório Visual:** Gráfico com a distribuição do seu tempo entre os projetos.

---

## Restrições e Requisitos

- Compatível com **Windows**, **macOS** e **Linux**.
- Em conformidade com a **Lei Geral de Proteção de Dados (LGPD)**.
- Interface simples e não burocrática para freelancers.
- Deve ser viável para implementação em até 6 meses.

---

##  Tecnologias Utilizadas

O projeto foi construído com uma abordagem moderna e escalável, utilizando tecnologias serverless.

- **Frontend:**
    - **HTML5**
    - **Tailwind CSS:** Para uma estilização rápida e responsiva.
    - **Vanilla JavaScript (ES Modules):** Para toda a lógica e interatividade da interface.
- **Backend (BaaS - Backend as a Service):**
    - **Google Firebase:**
        - **Firestore:** Banco de dados NoSQL em tempo real para armazenar todas as informações.
        - **Authentication:** Gerenciamento completo de autenticação de usuários (e-mail/senha e custom tokens).
        - **Cloud Functions:** Para lógica de backend segura, como a troca de tokens de acesso.
- **Bibliotecas:**
    - **Chart.js:** Para a criação de gráficos dinâmicos e interativos.
- **Controle de Versão:**
    - **Git & GitHub**

---

## Equipe

- **Equipe de Desenvolvimento:** Alunos do curso técnico do SENAI  
- **Empresa Parceira:** 3AQ Tecnologia

---

## 📄 Licença

Este projeto é de uso educacional e não possui licença comercial definida até o momento.
