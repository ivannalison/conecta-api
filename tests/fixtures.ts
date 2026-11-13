import type { ConteudoEntrada } from '../src/schemas/conteudo.js';

/** Conteúdo fictício só para testes (nunca vai para o banco real). */
export const conteudoTeste: ConteudoEntrada = {
  company: {
    nome: 'Empresa Teste',
    slogan: 'Slogan teste.',
    email: 'contato@exemplo.com',
    whatsapp: '+5500000000000',
  },
  services: [
    { slug: 'servico-b', nome: 'Serviço B', descricao: 'Descrição B', ordem: 2, publicado: true },
    { slug: 'servico-a', nome: 'Serviço A', descricao: 'Descrição A', ordem: 1, publicado: true },
    { slug: 'servico-oculto', nome: 'Oculto', descricao: 'Não publicado', ordem: 0, publicado: false },
  ],
  projects: [
    {
      slug: 'conceito-um',
      tipo: 'conceito',
      nome: 'Conceito Um',
      descricao: 'Projeto conceito',
      tema: { primaria: '#111111', fundo: '#000000' },
      demo: 'demo-um',
      ordem: 1,
      publicado: true,
    },
    {
      slug: 'real-dois',
      tipo: 'real',
      nome: 'Real Dois',
      descricao: 'Projeto real dois',
      ordem: 2,
      publicado: true,
    },
    {
      slug: 'real-um',
      tipo: 'real',
      nome: 'Real Um',
      descricao: 'Projeto real um',
      descricaoCompleta: 'Descrição completa do projeto real um',
      problema: 'Problema',
      objetivo: 'Objetivo',
      solucao: 'Solução',
      funcionalidades: ['Função 1'],
      tecnologias: ['TypeScript'],
      links: [{ tipo: 'github', rotulo: 'GitHub', url: 'https://github.com/exemplo/real-um' }],
      destaque: true,
      ordem: 1,
      publicado: true,
    },
    {
      slug: 'real-oculto',
      tipo: 'real',
      nome: 'Real Oculto',
      descricao: 'Não publicado',
      ordem: 0,
      publicado: false,
    },
  ],
};
